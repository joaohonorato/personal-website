#!/usr/bin/env python3
"""
FastAPI wrapper for the article agent.

Endpoints:
  GET  /health         — health check (Railway)
  POST /run            — start agent, returns { jobId }
  GET  /stream/:id     — SSE stream of agent events
  POST /approve/:id    — send outline feedback (unblocks agent)
  POST /cancel/:id     — cancel a running job
  POST /review/:postId — review a published post, returns structured critique
"""

import asyncio
import json
import os
import sys
import threading
import uuid
from pathlib import Path
from typing import AsyncGenerator

import anthropic
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from jose import JWTError, jwt as jose_jwt
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
TAVILY_API_KEY    = os.environ["TAVILY_API_KEY"]
BLOG_API_URL      = os.environ.get("BLOG_API_URL", "http://localhost:8080")
AUTH_SERVER_URL   = os.environ.get("AUTH_SERVER_URL", "")

OPENAI_API_KEY        = os.environ.get("OPENAI_API_KEY", "")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
COVER_IMAGE_ENABLED   = bool(OPENAI_API_KEY and CLOUDINARY_CLOUD_NAME)

ALLOWED_ROLES = {"ADMIN", "AI_USER"}

# JWKS cache — refreshed on first request; RS256 public keys from auth server
_jwks_cache: list | None = None

