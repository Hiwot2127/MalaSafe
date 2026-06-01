"""
Tests for analytics endpoints with caching.
"""

import pytest
from httpx import AsyncClient

from app.config import settings


class TestDashboard:
    """Tests for dashboard endpoint."""
    
    @pytest.mark.asyncio
    async def test_dashboard_success(self, client: AsyncClient, admin_headers: dict):
        """Test getting dashboard data."""
        response = await client.get(
            "/api/v1/analytics/dashboard",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "by_region" in data
        assert "recent_trends" in data
    
    @pytest.mark.asyncio
    async def test_dashboard_with_filters(self, client: AsyncClient, admin_headers: dict):
        """Test dashboard with year and month filters."""
        response = await client.get(
            "/api/v1/analytics/dashboard?year=2024&month=1",
            headers=admin_headers
        )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_dashboard_with_region(self, client: AsyncClient, admin_headers: dict):
        """Test dashboard filtered by region."""
        response = await client.get(
            "/api/v1/analytics/dashboard?region=Oromia",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # When filtering by region, by_region should be empty
        assert data["by_region"] == []
    
    @pytest.mark.asyncio
    async def test_dashboard_caching(self, client: AsyncClient, admin_headers: dict):
        """Test dashboard response is cached."""
        # First request
        response1 = await client.get(
            "/api/v1/analytics/dashboard",
            headers=admin_headers
        )
        assert response1.status_code == 200
        
        # Second request (should be cached if Redis available)
        response2 = await client.get(
            "/api/v1/analytics/dashboard",
            headers=admin_headers
        )
        assert response2.status_code == 200
        
        # Responses should be identical
        assert response1.json() == response2.json()
    
    @pytest.mark.asyncio
    async def test_dashboard_requires_auth(self, client: AsyncClient):
        """Test dashboard requires authentication."""
        response = await client.get("/api/v1/analytics/dashboard")
        
        assert response.status_code == 401


class TestTrends:
    """Tests for trends endpoint."""
    
    @pytest.mark.asyncio
    async def test_trends_monthly(self, client: AsyncClient, admin_headers: dict):
        """Test getting monthly trends."""
        response = await client.get(
            "/api/v1/analytics/trends?period_type=monthly",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["period_type"] == "monthly"
        assert "data" in data
        assert "total_periods" in data
    
    @pytest.mark.asyncio
    async def test_trends_weekly(self, client: AsyncClient, admin_headers: dict):
        """Test getting weekly trends."""
        response = await client.get(
            "/api/v1/analytics/trends?period_type=weekly",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["period_type"] == "weekly"
    
    @pytest.mark.asyncio
    async def test_trends_with_limit(self, client: AsyncClient, admin_headers: dict):
        """Test trends with custom limit."""
        response = await client.get(
            "/api/v1/analytics/trends?limit=6",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 6
    
    @pytest.mark.asyncio
    async def test_trends_invalid_period_type(self, client: AsyncClient, admin_headers: dict):
        """Test trends with invalid period type."""
        response = await client.get(
            "/api/v1/analytics/trends?period_type=invalid",
            headers=admin_headers
        )
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_trends_caching(self, client: AsyncClient, admin_headers: dict):
        """Test trends response is cached."""
        # First request
        response1 = await client.get(
            "/api/v1/analytics/trends",
            headers=admin_headers
        )
        assert response1.status_code == 200
        
        # Second request (should be cached if Redis available)
        response2 = await client.get(
            "/api/v1/analytics/trends",
            headers=admin_headers
        )
        assert response2.status_code == 200
        
        # Responses should be identical
        assert response1.json() == response2.json()


class TestRiskMap:
    """Tests for risk map endpoint."""
    
    @pytest.mark.asyncio
    async def test_risk_map_success(self, client: AsyncClient, admin_headers: dict):
        """Test getting risk map data."""
        response = await client.get(
            "/api/v1/maps/risk",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert "features" in data
        assert "metadata" in data
    
    @pytest.mark.asyncio
    async def test_risk_map_with_date_filter(self, client: AsyncClient, admin_headers: dict):
        """Test risk map with date filter."""
        response = await client.get(
            "/api/v1/maps/risk?date_filter=2024-01-15",
            headers=admin_headers
        )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_risk_map_with_region(self, client: AsyncClient, admin_headers: dict):
        """Test risk map filtered by region."""
        response = await client.get(
            "/api/v1/maps/risk?region=Oromia",
            headers=admin_headers
        )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not settings.CACHE_ENABLED,
        reason="caching disabled / no Redis: risk map embeds a per-call "
        "generated_at timestamp, so responses only match when the cache returns "
        "the stored payload",
    )
    async def test_risk_map_caching(self, client: AsyncClient, admin_headers: dict):
        """Test risk map response is cached."""
        # First request
        response1 = await client.get(
            "/api/v1/maps/risk",
            headers=admin_headers
        )
        assert response1.status_code == 200
        
        # Second request (should be cached if Redis available)
        response2 = await client.get(
            "/api/v1/maps/risk",
            headers=admin_headers
        )
        assert response2.status_code == 200
        
        # Responses should be identical
        assert response1.json() == response2.json()
    
    @pytest.mark.asyncio
    async def test_risk_map_requires_auth(self, client: AsyncClient):
        """Test risk map requires authentication."""
        response = await client.get("/api/v1/maps/risk")
        
        assert response.status_code == 401
