import logging
import threading
import time

import requests
from jose import JWTError, jwt as jose_jwt

logger = logging.getLogger(__name__)


class JwksCache:
    """Thread-safe JWKS key cache with TTL."""

    TTL = 3600

    def __init__(self, auth_server_url: str) -> None:
        self._url = auth_server_url
        self._keys: list[dict] = []
        self._fetched_at: float = 0.0
        self._lock = threading.Lock()

    def _refresh(self) -> None:
        resp = requests.get(f"{self._url}/oauth2/jwks", timeout=10)
        resp.raise_for_status()
        self._keys = resp.json().get("keys", [])
        self._fetched_at = time.monotonic()
        logger.info("JWKS refreshed: %d key(s)", len(self._keys))

    def get_keys(self) -> list[dict]:
        with self._lock:
            if not self._url:
                return []
            if time.monotonic() - self._fetched_at > self.TTL:
                self._refresh()
            return list(self._keys)

    def invalidate(self) -> None:
        with self._lock:
            self._fetched_at = 0.0

    def select_key(self, token: str) -> dict:
        keys = self.get_keys()
        if not keys:
            raise JWTError("No JWKS keys available")
        try:
            kid = jose_jwt.get_unverified_header(token).get("kid")
        except JWTError:
            kid = None
        for k in keys:
            if kid is None or k.get("kid") == kid:
                return k
        return keys[0]
