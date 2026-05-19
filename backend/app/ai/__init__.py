"""AI module - malaria risk predictor.

Singleton load: the LightGBM boosters are heavy enough (~10 MB) and the SHAP
explainer is module-internal; we want one process-wide instance. First call
takes ~1s; subsequent calls are O(ms).
"""
from __future__ import annotations

from pathlib import Path

from app.config import settings
from app.ai.predictor import MalariaPredictor, PredictionResult

_predictor: MalariaPredictor | None = None


def get_predictor() -> MalariaPredictor:
    """Return the process-wide predictor, lazily constructed."""
    global _predictor
    if _predictor is None:
        _predictor = MalariaPredictor(Path(settings.MODEL_PATH))
    return _predictor


__all__ = ["get_predictor", "MalariaPredictor", "PredictionResult"]
