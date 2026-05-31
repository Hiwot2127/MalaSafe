"""
Tests for authentication endpoints.
"""

import pytest
from httpx import AsyncClient
from app.models.user import User


class TestLogin:
    """Tests for login endpoint."""
    
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_admin_user: User):
        """Test successful login."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "admin@test.com"
        assert data["user"]["role"] == "admin"
        
        # Check cookies are set
        assert "session_token" in response.cookies
        assert "refresh_token" in response.cookies
        assert "user_role" in response.cookies
    
    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client: AsyncClient, test_admin_user: User):
        """Test login with invalid credentials."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with nonexistent user."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@test.com", "password": "password"}
        )
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient, test_admin_user: User, db_session):
        """Test login with inactive user."""
        # Deactivate user
        test_admin_user.is_active = False
        await db_session.commit()
        
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        
        assert response.status_code == 403
        assert "inactive" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    @pytest.mark.rate_limit
    async def test_login_rate_limiting(self, client: AsyncClient):
        """Test rate limiting on login endpoint."""
        # Make 6 requests (limit is 5/minute)
        for i in range(6):
            response = await client.post(
                "/api/v1/auth/login",
                json={"email": "test@test.com", "password": "wrong"}
            )
            
            if i < 5:
                assert response.status_code in [401, 200]  # Auth error or success
            else:
                assert response.status_code == 429  # Rate limit exceeded


class TestRefreshToken:
    """Tests for refresh token endpoint."""
    
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client: AsyncClient, test_admin_user: User):
        """Test successful token refresh."""
        # Login first
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        assert login_response.status_code == 200
        
        # Extract cookies
        cookies = login_response.cookies
        
        # Refresh token
        refresh_response = await client.post(
            "/api/v1/auth/refresh",
            cookies=cookies
        )
        
        assert refresh_response.status_code == 200
        data = refresh_response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        
        # Check new cookies are set
        assert "session_token" in refresh_response.cookies
        assert "refresh_token" in refresh_response.cookies
    
    @pytest.mark.asyncio
    async def test_refresh_token_missing(self, client: AsyncClient):
        """Test refresh without token."""
        response = await client.post("/api/v1/auth/refresh")
        
        assert response.status_code == 401
        assert "Refresh token not found" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, client: AsyncClient):
        """Test refresh with invalid token."""
        response = await client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": "invalid_token"}
        )
        
        assert response.status_code == 401


class TestLogout:
    """Tests for logout endpoint."""
    
    @pytest.mark.asyncio
    async def test_logout_success(self, client: AsyncClient, test_admin_user: User):
        """Test successful logout."""
        # Login first
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        cookies = login_response.cookies
        
        # Logout
        logout_response = await client.post(
            "/api/v1/auth/logout",
            cookies=cookies
        )
        
        assert logout_response.status_code == 200
        assert "Successfully logged out" in logout_response.json()["message"]
        
        # Check cookies are cleared (max_age=0 or deleted)
        # Note: httpx doesn't fully simulate cookie deletion, but we can check the response
    
    @pytest.mark.asyncio
    async def test_logout_without_auth(self, client: AsyncClient):
        """Test logout without authentication."""
        response = await client.post("/api/v1/auth/logout")
        
        assert response.status_code == 401


class TestGetCurrentUser:
    """Tests for get current user endpoint."""
    
    @pytest.mark.asyncio
    async def test_get_current_user_success(self, client: AsyncClient, admin_headers: dict):
        """Test getting current user info."""
        response = await client.get(
            "/api/v1/auth/me",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@test.com"
        assert data["role"] == "admin"
        assert "password" not in data
        assert "password_hash" not in data
    
    @pytest.mark.asyncio
    async def test_get_current_user_with_cookie(self, client: AsyncClient, test_admin_user: User):
        """Test getting current user with cookie authentication."""
        # Login to get cookies
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"}
        )
        cookies = login_response.cookies
        
        # Get current user with cookies
        response = await client.get(
            "/api/v1/auth/me",
            cookies=cookies
        )
        
        assert response.status_code == 200
        assert response.json()["email"] == "admin@test.com"
    
    @pytest.mark.asyncio
    async def test_get_current_user_without_auth(self, client: AsyncClient):
        """Test getting current user without authentication."""
        response = await client.get("/api/v1/auth/me")
        
        assert response.status_code == 401


