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
import jwt as pyjwt
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

load_dotenv(Path(__file__).parent / ".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
TAVILY_API_KEY    = os.environ["TAVILY_API_KEY"]
BLOG_API_URL      = os.environ.get("BLOG_API_URL", "http://localhost:8080")

OPENAI_API_KEY        = os.environ.get("OPENAI_API_KEY", "")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
COVER_IMAGE_ENABLED   = bool(OPENAI_API_KEY and CLOUDINARY_CLOUD_NAME)

# JWT secret — same value as app.jwt-secret in Spring Boot (app.properties)
# If not set, JWT validation is skipped (local dev without auth)
JWT_SECRET    = os.environ.get("JWT_SECRET", "")
ALLOWED_ROLES = {"ADMIN", "AI_USER"}

# ---------------------------------------------------------------------------
# Blog token — resolved at startup (token or email+password)
# ---------------------------------------------------------------------------

def _resolve_blog_token() -> str:
    token = os.environ.get("BLOG_ADMIN_TOKEN", "")
    if token:
        print("✓ Using BLOG_ADMIN_TOKEN from environment")
        return token

    email    = os.environ.get("BLOG_EMAIL", "")
    password = os.environ.get("BLOG_PASSWORD", "")
    if not email or not password:
        print("WARNING: No blog credentials configured. Set BLOG_ADMIN_TOKEN or BLOG_EMAIL+BLOG_PASSWORD.")
        return ""

    resp = requests.post(
        f"{BLOG_API_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=15,
    )
    if not resp.ok:
        raise RuntimeError(f"Blog auth failed: {resp.status_code} — {resp.text}")

    token = resp.json()["token"]
    print("✓ Authenticated with blog API via email/password")
    return token


# Token resolved lazily in background so uvicorn starts (and /health responds) immediately
BLOG_ADMIN_TOKEN = ""

sys.path.insert(0, str(Path(__file__).parent))
import article_agent as _agent


def _init_blog_token() -> None:
    global BLOG_ADMIN_TOKEN
    token = _resolve_blog_token()
    BLOG_ADMIN_TOKEN = token
    _agent.BLOG_ADMIN_TOKEN = token


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
    # Skip validation in local dev when JWT_SECRET is not configured
    if not JWT_SECRET:
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"error": "Unauthorized: missing token"}, status_code=401)

    token = auth[len("Bearer "):].strip()
    try:
        payload = pyjwt.decode(
            token, JWT_SECRET,
            algorithms=["HS256", "HS384", "HS512"],
        )
    except pyjwt.ExpiredSignatureError:
        return JSONResponse({"error": "Token expired"}, status_code=401)
    except pyjwt.InvalidTokenError as exc:
        return JSONResponse({"error": f"Invalid token: {exc}"}, status_code=401)

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
      "reason": "<one sentence explaining the improvement>",
      "priority": "<high|medium|low>"
    }
  ]
}

Rules:
- Each suggestion's "original" field MUST be an exact substring found verbatim in the article content
- Limit to 8 suggestions max, prioritising the highest-impact changes
- Score dimension definitions:
    citations:   presence and correctness of in-text citations
    sources:     reliability and variety of referenced sources
    textQuality: grammar, vocabulary, sentence structure
    coherence:   logical flow and argument progression
    cohesion:    transitions, connectives, paragraph linking
"""


@app.post("/review/{post_id}")
async def review_post(post_id: int):
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


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
