import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from api.schemas import LinkedInApproveBody, LinkedInIterateBody
from services.linkedin import LinkedInService

router = APIRouter(prefix="/linkedin")


@router.post("/adapt/{post_id}")
async def linkedin_adapt(post_id: int, request: Request):
    if not request.app.state.blog_token_manager.token:
        raise HTTPException(503, "Blog token not available")
    service: LinkedInService = request.app.state.linkedin_service
    loop = asyncio.get_running_loop()
    state = service.start_adapt(loop, post_id)
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
def linkedin_iterate(job_id: str, body: LinkedInIterateBody, request: Request):
    state = request.app.state.job_registry.get(job_id)
    if not state:
        raise HTTPException(404, "LinkedIn job not found")
    request.app.state.linkedin_service.iterate(state, body.feedback)
    return {"ok": True}


@router.post("/approve/{job_id}")
def linkedin_approve(job_id: str, body: LinkedInApproveBody, request: Request):
    state = request.app.state.job_registry.get(job_id)
    if not state:
        raise HTTPException(404, "LinkedIn job not found")
    final_text = body.text or state.meta.get("adapted_text", "")
    request.app.state.linkedin_service.publish(state, final_text)
    return {"ok": True}
