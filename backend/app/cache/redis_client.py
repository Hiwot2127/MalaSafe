"""
Redis client for caching and rate limiting.

Provides async Redis connection with connection pooling and error handling.
"""

import redis.asyncio as redis
from typing import Optional
from app.config import settings
from loguru import logger

# Global Redis client instance
_redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """
    Get or create Redis client instance.
    
    Returns:
        Redis client instance
        
    Raises:
        ConnectionError: If Redis connection fails
    """
    global _redis_client
    
    if _redis_client is None:
        try:
            _redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                decode_responses=True,
                max_connections=20,
                socket_connect_timeout=5,
                socket_keepalive=True,
                health_check_interval=30,
            )
            
            # Test connection
            await _redis_client.ping()
            logger.info(f"Redis connected: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
            
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            _redis_client = None
            raise ConnectionError(f"Failed to connect to Redis: {e}")
    
    return _redis_client


async def close_redis():
    """
    Close Redis connection gracefully.
    
    Should be called on application shutdown.
    """
    global _redis_client
    
    if _redis_client:
        try:
            await _redis_client.close()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")
        finally:
            _redis_client = None


async def get_redis_safe() -> Optional[redis.Redis]:
    """
    Get Redis client with error handling.
    
    Returns None if Redis is unavailable instead of raising an exception.
    Useful for optional caching where the app should continue without Redis.
    
    Returns:
        Redis client instance or None if unavailable
    """
    try:
        return await get_redis()
    except Exception as e:
        logger.warning(f"Redis unavailable, continuing without cache: {e}")
        return None
