import asyncio
import json
import logging
import threading
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.runner import run_agent

logger = logging.getLogger(__name__)
router = APIRouter()


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


def _run_in_thread(request: Request, state, brief: dict) -> None:
    try:
        run_agent(
            brief=brief,
            anthropic_client=request.app.state.anthropic_client,
            dispatcher=request.app.state.dispatcher,
            system_prompt=request.app.state.system_prompt,
            tools=request.app.state.tools,
            on_event=state.emit,
            request_approval=state.wait_approval,
            is_cancelled=lambda: state.cancelled,
        )
    except Exception as exc:
        logger.exception("Agent run failed for job %s", state.job_id)
        state.emit("error", message=str(exc))


@router.post("/run")
async def start_run(brief: Brief, request: Request):
    registry = request.app.state.job_registry
    loop = asyncio.get_running_loop()
    state = registry.create(loop)

    threading.Thread(
        target=_run_in_thread,
        args=(request, state, brief.model_dump()),
        daemon=True,
    ).start()

    return {"jobId": state.job_id}


@router.get("/stream/{job_id}")
async def stream_events(job_id: str, request: Request):
    state = request.app.state.job_registry.get(job_id)
    if not state:
        raise HTTPException(404, "Job not found")

    async def generator() -> AsyncGenerator[str, None]:
        while True:
            event = await state.next_event()
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event["type"] in ("done", "error", "cancelled"):
                break

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/approve/{job_id}")
async def approve(job_id: str, body: ApprovalBody, request: Request):
    state = request.app.state.job_registry.get(job_id)
    if not state:
        raise HTTPException(404, "Job not found")
    state.approve(body.feedback)
    return {"ok": True}


@router.post("/cancel/{job_id}")
async def cancel(job_id: str, request: Request):
    state = request.app.state.job_registry.get(job_id)
    if not state:
        raise HTTPException(404, "Job not found")
    state.cancel()
    return {"ok": True}
