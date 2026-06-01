"""
Integration test: Upload → Monthly Close → Recommendation → PDF Export
"""

from __future__ import annotations

from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.ai.predictor import PredictionResult

from app.services.recommendation_service import RecommendationEngine, RecommendationRule


@pytest.mark.integration
@pytest.mark.asyncio
class TestUploadCloseRecommendationExportFlow:
    async def test_reporting_pipeline(
        self,
        client: AsyncClient,
        test_district,
        malaria_history,
        climate_history,
        valid_climate_csv,
        monthly_close_record,
        moh_headers: dict,
        ephi_headers: dict,
        target_month,
    ):
        upload = await client.post(
            "/api/v1/uploads/climate",
            headers=moh_headers,
            files={"file": ("climate.csv", valid_climate_csv, "text/csv")},
        )
        assert upload.status_code == 200
        assert upload.json()["success"] is True

        closes = await client.get("/api/v1/monthly-close", headers=moh_headers)
        assert closes.status_code == 200
        close_ids = {item["id"] for item in closes.json()["items"]}
        assert str(monthly_close_record.id) in close_ids

        mock_result = PredictionResult(
            risk_level="high",
            prediction_score=210.0,
            confidence_score=0.77,
            prediction_reason="Integration fixture for reporting pipeline",
            is_warm=True,
            target_month=target_month,
        )

        with patch("app.routes.predictions.get_predictor") as mock_get_predictor:
            mock_get_predictor.return_value.predict_one.return_value = mock_result
            prediction = await client.post(
                "/api/v1/predictions/generate",
                headers=moh_headers,
                json={
                    "district_id": str(test_district.id),
                    "target_month": target_month.isoformat(),
                },
            )

        assert prediction.status_code == 201
        prediction_id = prediction.json()["id"]

        with patch(
            "app.routes.recommendations.RecommendationEngine.generate_recommendations",
            new=AsyncMock(return_value=[
                RecommendationRule(
                    category=RecommendationEngine.MEDICAL,
                    text="Pre-position ACT medications",
                    priority=RecommendationEngine.HIGH,
                    trigger_reason="High risk in integration test",
                )
            ]),
        ):
            recommendations = await client.post(
                f"/api/v1/recommendations/generate/{prediction_id}",
                headers=ephi_headers,
                json={"force": True},
            )

        assert recommendations.status_code == 200
        assert recommendations.json()["recommendations_count"] >= 1

        pdf = await client.post(
            f"/api/v1/exports/district-report/{test_district.id}",
            headers=moh_headers,
            params={"months": 12},
        )
        assert pdf.status_code == 200
        assert pdf.headers["content-type"] == "application/pdf"
        assert pdf.content[:4] == b"%PDF"
