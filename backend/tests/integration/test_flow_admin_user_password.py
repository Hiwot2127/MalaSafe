"""
Integration test: Admin Create User → Reset Password → User Login
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.integration
@pytest.mark.asyncio
class TestAdminUserPasswordFlow:
    async def test_create_reset_and_login(self, client: AsyncClient, admin_headers: dict):
        create = await client.post(
            "/api/v1/admin/users",
            headers=admin_headers,
            json={
                "email": "new.officer@test.com",
                "full_name": "New Officer",
                "role": "moh_officer",
                "generate_password": False,
                "password": "TempOfficer123!",
            },
        )
        assert create.status_code == 201
        user_id = create.json()["id"]

        reset = await client.post(
            f"/api/v1/admin/users/{user_id}/reset-password",
            headers=admin_headers,
            json={
                "new_password": "ResetOfficer123!",
                "require_change_on_login": False,
            },
        )
        assert reset.status_code == 200

        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "new.officer@test.com", "password": "ResetOfficer123!"},
        )
        assert login.status_code == 200
        assert login.json()["user"]["role"] == "moh_officer"

        me = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        )
        assert me.status_code == 200
        assert me.json()["email"] == "new.officer@test.com"
