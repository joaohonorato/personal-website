import asyncio
import logging
import threading

from core.dispatch import Dispatcher
from core.runner import run_agent
from jobs import JobRegistry, JobState

logger = logging.getLogger(__name__)


class ArticleService:
    def __init__(
        self,
        *,
        job_registry: JobRegistry,
        anthropic_client,
        dispatcher: Dispatcher,
        system_prompt: str,
        tools: list[dict],
    ) -> None:
        self._registry = job_registry
        self._anthropic = anthropic_client
        self._dispatcher = dispatcher
        self._system_prompt = system_prompt
        self._tools = tools

    def start(self, loop: asyncio.AbstractEventLoop, brief: dict) -> JobState:
        state = self._registry.create(loop)
        threading.Thread(target=self._run, args=(state, brief), daemon=True).start()
        return state

    def _run(self, state: JobState, brief: dict) -> None:
        try:
            run_agent(
                brief=brief,
                anthropic_client=self._anthropic,
                dispatcher=self._dispatcher,
                system_prompt=self._system_prompt,
                tools=self._tools,
                on_event=state.emit,
                request_approval=state.wait_approval,
                is_cancelled=lambda: state.cancelled,
            )
        except Exception as exc:
            logger.exception("Article agent failed for job %s", state.job_id)
            state.emit("error", message=str(exc))
