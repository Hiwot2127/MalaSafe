"""
Unit tests for RecommendationEngine rule-based recommendations.
"""

from __future__ import annotations

from datetime import date
from unittest.mock import AsyncMock, patch

import pytest

from app.models.district import District
from app.models.prediction import Prediction
from app.services.recommendation_service import RecommendationEngine, RecommendationRule


@pytest.mark.unit
class TestRecommendationRules:
    def test_low_risk_rules(self):
        rules = RecommendationEngine._apply_risk_rules("low", 15.0)

        assert len(rules) == 3
        assert all(isinstance(rule, RecommendationRule) for rule in rules)
        assert rules[0].priority == RecommendationEngine.LOW
        assert "routine malaria surveillance" in rules[0].text.lower()

    def test_high_risk_rules_include_escalation(self):
        rules = RecommendationEngine._apply_risk_rules("high", 220.0)

        categories = {rule.category for rule in rules}
        assert RecommendationEngine.ESCALATION in categories
        assert RecommendationEngine.MEDICAL in categories
        assert any(rule.priority == RecommendationEngine.HIGH for rule in rules)

    def test_very_high_risk_rules_are_critical(self):
        rules = RecommendationEngine._apply_risk_rules("very_high", 500.0)

        assert len(rules) >= 5
        assert any(rule.priority == RecommendationEngine.CRITICAL for rule in rules)

    def test_low_confidence_adds_verification_rules(self):
        rules = RecommendationEngine._apply_confidence_rules(0.35)

        assert len(rules) == 2
        assert "manual epidemiological review" in rules[0].text.lower()

    def test_rising_trend_adds_investigation_rule(self):
        context = {"trend": "rising", "trend_percentage": 35.0}
        rules = RecommendationEngine._apply_trend_rules(context)

        assert len(rules) == 2
        assert "investigate causes" in rules[0].text.lower()

    def test_heavy_rainfall_adds_vector_control_rules(self):
        context = {"rainfall_anomaly": 60.0, "temperature_anomaly": 0.5}
        rules = RecommendationEngine._apply_climate_rules(context)

        assert len(rules) == 2
        assert any("breeding site" in rule.text.lower() for rule in rules)


@pytest.mark.unit
@pytest.mark.asyncio
class TestRecommendationEngineIntegration:
    async def test_generate_recommendations_combines_rule_sets(self, db_session, test_district):
        prediction = Prediction(
            district_id=test_district.id,
            risk_level="high",
            prediction_score=210.0,
            confidence_score=0.45,
            prediction_reason="Test fixture",
            prediction_date=date(2024, 7, 1),
        )

        historical_context = {
            "trend": "rising",
            "trend_percentage": 25.0,
            "recent_cases": 300,
            "previous_cases": 200,
            "had_recent_outbreak": True,
            "months_since_outbreak": 2,
        }
        climate_context = {
            "rainfall_anomaly": 55.0,
            "temperature_anomaly": 2.5,
            "recent_rainfall": 155.0,
            "recent_temperature": 27.5,
        }

        with patch.object(
            RecommendationEngine,
            "_get_historical_context",
            new=AsyncMock(return_value=historical_context),
        ), patch.object(
            RecommendationEngine,
            "_get_climate_context",
            new=AsyncMock(return_value=climate_context),
        ):
            recommendations = await RecommendationEngine.generate_recommendations(
                db_session,
                prediction,
                test_district,
            )

        assert len(recommendations) >= 8
        priorities = {rec.priority for rec in recommendations}
        assert RecommendationEngine.HIGH in priorities or RecommendationEngine.CRITICAL in priorities

    async def test_moderate_risk_includes_medical_readiness(self, db_session, test_district):
        prediction = Prediction(
            district_id=test_district.id,
            risk_level="moderate",
            prediction_score=80.0,
            confidence_score=0.75,
            prediction_reason="Test fixture",
            prediction_date=date(2024, 7, 1),
        )

        with patch.object(
            RecommendationEngine,
            "_get_historical_context",
            new=AsyncMock(return_value={"trend": "stable", "trend_percentage": 0}),
        ), patch.object(
            RecommendationEngine,
            "_get_climate_context",
            new=AsyncMock(return_value={"rainfall_anomaly": 0, "temperature_anomaly": 0}),
        ):
            recommendations = await RecommendationEngine.generate_recommendations(
                db_session,
                prediction,
                test_district,
            )

        texts = " ".join(rec.text.lower() for rec in recommendations)
        assert "testing capacity" in texts or "monitoring" in texts