class TestCreateOfficial:
    """Tests for create official endpoint."""
    
    @pytest.mark.asyncio
    async def test_create_official_success(self, client: AsyncClient, admin_headers: dict):
        """Test creating official user as admin."""
        response = await client.post(
            "/api/v1/auth/create-official",
            headers=admin_headers,
            json={
                "email": "abebe.kebede@moh.gov.et",
                "full_name": "QA Official",
                "password": "Official2026!",
                "role": "moh_officer"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "abebe.kebede@moh.gov.et"
        assert data["role"] == "moh_officer"
        assert "password" not in data
    
    @pytest.mark.asyncio
    async def test_create_official_weak_password(self, client: AsyncClient, admin_headers: dict):
        """Test creating official with weak password."""
        response = await client.post(
            "/api/v1/auth/create-official",
            headers=admin_headers,
            json={
                "email": "abebe.kebede@moh.gov.et",
                "full_name": "QA Official",
                "password": "weak",
                "role": "moh_officer"
            }
        )
        
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_create_official_duplicate_email(
        self, client: AsyncClient, admin_headers: dict, test_moh_user: User
    ):
        """Test creating official with duplicate email."""
        response = await client.post(
            "/api/v1/auth/create-official",
            headers=admin_headers,
            json={
                "email": "moh@test.com",  # Already exists
                "full_name": "Test Officer",
                "password": "SecurePassword123!",
                "role": "moh_officer"
            }
        )
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_create_official_non_admin(self, client: AsyncClient, moh_headers: dict):
        """Test creating official as non-admin."""
        response = await client.post(
            "/api/v1/auth/create-official",
            headers=moh_headers,
            json={
                "email": "abebe.kebede@moh.gov.et",
                "full_name": "QA Official",
                "password": "Official2026!",
                "role": "moh_officer"
            }
        )
        
        assert response.status_code == 403


class TestChangePassword:
    """Tests for password change endpoint."""

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_change_password_success(self, client: AsyncClient, moh_headers: dict):
        response = await client.post(
            "/api/v1/auth/change-password",
            headers=moh_headers,
            json={
                "current_password": "Moh12345!",
                "new_password": "NewMoh12345!",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["force_password_change"] is False

        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "moh@test.com", "password": "NewMoh12345!"},
        )
        assert login_response.status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_change_password_wrong_current(self, client: AsyncClient, moh_headers: dict):
        response = await client.post(
            "/api/v1/auth/change-password",
            headers=moh_headers,
            json={
                "current_password": "WrongPassword123!",
                "new_password": "AnotherMoh12345!",
            },
        )

        assert response.status_code == 400
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_change_password_requires_auth(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "Moh12345!",
                "new_password": "NewMoh12345!",
            },
        )

        assert response.status_code == 401


class TestAccountLockout:
    """Tests for failed-login lockout behaviour."""

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_failed_login_increments_attempt_counter(
        self, client: AsyncClient, test_admin_user: User, db_session
    ):
        for _ in range(3):
            await client.post(
                "/api/v1/auth/login",
                json={"email": "admin@test.com", "password": "wrong-password"},
            )

        await db_session.refresh(test_admin_user)
        assert test_admin_user.failed_login_attempts >= 3

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_successful_login_resets_failed_attempts(
        self, client: AsyncClient, test_admin_user: User, db_session
    ):
        test_admin_user.failed_login_attempts = 3
        await db_session.commit()

        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.com", "password": "Admin123!"},
        )
        assert response.status_code == 200

        await db_session.refresh(test_admin_user)
        assert test_admin_user.failed_login_attempts == 0


class TestForcePasswordChange:
    """Tests for forced password change flag on login."""

    @pytest.mark.asyncio
    @pytest.mark.auth
    async def test_login_returns_force_password_change_flag(
        self, client: AsyncClient, test_forced_password_user: User
    ):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "forced@test.com", "password": "Forced123!"},
        )

        assert response.status_code == 200
        assert response.json()["force_password_change"] is True
