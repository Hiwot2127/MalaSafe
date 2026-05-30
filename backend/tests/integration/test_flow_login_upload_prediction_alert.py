"""
Integration test: Login → Upload → Prediction → Alert
"""

from __future__ import annotations

from datetime import date
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from app.ai.predictor import PredictionResult


@pytest.mark.integration
@pytest.mark.asyncio
class TestLoginUploadPredictionAlertFlow:
    async def test_end_to_end_operational_flow(
        self,
        client: AsyncClient,
        test_district,
        malaria_history,
        climate_history,
        valid_climate_csv,
    ):
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "moh@test.com", "password": "Moh12345!"},
        )
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        upload = await client.post(
            "/api/v1/uploads/climate",
            headers=headers,
            files={"file": ("climate.csv", valid_climate_csv, "text/csv")},
        )
        assert upload.status_code == 200
        assert upload.json()["success"] is True
        assert upload.json()["records_created"] >= 1

        mock_result = PredictionResult(
            risk_level="high",
            prediction_score=195.0,
            confidence_score=0.81,
            prediction_reason="Integration fixture: elevated cases",
            is_warm=True,
            target_month=date(2024, 7, 1),
        )

        with patch("app.routes.predictions.get_predictor") as mock_get_predictor:
            mock_get_predictor.return_value.predict_one.return_value = mock_result
            prediction_response = await client.post(
                "/api/v1/predictions/generate",
                headers=headers,
                json={
                    "district_id": str(test_district.id),
                    "target_month": "2024-07-01",
                },
            )

        assert prediction_response.status_code == 201
        assert prediction_response.json()["risk_level"] == "high"

        alerts_response = await client.get("/api/v1/alerts", headers=headers)
        assert alerts_response.status_code == 200
        body = alerts_response.json()
        assert body["total"] >= 1
        assert any(a["risk_level"] == "high" for a in body["alerts"])