def _get_jwks_keys() -> list:
    global _jwks_cache
    if _jwks_cache is None:
        if not AUTH_SERVER_URL:
            return []
        resp = requests.get(f"{AUTH_SERVER_URL}/oauth2/jwks", timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json().get("keys", [])
    return _jwks_cache

def _select_key(token: str) -> dict:
    keys = _get_jwks_keys()
    if not keys:
        raise JWTError("No JWKS keys available")
    try:
        kid = jose_jwt.get_unverified_header(token).get("kid")
    except JWTError:
        kid = None
    for k in keys:
        if kid is None or k.get("kid") == kid:
            return k
    return keys[0]

# ---------------------------------------------------------------------------
# Blog token — resolved at startup via client_credentials
# ---------------------------------------------------------------------------

def _resolve_blog_token() -> str:
    static_token = os.environ.get("BLOG_ADMIN_TOKEN", "")
    if static_token:
        print("[OK] Using BLOG_ADMIN_TOKEN from environment")
        return static_token

    client_id     = os.environ.get("AUTH_CLIENT_ID", "blog-agent")
    client_secret = os.environ.get("AUTH_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        print("WARNING: AUTH_CLIENT_ID / AUTH_CLIENT_SECRET not set.")
        return ""

    if not AUTH_SERVER_URL:
        raise RuntimeError("AUTH_SERVER_URL is not set — cannot authenticate")

    resp = requests.post(
        f"{AUTH_SERVER_URL}/oauth2/token",
        data={"grant_type": "client_credentials", "scope": "agent"},
        auth=(client_id, client_secret),
        timeout=15,
    )
    if not resp.ok:
        raise RuntimeError(f"Auth server client_credentials failed: {resp.status_code} — {resp.text}")

    token = resp.json()["access_token"]
    print("[OK] Authenticated with auth server via client_credentials")
    return token


# Token resolved lazily in background so uvicorn starts (and /health responds) immediately
BLOG_ADMIN_TOKEN = ""

sys.path.insert(0, str(Path(__file__).parent))
import article_agent as _agent


def _init_blog_token() -> None:
    global BLOG_ADMIN_TOKEN
    try:
        token = _resolve_blog_token()
        BLOG_ADMIN_TOKEN = token
        _agent.BLOG_ADMIN_TOKEN = token
    except Exception as exc:
        print(f"WARNING: Could not resolve blog token: {exc}")


threading.Thread(target=_init_blog_token, daemon=True).start()

from article_agent import (
    SYSTEM_PROMPT, TOOLS,
    web_search, publish_article, save_draft,
)
if COVER_IMAGE_ENABLED:
    from article_agent import generate_cover_image

anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ---------------------------------------------------------------------------
# App + middleware
# ---------------------------------------------------------------------------

app = FastAPI(title="Blog Agent Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def verify_jwt(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    # Skip validation when auth server is not configured (local dev)
    if not AUTH_SERVER_URL:
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"error": "Unauthorized: missing token"}, status_code=401)

    token = auth[len("Bearer "):].strip()
    try:
        key = _select_key(token)
        payload = jose_jwt.decode(token, key, algorithms=["RS256"], options={"verify_aud": False})
    except JWTError as exc:
        return JSONResponse({"error": f"Invalid token: {exc}"}, status_code=401)
    except Exception as exc:
        return JSONResponse({"error": f"Auth service unavailable: {exc}"}, status_code=503)

    roles = set(payload.get("roles", []))
    if not roles.intersection(ALLOWED_ROLES):
        return JSONResponse({"error": f"Forbidden: roles {list(roles)} cannot use the agent"}, status_code=403)

    return await call_next(request)


@app.get("/health")
async def health():
    return {"status": "ok", "blog_api": BLOG_API_URL, "cover_image": COVER_IMAGE_ENABLED}

# ---------------------------------------------------------------------------
# Job state
# ---------------------------------------------------------------------------

class JobState:
    def __init__(self, loop: asyncio.AbstractEventLoop):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.loop = loop
        self.approval_event = threading.Event()
        self.approval_feedback: str = ""
        self.cancelled = False

    def emit(self, event_type: str, **data) -> None:
        event = {"type": event_type, **data}
        asyncio.run_coroutine_threadsafe(self.queue.put(event), self.loop)

    def wait_approval(self) -> str:
        self.approval_event.wait()
        return self.approval_feedback


jobs: dict[str, JobState] = {}

# ---------------------------------------------------------------------------
# Agent runner (blocking — runs in a thread)
# ---------------------------------------------------------------------------

def _dispatch(state: JobState, name: str, inputs: dict) -> str:
    if name == "web_search":
        state.emit("search", query=inputs["query"])
        return web_search(inputs["query"], inputs.get("count", 5))

    if name == "generate_cover_image":
        state.emit("cover")
        return generate_cover_image(inputs["prompt"])

    if name == "publish_article":
        state.emit("publishing")
        try:
            result = publish_article(**inputs)
            state.emit("post_created",
                       postId=result.get("id"),
                       slug=result.get("slug"),
                       title=result.get("title"))
            return json.dumps(result, ensure_ascii=False)
        except Exception as exc:
            return f"Error publishing: {exc}"

    if name == "save_draft":
        return save_draft(inputs["content"], inputs["filename"])

    return f"Unknown tool: {name}"


def _run(state: JobState, brief: dict) -> None:
    messages: list[dict] = [
        {
            "role": "user",
            "content": (
                "Generate a blog article with the following brief:\n\n"
                f"Topic         : {brief['topic']}\n"
                f"Audience      : {brief.get('audience', 'software developers')}\n"
                f"Tone          : {brief.get('tone', 'technical and practical')}\n"
                f"Language      : {brief.get('language', 'pt-BR')}\n"
                f"Category      : {brief.get('category', 'Tech')}\n"
                f"Tags          : {', '.join(brief.get('tags', []))}\n"
                f"Key points    : {brief.get('keyPoints', 'comprehensive coverage')}\n\n"
                "Start with Phase 1 (Research), then Phase 2 (Outline)."
            ),
        }
    ]

    outline_approved = False
    state.emit("started")

    while True:
        if state.cancelled:
            state.emit("cancelled")
            return

        response = anthropic_client.messages.create(
            model="claude-opus-4-8",
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = _dispatch(state, block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        if tool_results:
            messages.append({"role": "user", "content": tool_results})
            continue

        text = "".join(b.text for b in response.content if hasattr(b, "text"))

        if "AWAITING_OUTLINE_APPROVAL" in text and not outline_approved:
            outline_text = text.replace("AWAITING_OUTLINE_APPROVAL", "").strip()
            state.emit("outline", text=outline_text)

            feedback = state.wait_approval()
            outline_approved = True

            if feedback.strip() in ("", "approved"):
                messages.append({
                    "role": "user",
                    "content": (
                        "Outline approved. Proceed with Phase 3 (write the full article), "
                        "Phase 4 (cover image), then Phase 5 (publish)."
                    ),
                })
                state.emit("writing")
            else:
                outline_approved = False
                state.approval_event.clear()
                messages.append({
                    "role": "user",
                    "content": (
                        f"Please revise the outline with this feedback: {feedback}\n"
                        "Show the revised outline and output AWAITING_OUTLINE_APPROVAL again."
                    ),
                })
            continue

        if response.stop_reason == "end_turn":
            state.emit("done")
            return


def _run_thread(state: JobState, brief: dict) -> None:
    try:
        _run(state, brief)
    except Exception as exc:
        state.emit("error", message=str(exc))

# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------

class Brief(BaseModel):
    topic: str
    audience: str = "software developers"
    tone: str = "technical and practical"
    language: str = "pt-BR"
    category: str = "Tech"
    tags: list[str] = []
    keyPoints: str = ""


class ApprovalBody(BaseModel):
    feedback: str = ""

# ---------------------------------------------------------------------------
# Routes — article generator
# ---------------------------------------------------------------------------

@app.post("/run")
async def start_run(brief: Brief):
    job_id = str(uuid.uuid4())
    loop = asyncio.get_event_loop()
    state = JobState(loop)
    jobs[job_id] = state

    threading.Thread(
        target=_run_thread,
        args=(state, brief.model_dump()),
        daemon=True,
    ).start()

    return {"jobId": job_id}


@app.get("/stream/{job_id}")
async def stream_events(job_id: str):
    state = jobs.get(job_id)
    if not state:
        raise HTTPException(404, "Job not found")

    async def generator() -> AsyncGenerator[str, None]:
        while True:
            event = await state.queue.get()
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event["type"] in ("done", "error", "cancelled"):
                break

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/approve/{job_id}")
async def approve(job_id: str, body: ApprovalBody):
    state = jobs.get(job_id)
    if not state:
        raise HTTPException(404, "Job not found")
    state.approval_feedback = body.feedback
    state.approval_event.set()
    return {"ok": True}


@app.post("/cancel/{job_id}")
async def cancel(job_id: str):
    state = jobs.get(job_id)
    if not state:
        raise HTTPException(404, "Job not found")
    state.cancelled = True
    state.approval_event.set()
    return {"ok": True}

# ---------------------------------------------------------------------------
# Routes — reviewer
# ---------------------------------------------------------------------------

REVIEW_SYSTEM_PROMPT = """You are a senior technical editor reviewing a blog article.
Analyze the article thoroughly and return a JSON object ONLY — no extra text, no markdown fences.

The JSON must follow this exact schema:
{
  "score": <float 0-10, one decimal>,
  "scoreBreakdown": {
    "citations":    <float 0-10>,
    "sources":      <float 0-10>,
    "textQuality":  <float 0-10>,
    "coherence":    <float 0-10>,
    "cohesion":     <float 0-10>
  },
  "summary": "<2-3 sentence overall assessment>",
  "suggestions": [
    {
      "id": "<s1, s2, ...>",
      "type": "<citation|grammar|clarity|structure|coherence|style>",
      "location": "<section or paragraph reference>",
      "original": "<exact verbatim excerpt from the article — must match the article text exactly>",
      "suggestion": "<improved replacement text>",
      "reason": "<one sentence explaining which score dimension this improves and why>",
      "priority": "<high|medium|low>",
      "improvesDimension": "<citations|sources|textQuality|coherence|cohesion>"
    }
  ]
}

Rules:
- Each suggestion's "original" field MUST be an exact substring found verbatim in the article content
- Every suggestion MUST genuinely improve the article — only include changes you are confident will raise the score
- Suggestions marked "high" priority must each raise the relevant dimension score by at least 0.5 points if applied
- Applying all "high" priority suggestions together MUST result in a higher overall score than the current one
- Prefer fewer, high-impact suggestions over many low-value ones — quality over quantity
- Limit to 8 suggestions max, ranked by impact (highest first)
- If the article already scores ≥ 9.0 in a dimension, do not suggest changes for that dimension
- Score dimension definitions:
    citations:   presence and correctness of in-text citations
    sources:     reliability and variety of referenced sources
    textQuality: grammar, vocabulary, sentence structure
    coherence:   logical flow and argument progression
    cohesion:    transitions, connectives, paragraph linking
"""


@app.post("/review/{post_id}")
async def review_post(post_id: int):
    if not BLOG_ADMIN_TOKEN:
        raise HTTPException(503, "Blog token not available — check BLOG_ADMIN_TOKEN or BLOG_EMAIL+BLOG_PASSWORD env vars")

    resp = requests.get(
        f"{BLOG_API_URL}/api/posts/id/{post_id}",
        headers={"Authorization": f"Bearer {BLOG_ADMIN_TOKEN}"},
        timeout=15,
    )
    if not resp.ok:
        raise HTTPException(resp.status_code, f"Could not fetch post {post_id}")

    post = resp.json()

    message = anthropic_client.messages.create(
        model="claude-opus-4-8",
        max_tokens=4096,
        system=REVIEW_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Title: {post['title']}\n"
                    f"Category: {post.get('category', '')}\n"
                    f"Tags: {', '.join(post.get('tags', []))}\n\n"
                    f"Content:\n{post['content']}"
                ),
            }
        ],
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    review = json.loads(raw)

    return {"post": post, "review": review}


# ---------------------------------------------------------------------------
# Routes — LinkedIn publisher
# ---------------------------------------------------------------------------

LINKEDIN_ADAPT_PROMPT = """You are a content strategist adapting a technical blog post for LinkedIn.

Rules:
- LinkedIn posts are conversational, not academic
- Max 1300 characters (LinkedIn limit)
- Start with a strong hook (question or bold statement)
- Use line breaks generously for readability
- Add 3-5 relevant hashtags at the end
- Do NOT use markdown headers or bullet lists — use plain text with spacing
- Keep the core insight from the article but make it digestible for a general tech audience
- End with a question or call-to-action to drive engagement

Return ONLY the LinkedIn post text — no preamble, no explanation."""

# job_id → { state: JobState, adapted_text: str, post_id: int }
linkedin_jobs: dict[str, dict] = {}


def _adapt_for_linkedin(post_content: str, post_title: str) -> str:
    msg = anthropic_client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        system=LINKEDIN_ADAPT_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Title: {post_title}\n\n{post_content}",
        }],
    )
    return msg.content[0].text.strip()


