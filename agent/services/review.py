import json
import logging
from typing import Callable

import requests

from core.prompts.review import REVIEW_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

_REQUIRED_FIELDS = {"score", "scoreBreakdown", "summary", "suggestions"}
_BREAKDOWN_FIELDS = {"citations", "sources", "textQuality", "coherence", "cohesion"}


class ReviewService:
    def __init__(
        self,
        *,
        blog_api_url: str,
        get_blog_token: Callable[[], str],
        anthropic_client,
    ) -> None:
        self._blog_api_url = blog_api_url
        self._get_token = get_blog_token
        self._anthropic = anthropic_client

    def review(self, post_id: int) -> dict:
        post = self._fetch_post(post_id)
        raw = self._call_llm(post)
        return {"post": post, "review": self._parse(raw)}

    def _fetch_post(self, post_id: int) -> dict:
        resp = requests.get(
            f"{self._blog_api_url}/api/posts/id/{post_id}",
            headers={"Authorization": f"Bearer {self._get_token()}"},
            timeout=15,
        )
        if resp.status_code == 404:
            raise LookupError(f"Post {post_id} not found")
        resp.raise_for_status()
        return resp.json()

    def _call_llm(self, post: dict) -> str:
        message = self._anthropic.messages.create(
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
        return message.content[0].text

    @staticmethod
    def _parse(raw: str) -> dict:
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
