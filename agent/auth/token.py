import logging
import threading

import requests

logger = logging.getLogger(__name__)


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
