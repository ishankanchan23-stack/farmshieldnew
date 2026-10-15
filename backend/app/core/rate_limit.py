import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request

_WINDOW_SECONDS = 60
_MAX_ATTEMPTS = 10
_attempts: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def enforce_auth_rate_limit(request: Request) -> None:
    # Use the direct peer address; never trust forwarded headers without a configured proxy.
    address = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _lock:
        for key in list(_attempts):
            while _attempts[key] and now - _attempts[key][0] >= _WINDOW_SECONDS:
                _attempts[key].popleft()
            if not _attempts[key]:
                del _attempts[key]
        attempts = _attempts[address]
        if len(attempts) >= _MAX_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Too many authentication attempts. Wait a minute and try again.", headers={"Retry-After": "60"})
        attempts.append(now)
