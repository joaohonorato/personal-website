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


class BlogTokenManager:
    """Obtains and auto-refreshes a client_credentials token."""

    REFRESH_BUFFER = 300

    def __init__(self, auth_server_url: str, client_id: str, client_secret: str) -> None:
        self._url = auth_server_url
        self._client_id = client_id
        self._client_secret = client_secret
        self._token: str = ""
        self._lock = threading.Lock()

    def start(self) -> None:
        threading.Thread(target=self._refresh, daemon=True).start()

    @property
    def token(self) -> str:
        with self._lock:
            return self._token

    def _refresh(self) -> None:
        if not all([self._url, self._client_id, self._client_secret]):
            logger.warning("BlogTokenManager: auth credentials not fully configured")
            return
        try:
            resp = requests.post(
                f"{self._url}/oauth2/token",
                data={"grant_type": "client_credentials", "scope": "agent"},
                auth=(self._client_id, self._client_secret),
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            expires_in = int(data.get("expires_in", 86400))

            with self._lock:
                self._token = data["access_token"]

            logger.info("[OK] Blog token obtained, expires in %ds", expires_in)

            delay = max(60, expires_in - self.REFRESH_BUFFER)
            t = threading.Timer(delay, self._refresh)
            t.daemon = True
            t.start()

        except Exception as exc:
            logger.error("Failed to obtain blog token: %s — retrying in 60s", exc)
            t = threading.Timer(60, self._refresh)
            t.daemon = True
            t.start()
