import json
import logging

import requests
from fastapi import APIRouter, HTTPException, Request

from core.prompts import REVIEW_SYSTEM_PROMPT

logger = logging.getLogger(__name__)
router = APIRouter()

_REQUIRED_FIELDS = {"score", "scoreBreakdown", "summary", "suggestions"}
_BREAKDOWN_FIELDS = {"citations", "sources", "textQuality", "coherence", "cohesion"}


def _parse_review(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    data = json.loads(text)

    missing = _REQUIRED_FIELDS - data.keys()
    if missing:
        raise ValueError(f"Review JSON missing fields: {missing}")

    breakdown = data.get("scoreBreakdown", {})
    missing_bd = _BREAKDOWN_FIELDS - breakdown.keys()
    if missing_bd:
        raise ValueError(f"scoreBreakdown missing fields: {missing_bd}")

    data["score"] = round(float(data["score"]), 1)
    for k in _BREAKDOWN_FIELDS:
        breakdown[k] = round(float(breakdown[k]), 1)

    return data


@router.post("/review/{post_id}")
async def review_post(post_id: int, request: Request):
    blog_token = request.app.state.blog_token_manager.token
    if not blog_token:
        raise HTTPException(503, "Blog token not available")

    resp = requests.get(
        f"{request.app.state.settings.blog_api_url}/api/posts/id/{post_id}",
        headers={"Authorization": f"Bearer {blog_token}"},
        timeout=15,
    )
    if not resp.ok:
        raise HTTPException(resp.status_code, f"Could not fetch post {post_id}: {resp.status_code}")

    post = resp.json()

    message = request.app.state.anthropic_client.messages.create(
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

    review = _parse_review(message.content[0].text)
    return {"post": post, "review": review}
