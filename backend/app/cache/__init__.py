"""
Redis caching infrastructure for MalaSafe backend.
"""

from app.cache.redis_client import get_redis, close_redis
from app.cache.decorators import cached, invalidate_cache

__all__ = ["get_redis", "close_redis", "cached", "invalidate_cache"]
