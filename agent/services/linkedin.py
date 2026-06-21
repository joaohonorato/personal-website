import asyncio
import logging
import re
import threading
from typing import Callable

import requests

from core.prompts.linkedin import LINKEDIN_ADAPT_PROMPT
from jobs import JobRegistry, JobState

logger = logging.getLogger(__name__)


class LinkedInService:
    def __init__(
        self,
        *,
        job_registry: JobRegistry,
        blog_api_url: str,
        auth_server_url: str,
        get_blog_token: Callable[[], str],
        anthropic_client,
    ) -> None:
        self._registry = job_registry
        self._blog_api_url = blog_api_url
        self._auth_server_url = auth_server_url
        self._get_token = get_blog_token
        self._anthropic = anthropic_client

    def start_adapt(self, loop: asyncio.AbstractEventLoop, post_id: int) -> JobState:
        state = self._registry.create(loop, meta={"post_id": post_id, "adapted_text": "", "post": {}})
        threading.Thread(target=self._run_adapt, args=(state, post_id), daemon=True).start()
        return state

    def iterate(self, state: JobState, feedback: str) -> None:
        post = state.meta.get("post", {})
        current_text = state.meta.get("adapted_text", "")
        threading.Thread(
            target=self._run_iterate,
            args=(state, post, current_text, feedback),
            daemon=True,
        ).start()

    def publish(self, state: JobState, final_text: str) -> None:
        post_id = state.meta["post_id"]
        threading.Thread(
            target=self._run_publish,
            args=(state, post_id, final_text),
            daemon=True,
        ).start()

    def _run_adapt(self, state: JobState, post_id: int) -> None:
        try:
            resp = requests.get(
                f"{self._blog_api_url}/api/posts/id/{post_id}",
                headers={"Authorization": f"Bearer {self._get_token()}"},
                timeout=15,
            )
            if not resp.ok:
                state.emit("error", message=f"Could not fetch post {post_id}: {resp.status_code}")
                return

            post = resp.json()
            state.emit("adapting")

            adapted = self._adapt(post["content"], post["title"])
            state.meta["adapted_text"] = adapted
            state.meta["post"] = post

            state.emit("awaiting_linkedin_approval", text=adapted, title=post["title"])
        except Exception as exc:
            logger.exception("LinkedIn adapt failed for post %d", post_id)
            state.emit("error", message=str(exc))

    def _run_iterate(self, state: JobState, post: dict, current_text: str, feedback: str) -> None:
        try:
            msg = self._anthropic.messages.create(
                model="claude-opus-4-8",
                max_tokens=1024,
                system=LINKEDIN_ADAPT_PROMPT,
                messages=[
                    {"role": "user", "content": f"Title: {post.get('title', '')}\n\n{post.get('content', '')}"},
                    {"role": "assistant", "content": current_text},
                    {"role": "user", "content": f"Please revise with this feedback: {feedback}"},
                ],
            )
            revised = self._validate(msg.content[0].text)
            state.meta["adapted_text"] = revised
            state.emit("awaiting_linkedin_approval", text=revised, title=post.get("title", ""))
        except Exception as exc:
            logger.exception("LinkedIn iterate failed for job %s", state.job_id)
            state.emit("error", message=str(exc))

    def _run_publish(self, state: JobState, post_id: int, final_text: str) -> None:
        try:
            state.emit("publishing_linkedin")
            resp = requests.post(
                f"{self._auth_server_url}/linkedin/publish",
                json={"postId": post_id, "text": final_text},
                headers={"Authorization": f"Bearer {self._get_token()}"},
                timeout=30,
            )
            if not resp.ok:
                state.emit("error", message=f"LinkedIn publish failed: {resp.status_code} — {resp.text}")
                return
            result = resp.json()
            state.emit("published", linkedinUrl=result.get("linkedinUrl"))
        except Exception as exc:
            logger.exception("LinkedIn publish failed for job %s", state.job_id)
            state.emit("error", message=str(exc))

    def _adapt(self, post_content: str, post_title: str) -> str:
        msg = self._anthropic.messages.create(
            model="claude-opus-4-8",
            max_tokens=1024,
            system=LINKEDIN_ADAPT_PROMPT,
            messages=[{"role": "user", "content": f"Title: {post_title}\n\n{post_content}"}],
        )
        return self._validate(msg.content[0].text)

    @staticmethod
    def _validate(text: str) -> str:
        text = text.strip().strip('"').strip("'")
        text = re.sub(r"[*#`]", "", text)
        if len(text) > 1300:
            trimmed = text[:1280]
            cut = max(trimmed.rfind(". "), trimmed.rfind("\n"))
            text = (trimmed[: cut + 1] if cut > 0 else trimmed).rstrip()
        return text