def _run_linkedin_adapt(state: JobState, job_meta: dict) -> None:
    try:
        post_id = job_meta["post_id"]
        resp = requests.get(
            f"{BLOG_API_URL}/api/posts/id/{post_id}",
            headers={"Authorization": f"Bearer {BLOG_ADMIN_TOKEN}"},
            timeout=15,
        )
        if not resp.ok:
            state.emit("error", message=f"Could not fetch post {post_id}: {resp.status_code}")
            return

        post = resp.json()
        state.emit("adapting")

        adapted = _adapt_for_linkedin(post["content"], post["title"])
        job_meta["adapted_text"] = adapted
        job_meta["post"] = post

        state.emit("awaiting_linkedin_approval", text=adapted, title=post["title"])
    except Exception as exc:
        state.emit("error", message=str(exc))


@app.post("/linkedin/adapt/{post_id}")
async def linkedin_adapt(post_id: int):
    if not BLOG_ADMIN_TOKEN:
        raise HTTPException(503, "Blog token not available")

    job_id = str(uuid.uuid4())
    loop = asyncio.get_event_loop()
    state = JobState(loop)
    job_meta: dict = {"post_id": post_id, "adapted_text": "", "post": {}}
    linkedin_jobs[job_id] = {"state": state, "meta": job_meta}

    threading.Thread(
        target=_run_linkedin_adapt,
        args=(state, job_meta),
        daemon=True,
    ).start()

    return {"jobId": job_id}


