"""Rate limiting middleware using slowapi."""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings


# Create limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Global default
    enabled=settings.RATE_LIMIT_ENABLED,
)


def setup_rate_limiting(app):
    """Configure rate limiting middleware."""
    if not settings.RATE_LIMIT_ENABLED:
        return
    
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
