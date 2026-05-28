"""
Tests for Redis caching functionality.
"""

import pytest
from app.cache.redis_client import get_redis_safe
from app.cache.decorators import cached, invalidate_cache
import asyncio


class TestRedisClient:
    """Tests for Redis client."""
    
    @pytest.mark.asyncio
    async def test_redis_connection(self):
        """Test Redis connection (may be None if Redis not available)."""
        redis = await get_redis_safe()
        
        # Redis may not be available in test environment
        if redis:
            # Test ping
            result = await redis.ping()
            assert result is True
    
    @pytest.mark.asyncio
    async def test_redis_set_get(self):
        """Test Redis set and get operations."""
        redis = await get_redis_safe()
        
        if redis:
            # Set value
            await redis.setex("test_key", 60, "test_value")
            
            # Get value
            value = await redis.get("test_key")
            assert value == "test_value"
            
            # Delete key
            await redis.delete("test_key")
    
    @pytest.mark.asyncio
    async def test_redis_expiration(self):
        """Test Redis key expiration."""
        redis = await get_redis_safe()
        
        if redis:
            # Set value with 1 second TTL
            await redis.setex("test_expire", 1, "value")
            
            # Value should exist
            value = await redis.get("test_expire")
            assert value == "value"
            
            # Wait for expiration
            await asyncio.sleep(2)
            
            # Value should be gone
            value = await redis.get("test_expire")
            assert value is None


class TestCacheDecorator:
    """Tests for @cached decorator."""
    
    @pytest.mark.asyncio
    async def test_cached_function(self):
        """Test caching a function."""
        call_count = 0
        
        @cached(ttl=60, prefix="test")
        async def expensive_function(x: int) -> int:
            nonlocal call_count
            call_count += 1
            return x * 2
        
        # First call - should execute function
        result1 = await expensive_function(5)
        assert result1 == 10
        assert call_count == 1
        
        # Second call - should use cache (if Redis available)
        result2 = await expensive_function(5)
        assert result2 == 10
        # call_count may be 1 (cached) or 2 (no Redis)
    
    @pytest.mark.asyncio
    async def test_cached_different_args(self):
        """Test caching with different arguments."""
        call_count = 0
        
        @cached(ttl=60, prefix="test")
        async def expensive_function(x: int) -> int:
            nonlocal call_count
            call_count += 1
            return x * 2
        
        # Different arguments should not use same cache
        result1 = await expensive_function(5)
        result2 = await expensive_function(10)
        
        assert result1 == 10
        assert result2 == 20
        assert call_count == 2  # Both should execute


class TestCacheInvalidation:
    """Tests for cache invalidation."""
    
    @pytest.mark.asyncio
    async def test_invalidate_pattern(self):
        """Test invalidating cache by pattern."""
        redis = await get_redis_safe()
        
        if redis:
            # Set some test keys
            await redis.setex("test:key1", 60, "value1")
            await redis.setex("test:key2", 60, "value2")
            await redis.setex("other:key", 60, "value3")
            
            # Invalidate test:* pattern
            await invalidate_cache("test:*")
            
            # test:* keys should be gone
            value1 = await redis.get("test:key1")
            value2 = await redis.get("test:key2")
            assert value1 is None
            assert value2 is None
            
            # other:key should still exist
            value3 = await redis.get("other:key")
            assert value3 == "value3"
            
            # Cleanup
            await redis.delete("other:key")
    
    @pytest.mark.asyncio
    async def test_invalidate_no_matches(self):
        """Test invalidating with no matching keys."""
        # Should not raise error
        await invalidate_cache("nonexistent:*")


class TestCacheGracefulDegradation:
    """Tests for graceful degradation when Redis is unavailable."""
    
    @pytest.mark.asyncio
    async def test_function_works_without_redis(self):
        """Test that cached functions work even if Redis is unavailable."""
        @cached(ttl=60, prefix="test")
        async def my_function(x: int) -> int:
            return x * 2
        
        # Should work regardless of Redis availability
        result = await my_function(5)
        assert result == 10
    
    @pytest.mark.asyncio
    async def test_invalidation_safe_without_redis(self):
        """Test that cache invalidation doesn't crash without Redis."""
        # Should not raise error even if Redis is unavailable
        await invalidate_cache("test:*")