@app.get("/linkedin/stream/{job_id}")
async def linkedin_stream(job_id: str):
    entry = linkedin_jobs.get(job_id)
    if not entry:
        raise HTTPException(404, "LinkedIn job not found")

    state: JobState = entry["state"]

    async def generator() -> AsyncGenerator[str, None]:
        while True:
            event = await state.queue.get()
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event["type"] in ("done", "error", "cancelled", "published"):
                break

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class LinkedInIterateBody(BaseModel):
    feedback: str


@app.post("/linkedin/iterate/{job_id}")
async def linkedin_iterate(job_id: str, body: LinkedInIterateBody):
    """User wants to refine the adapted text before publishing."""
    entry = linkedin_jobs.get(job_id)
    if not entry:
        raise HTTPException(404, "LinkedIn job not found")

    meta = entry["meta"]
    state: JobState = entry["state"]
    post = meta.get("post", {})
    current_text = meta.get("adapted_text", "")

    def _iterate():
        try:
            msg = anthropic_client.messages.create(
                model="claude-opus-4-8",
                max_tokens=1024,
                system=LINKEDIN_ADAPT_PROMPT,
                messages=[
                    {"role": "user", "content": f"Title: {post.get('title', '')}\n\n{post.get('content', '')}"},
                    {"role": "assistant", "content": current_text},
                    {"role": "user", "content": f"Please revise with this feedback: {body.feedback}"},
                ],
            )
            revised = msg.content[0].text.strip()
            meta["adapted_text"] = revised
            state.emit("awaiting_linkedin_approval", text=revised, title=post.get("title", ""))
        except Exception as exc:
            state.emit("error", message=str(exc))

    threading.Thread(target=_iterate, daemon=True).start()
    return {"ok": True}


class LinkedInApproveBody(BaseModel):
    text: str | None = None  # override text if user edited manually


@app.post("/linkedin/approve/{job_id}")
async def linkedin_approve(job_id: str, body: LinkedInApproveBody):
    """User approved — publish to LinkedIn via auth server proxy."""
    entry = linkedin_jobs.get(job_id)
    if not entry:
        raise HTTPException(404, "LinkedIn job not found")

    meta = entry["meta"]
    state: JobState = entry["state"]
    final_text = body.text or meta.get("adapted_text", "")
    post_id = meta["post_id"]

    def _publish():
        try:
            state.emit("publishing_linkedin")
            resp = requests.post(
                f"{AUTH_SERVER_URL}/linkedin/publish",
                json={"postId": post_id, "text": final_text},
                headers={"Authorization": f"Bearer {BLOG_ADMIN_TOKEN}"},
                timeout=30,
            )
            if not resp.ok:
                state.emit("error", message=f"LinkedIn publish failed: {resp.status_code} — {resp.text}")
                return
            result = resp.json()
            state.emit("published", linkedinUrl=result.get("linkedinUrl"))
        except Exception as exc:
            state.emit("error", message=str(exc))

    threading.Thread(target=_publish, daemon=True).start()
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
