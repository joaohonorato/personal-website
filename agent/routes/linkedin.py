import asyncio
import json
import logging
import re
import threading
from typing import AsyncGenerator

import requests
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.prompts import LINKEDIN_ADAPT_PROMPT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/linkedin")


class LinkedInIterateBody(BaseModel):
    feedback: str


class LinkedInApproveBody(BaseModel):
    text: str | None = None


def _validate_linkedin(text: str) -> str:
    text = text.strip().strip('"').strip("'")
    text = re.sub(r"[*#`]", "", text)
    if len(text) > 1300:
        trimmed = text[:1280]
        cut = max(trimmed.rfind(". "), trimmed.rfind("\n"))
        text = (trimmed[: cut + 1] if cut > 0 else trimmed).rstrip()
    return text


def _adapt_for_linkedin(anthropic_client, post_content: str, post_title: str) -> str:
    msg = anthropic_client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        system=LINKEDIN_ADAPT_PROMPT,
        messages=[{"role": "user", "content": f"Title: {post_title}\n\n{post_content}"}],
    )
    return _validate_linkedin(msg.content[0].text)


@router.post("/adapt/{post_id}")
async def linkedin_adapt(post_id: int, request: Request):
    blog_token = request.app.state.blog_token_manager.token
    if not blog_token:
        raise HTTPException(503, "Blog token not available")

    registry = request.app.state.job_registry
    loop = asyncio.get_running_loop()
    state = registry.create(loop, meta={"post_id": post_id, "adapted_text": "", "post": {}})

    def _run():
        try:
            resp = requests.get(
                f"{request.app.state.settings.blog_api_url}/api/posts/id/{post_id}",
                headers={"Authorization": f"Bearer {blog_token}"},
                timeout=15,
            )
            if not resp.ok:
                state.emit("error", message=f"Could not fetch post {post_id}: {resp.status_code}")
                return

            post = resp.json()
            state.emit("adapting")

            adapted = _adapt_for_linkedin(request.app.state.anthropic_client, post["content"], post["title"])
            state.meta["adapted_text"] = adapted
            state.meta["post"] = post

            state.emit("awaiting_linkedin_approval", text=adapted, title=post["title"])
        except Exception as exc:
            logger.exception("LinkedIn adapt failed for post %d", post_id)
            state.emit("error", message=str(exc))

    threading.Thread(target=_run, daemon=True).start()
    return {"jobId": state.job_id}


@router.get("/stream/{job_id}")
async def linkedin_stream(job_id: str, request: Request):
    state = request.app.state.job_registry.get(job_id)
    if not state:
        raise HTTPException(404, "LinkedIn job not found")

    async def generator() -> AsyncGenerator[str, None]:
        while True:
            event = await state.next_event()
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event["type"] in ("done", "error", "cancelled", "published"):
                break

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/iterate/{job_id}")
async def linkedin_iterate(job_id: str, body: LinkedInIterateBody, request: Request):
    state = request.app.state.job_registry.get(job_id)
    if not state:
        raise HTTPException(404, "LinkedIn job not found")

    post = state.meta.get("post", {})
    current_text = state.meta.get("adapted_text", "")
    anthropic_client = request.app.state.anthropic_client

    def _run():
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
            revised = _validate_linkedin(msg.content[0].text)
            state.meta["adapted_text"] = revised
            state.emit("awaiting_linkedin_approval", text=revised, title=post.get("title", ""))
        except Exception as exc:
            logger.exception("LinkedIn iterate failed for job %s", job_id)
            state.emit("error", message=str(exc))

    threading.Thread(target=_run, daemon=True).start()
    return {"ok": True}


@router.post("/approve/{job_id}")
async def linkedin_approve(job_id: str, body: LinkedInApproveBody, request: Request):
    state = request.app.state.job_registry.get(job_id)
    if not state:
        raise HTTPException(404, "LinkedIn job not found")

    final_text = body.text or state.meta.get("adapted_text", "")
    post_id = state.meta["post_id"]
    blog_token = request.app.state.blog_token_manager.token
    auth_server_url = request.app.state.settings.auth_server_url

    def _publish():
        try:
            state.emit("publishing_linkedin")
            resp = requests.post(
                f"{auth_server_url}/linkedin/publish",
                json={"postId": post_id, "text": final_text},
                headers={"Authorization": f"Bearer {blog_token}"},
                timeout=30,
            )
            if not resp.ok:
                state.emit("error", message=f"LinkedIn publish failed: {resp.status_code} — {resp.text}")
                return
            result = resp.json()
            state.emit("published", linkedinUrl=result.get("linkedinUrl"))
        except Exception as exc:
            logger.exception("LinkedIn publish failed for job %s", job_id)
            state.emit("error", message=str(exc))

    threading.Thread(target=_publish, daemon=True).start()
    return {"ok": True}
