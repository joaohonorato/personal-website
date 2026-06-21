import json
import logging
from typing import Callable

from . import tools as _tools

logger = logging.getLogger(__name__)


class Dispatcher:
    """Resolves LLM tool calls to their implementations.

    A single instance is shared across all jobs. The on_event callback is
    passed per-call so each job emits to its own SSE queue.
    """

    def __init__(
        self,
        *,
        blog_api_url: str,
        get_blog_token: Callable[[], str],
        tavily_client,
        cover_image_fn: Callable[[str], str] | None = None,
    ) -> None:
        self._blog_api_url = blog_api_url
        self._get_blog_token = get_blog_token
        self._tavily = tavily_client
        self._cover_fn = cover_image_fn

    def __call__(
        self,
        name: str,
        inputs: dict,
        on_event: Callable[..., None] | None = None,
    ) -> str:
        emit = on_event or (lambda *_, **__: None)
        logger.debug("Tool call: %s", name)

        try:
            if name == "web_search":
                emit("search", query=inputs["query"])
                return _tools.web_search(self._tavily, inputs["query"], inputs.get("count", 5))

            if name == "generate_cover_image":
                if self._cover_fn is None:
                    return "Cover image generation is disabled (OPENAI_API_KEY not set)."
                emit("cover")
                return self._cover_fn(inputs["prompt"])

            if name == "publish_article":
                emit("publishing")
                result = _tools.publish_article(
                    blog_api_url=self._blog_api_url,
                    token=self._get_blog_token(),
                    **inputs,
                )
                emit("post_created",
                     postId=result.get("id"),
                     slug=result.get("slug"),
                     title=result.get("title"))
                return json.dumps(result, ensure_ascii=False)

            if name == "save_draft":
                return _tools.save_draft(inputs["content"], inputs["filename"])

            return f"Unknown tool: {name}"

        except Exception as exc:
            logger.error("Tool %s failed: %s", name, exc)
            return f"Error: {exc}"
