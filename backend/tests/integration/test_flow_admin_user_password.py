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
                "email": "abebe.kebede@moh.gov.et",
                "full_name": "QA Official",
                "role": "moh_officer",
                "generate_password": False,
                "password": "Official2026!",
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
            json={"email": "abebe.kebede@moh.gov.et", "password": "ResetOfficer123!"},
        )
        assert login.status_code == 200
        assert login.json()["user"]["role"] == "moh_officer"

        me = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        )
        assert me.status_code == 200
        assert me.json()["email"] == "abebe.kebede@moh.gov.et"

    async def test_create_with_temporary_password_and_login(self, client: AsyncClient, admin_headers: dict):
        create = await client.post(
            "/api/v1/admin/users",
            headers=admin_headers,
            json={
                "email": "temp.official@moh.gov.et",
                "full_name": "Temp Official",
                "role": "moh_officer",
                "generate_password": True,
            },
        )

        assert create.status_code == 201
        data = create.json()
        assert data["temporary_password"]
        assert data["force_password_change"] is True

        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "temp.official@moh.gov.et", "password": data["temporary_password"]},
        )

        assert login.status_code == 200
        assert login.json()["force_password_change"] is True
        assert login.json()["user"]["email"] == "temp.official@moh.gov.et"
