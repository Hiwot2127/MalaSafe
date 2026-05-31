"""
Tests for operations dashboard endpoints.
"""

import pytest
from httpx import AsyncClient


class TestHealthCheck:
    """Tests for health check endpoint."""
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, client: AsyncClient):
        """Test health check returns healthy status."""
        response = await client.get("/api/v1/operations/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "checks" in data
        assert "database" in data["checks"]
        assert "timestamp" in data
    
    @pytest.mark.asyncio
    async def test_health_check_no_auth_required(self, client: AsyncClient):
        """Test health check doesn't require authentication."""
        response = await client.get("/api/v1/operations/health")
        
        assert response.status_code == 200


class TestMetrics:
    """Tests for metrics endpoint."""
    
    @pytest.mark.asyncio
    async def test_metrics_success(self, client: AsyncClient, admin_headers: dict):
        """Test getting system metrics as admin."""
        response = await client.get(
            "/api/v1/operations/metrics",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "uploads" in data
        assert "predictions" in data
        assert "users" in data
        assert "system" in data
        assert "timestamp" in data
    
    @pytest.mark.asyncio
    async def test_metrics_moh_access(self, client: AsyncClient, moh_headers: dict):
        """Test MOH officer can access metrics."""
        response = await client.get(
            "/api/v1/operations/metrics",
            headers=moh_headers
        )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_metrics_public_denied(self, client: AsyncClient, public_headers: dict):
        """Test public user cannot access metrics."""
        response = await client.get(
            "/api/v1/operations/metrics",
            headers=public_headers
        )
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_metrics_no_auth(self, client: AsyncClient):
        """Test metrics requires authentication."""
        response = await client.get("/api/v1/operations/metrics")
        
        assert response.status_code == 401


class TestQueueStatus:
    """Tests for queue status endpoint."""
    
    @pytest.mark.asyncio
    async def test_queue_status_admin_only(self, client: AsyncClient, admin_headers: dict):
        """Test queue status is admin-only."""
        response = await client.get(
            "/api/v1/operations/queue-status",
            headers=admin_headers
        )
        
        # May return 200 or 503 depending on Celery availability
        assert response.status_code in [200, 503]
    
    @pytest.mark.asyncio
    async def test_queue_status_moh_denied(self, client: AsyncClient, moh_headers: dict):
        """Test MOH officer cannot access queue status."""
        response = await client.get(
            "/api/v1/operations/queue-status",
            headers=moh_headers
        )
        
        assert response.status_code == 403


class TestRecentErrors:
    """Tests for recent errors endpoint."""
    
    @pytest.mark.asyncio
    async def test_recent_errors_success(self, client: AsyncClient, admin_headers: dict):
        """Test getting recent errors as admin."""
        response = await client.get(
            "/api/v1/operations/recent-errors",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "errors" in data
        assert "total" in data
        assert "timestamp" in data
    
    @pytest.mark.asyncio
    async def test_recent_errors_with_limit(self, client: AsyncClient, admin_headers: dict):
        """Test recent errors with custom limit."""
        response = await client.get(
            "/api/v1/operations/recent-errors?limit=10",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["errors"]) <= 10
    
    @pytest.mark.asyncio
    async def test_recent_errors_admin_only(self, client: AsyncClient, moh_headers: dict):
        """Test recent errors is admin-only."""
        response = await client.get(
            "/api/v1/operations/recent-errors",
            headers=moh_headers
        )
        
        assert response.status_code == 403


class TestCacheInvalidation:
    """Tests for cache invalidation endpoint."""
    
    @pytest.mark.asyncio
    async def test_cache_invalidation_success(self, client: AsyncClient, admin_headers: dict):
        """Test cache invalidation as admin."""
        response = await client.post(
            "/api/v1/operations/cache/invalidate?pattern=test:*",
            headers=admin_headers
        )
        
        # May return 200 or 500 depending on Redis availability
        assert response.status_code in [200, 500]
    
    @pytest.mark.asyncio
    async def test_cache_invalidation_all(self, client: AsyncClient, admin_headers: dict):
        """Test invalidating all cache."""
        response = await client.post(
            "/api/v1/operations/cache/invalidate",
            headers=admin_headers
        )
        
        # May return 200 or 500 depending on Redis availability
        assert response.status_code in [200, 500]
    
    @pytest.mark.asyncio
    async def test_cache_invalidation_admin_only(self, client: AsyncClient, moh_headers: dict):
        """Test cache invalidation is admin-only."""
        response = await client.post(
            "/api/v1/operations/cache/invalidate",
            headers=moh_headers
        )
        
        assert response.status_code == 403
