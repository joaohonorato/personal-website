import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from api.schemas import ApprovalBody, Brief
from services.article import ArticleService

router = APIRouter()


@router.post("/run")
async def start_run(brief: Brief, request: Request):
    service: ArticleService = request.app.state.article_service
    loop = asyncio.get_running_loop()
    state = service.start(loop, brief.model_dump())
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
