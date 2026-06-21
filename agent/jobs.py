import asyncio
import logging
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

_TERMINAL_EVENTS = {"done", "error", "cancelled", "published"}


@dataclass
class JobState:
    job_id: str
    meta: dict[str, Any] = field(default_factory=dict)
    _queue: asyncio.Queue = field(default_factory=asyncio.Queue, repr=False)
    _loop: asyncio.AbstractEventLoop | None = field(default=None, repr=False)
    _approval_event: threading.Event = field(default_factory=threading.Event, repr=False)
    _approval_feedback: str = field(default="", repr=False)
    _cancelled: bool = field(default=False, repr=False)
    _created_at: float = field(default_factory=time.monotonic, repr=False)

    def emit(self, event_type: str, **data: Any) -> None:
        event = {"type": event_type, **data}
        if self._loop is not None:
            asyncio.run_coroutine_threadsafe(self._queue.put(event), self._loop)

    async def next_event(self) -> dict:
        return await self._queue.get()

    @property
    def is_terminal(self) -> bool:
        return self._cancelled

    def approve(self, feedback: str = "") -> None:
        self._approval_feedback = feedback
        self._approval_event.set()

    def cancel(self) -> None:
        self._cancelled = True
        self._approval_event.set()

    def wait_approval(self) -> str:
        self._approval_event.wait()
        self._approval_event.clear()
        return self._approval_feedback

    @property
    def cancelled(self) -> bool:
        return self._cancelled


class JobRegistry:
    """Thread-safe job store with automatic TTL cleanup."""

    TTL = 3600 * 4

    def __init__(self) -> None:
        self._jobs: dict[str, JobState] = {}
        self._lock = threading.Lock()
        self._schedule_cleanup()

    def create(self, loop: asyncio.AbstractEventLoop, meta: dict | None = None) -> JobState:
        job_id = str(uuid.uuid4())
        state = JobState(job_id=job_id, meta=meta or {})
        state._loop = loop
        with self._lock:
            self._jobs[job_id] = state
        return state

    def get(self, job_id: str) -> JobState | None:
        with self._lock:
            return self._jobs.get(job_id)

    def _cleanup(self) -> None:
        cutoff = time.monotonic() - self.TTL
        with self._lock:
            stale = [jid for jid, s in self._jobs.items() if s._created_at < cutoff]
            for jid in stale:
                del self._jobs[jid]
        if stale:
            logger.info("Cleaned up %d stale job(s)", len(stale))
        self._schedule_cleanup()

    def _schedule_cleanup(self) -> None:
        t = threading.Timer(3600, self._cleanup)
        t.daemon = True
        t.start()
