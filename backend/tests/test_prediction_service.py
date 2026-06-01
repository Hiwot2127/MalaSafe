"""
Unit tests for PredictionService.
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import select

from app.models import Alert, Prediction
from app.services.prediction_service import PredictionService


@pytest.mark.unit
@pytest.mark.asyncio
class TestPredictionService:
    async def test_generate_one_creates_prediction(
        self,
        db_session,
        test_district,
        malaria_history,
        climate_history,
        mock_predictor,
        target_month,
    ):
        service = PredictionService(db_session, mock_predictor)

        prediction = await service.generate_one(test_district.id, target_month)

        assert prediction.risk_level == "high"
        assert prediction.prediction_score == pytest.approx(165.0)
        assert prediction.district_id == test_district.id
        assert prediction.prediction_date == target_month

    async def test_generate_one_returns_existing_without_force(
        self,
        db_session,
        test_district,
        malaria_history,
        climate_history,
        mock_predictor,
        target_month,
    ):
        service = PredictionService(db_session, mock_predictor)

        first = await service.generate_one(test_district.id, target_month)
        mock_predictor.predict_one.reset_mock()

        second = await service.generate_one(test_district.id, target_month, force=False)

        assert second.id == first.id
        mock_predictor.predict_one.assert_not_called()

    async def test_generate_one_force_replaces_existing(
        self,
        db_session,
        test_district,
        malaria_history,
        climate_history,
        mock_predictor,
        target_month,
    ):
        from app.ai.predictor import PredictionResult

        service = PredictionService(db_session, mock_predictor)

        first = await service.generate_one(test_district.id, target_month)
        assert mock_predictor.predict_one.call_count == 1

        mock_predictor.predict_one.side_effect = lambda **kwargs: PredictionResult(
            risk_level="very_high",
            prediction_score=420.0,
            confidence_score=0.66,
            prediction_reason="Updated fixture prediction",
            is_warm=True,
            target_month=target_month,
        )

        updated = await service.generate_one(test_district.id, target_month, force=True)

        assert updated.id == first.id
        assert updated.risk_level == "very_high"
        assert updated.prediction_score == pytest.approx(420.0)
        assert mock_predictor.predict_one.call_count == 2

    async def test_high_risk_prediction_creates_alert(
        self,
        db_session,
        test_district,
        malaria_history,
        climate_history,
        mock_predictor,
        target_month,
    ):
        service = PredictionService(db_session, mock_predictor)
        await service.generate_one(test_district.id, target_month)

        alerts = (await db_session.execute(select(Alert))).scalars().all()
        assert len(alerts) == 1
        assert alerts[0].risk_level == "high"
        assert alerts[0].district_id == test_district.id

    async def test_low_risk_prediction_does_not_create_alert(
        self,
        db_session,
        test_district,
        malaria_history,
        climate_history,
        low_risk_predictor,
        target_month,
    ):
        service = PredictionService(db_session, low_risk_predictor)
        await service.generate_one(test_district.id, target_month)

        alerts = (await db_session.execute(select(Alert))).scalars().all()
        assert len(alerts) == 0

    async def test_generate_one_raises_for_missing_district(
        self,
        db_session,
        mock_predictor,
        target_month,
    ):
        import uuid

        service = PredictionService(db_session, mock_predictor)

        with pytest.raises(ValueError, match="district .* not found"):
            await service.generate_one(uuid.uuid4(), target_month)

    async def test_generate_batch_processes_multiple_districts(
        self,
        db_session,
        test_district,
        malaria_history,
        climate_history,
        mock_predictor,
        target_month,
    ):
        service = PredictionService(db_session, mock_predictor)
        count = await service.generate_batch(target_month, district_ids=[test_district.id])

        assert count == 1
        predictions = (await db_session.execute(select(Prediction))).scalars().all()
        assert len(predictions) == 1
