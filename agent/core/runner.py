import logging
from typing import Callable

from .dispatch import Dispatcher

logger = logging.getLogger(__name__)

_APPROVAL_TOKEN = "AWAITING_OUTLINE_APPROVAL"


def run_agent(
    *,
    brief: dict,
    anthropic_client,
    dispatcher: Dispatcher,
    system_prompt: str,
    tools: list[dict],
    on_event: Callable[..., None],
    request_approval: Callable[[str], str],
    is_cancelled: Callable[[], bool] = lambda: False,
) -> None:
    """Core agent loop shared by the server (SSE) and CLI.

    on_event(event_type, **data) — called for progress updates
    request_approval(outline_text) -> feedback_str — blocks until human responds
    is_cancelled() -> bool — checked before each LLM call
    """
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
                f"Key points    : {brief.get('keyPoints', brief.get('key_points', 'comprehensive coverage'))}\n\n"
                "Start with Phase 1 (Research), then Phase 2 (Outline)."
            ),
        }
    ]

    outline_approved = False
    on_event("started")

    while True:
        if is_cancelled():
            on_event("cancelled")
            return

        response = anthropic_client.messages.create(
            model="claude-opus-4-8",
            max_tokens=16000,
            system=system_prompt,
            tools=tools,
            messages=messages,
        )
        logger.debug("LLM stop_reason=%s blocks=%d", response.stop_reason, len(response.content))

        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = dispatcher(block.name, block.input, on_event=on_event)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        if tool_results:
            messages.append({"role": "user", "content": tool_results})
            continue

        text = "".join(b.text for b in response.content if hasattr(b, "text"))

        if _APPROVAL_TOKEN in text and not outline_approved:
            outline_text = text.replace(_APPROVAL_TOKEN, "").strip()
            on_event("outline", text=outline_text)

            feedback = request_approval(outline_text)

            if feedback.strip() in ("", "approved"):
                outline_approved = True
                messages.append({
                    "role": "user",
                    "content": (
                        "Outline approved. Proceed with Phase 3 (write the full article), "
                        "Phase 4 (cover image), then Phase 5 (publish)."
                    ),
                })
                on_event("writing")
            else:
                messages.append({
                    "role": "user",
                    "content": (
                        f"Please revise the outline with this feedback: {feedback}\n"
                        "Show the revised outline and output AWAITING_OUTLINE_APPROVAL again."
                    ),
                })
            continue

        if response.stop_reason == "end_turn":
            on_event("done")
            return
