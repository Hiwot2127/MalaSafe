"""
Caching decorators for FastAPI endpoints.

Provides Redis-based caching with automatic key generation and TTL management.
"""

import json
import hashlib
from functools import wraps
from typing import Optional, Callable, Any
from app.cache.redis_client import get_redis_safe
from loguru import logger


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generate a cache key from function arguments.
    
    Args:
        prefix: Cache key prefix (usually function name)
        *args: Positional arguments
        **kwargs: Keyword arguments
        
    Returns:
        Cache key string
    """
    # Create a deterministic string from arguments
    key_parts = [prefix]
    
    # Add positional args
    for arg in args:
        if hasattr(arg, 'id'):  # Handle SQLAlchemy models
            key_parts.append(str(arg.id))
        else:
            key_parts.append(str(arg))
    
    # Add keyword args (sorted for consistency)
    for k, v in sorted(kwargs.items()):
        if k not in ['db', 'request', 'response', 'background_tasks']:  # Skip non-cacheable args
            if hasattr(v, 'id'):
                key_parts.append(f"{k}:{v.id}")
            else:
                key_parts.append(f"{k}:{v}")
    
    # Create hash for long keys
    key_str = ":".join(key_parts)
    if len(key_str) > 200:
        key_hash = hashlib.md5(key_str.encode()).hexdigest()
        return f"{prefix}:{key_hash}"
    
    return key_str


def cached(
    ttl: int = 300,
    prefix: Optional[str] = None,
    key_builder: Optional[Callable] = None
):
    """
    Cache decorator for async functions.
    
    Args:
        ttl: Time to live in seconds (default: 300 = 5 minutes)
        prefix: Cache key prefix (default: function name)
        key_builder: Custom key builder function (default: generate_cache_key)
        
    Usage:
        @cached(ttl=600, prefix="dashboard")
        async def get_dashboard_stats(db: AsyncSession, district_id: str):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Get Redis client (returns None if unavailable)
            redis = await get_redis_safe()
            
            # If Redis unavailable, execute function without caching
            if redis is None:
                logger.debug(f"Cache miss (Redis unavailable): {func.__name__}")
                return await func(*args, **kwargs)
            
            # Generate cache key
            cache_prefix = prefix or f"cache:{func.__name__}"
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = generate_cache_key(cache_prefix, *args, **kwargs)
            
            try:
                # Try to get from cache
                cached_value = await redis.get(cache_key)
                
                if cached_value:
                    logger.debug(f"Cache hit: {cache_key}")
                    return json.loads(cached_value)
                
                # Cache miss - execute function
                logger.debug(f"Cache miss: {cache_key}")
                result = await func(*args, **kwargs)
                
                # Store in cache
                try:
                    await redis.setex(
                        cache_key,
                        ttl,
                        json.dumps(result, default=str)  # default=str handles dates, UUIDs
                    )
                    logger.debug(f"Cached: {cache_key} (TTL: {ttl}s)")
                except Exception as e:
                    logger.warning(f"Failed to cache result: {e}")
                
                return result
                
            except Exception as e:
                logger.error(f"Cache error: {e}")
                # On error, execute function without caching
                return await func(*args, **kwargs)
        
        return wrapper
    return decorator


async def invalidate_cache(pattern: str):
    """
    Invalidate cache keys matching a pattern.
    
    Args:
        pattern: Redis key pattern (e.g., "dashboard:*", "analytics:district:123:*")
        
    Usage:
        # Invalidate all dashboard caches
        await invalidate_cache("dashboard:*")
        
        # Invalidate specific district caches
        await invalidate_cache(f"analytics:district:{district_id}:*")
    """
    redis = await get_redis_safe()
    
    if redis is None:
        logger.warning("Cannot invalidate cache: Redis unavailable")
        return
    
    try:
        # Find all keys matching pattern
        keys = []
        async for key in redis.scan_iter(match=pattern):
            keys.append(key)
        
        if keys:
            await redis.delete(*keys)
            logger.info(f"Invalidated {len(keys)} cache keys matching: {pattern}")
        else:
            logger.debug(f"No cache keys found matching: {pattern}")
            
    except Exception as e:
        logger.error(f"Cache invalidation error: {e}")


async def invalidate_all():
    """
    Invalidate all cache keys.
    
    Use with caution - only for maintenance or testing.
    """
    redis = await get_redis_safe()
    
    if redis is None:
        logger.warning("Cannot invalidate cache: Redis unavailable")
        return
    
    try:
        await redis.flushdb()
        logger.warning("All cache keys invalidated (FLUSHDB)")
    except Exception as e:
        logger.error(f"Cache flush error: {e}")
