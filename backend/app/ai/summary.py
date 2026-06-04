"""Compose a one-line, plain-language headline for a prediction.

Shared by the predictor (PredictionResult.summary), alert messages, and PDF
reports so the wording is identical everywhere. Mirrors the frontend
`buildSummary()` in prediction-explanation-card.tsx — keep the two in sync.

Example: "High risk, driven by heavy rain 3 months ago and high positivity
last month."
"""
from __future__ import annotations

_RISK_WORD = {
    "very_high": "Very high",
    "high": "High",
    "moderate": "Moderate",
    "low": "Low",
}


def summarize(risk_level: str, factors: list[dict] | None) -> str:
    """Build the headline from a risk level + the stored factor list.

    Picks the factors pushing in the same direction as the risk (the drivers
    that explain *why* it's high — or why it's low), so the sentence reads as a
    cause rather than a contradiction. Falls back to "<Risk> risk." when there
    are no displayable drivers (e.g. cold-start predictions).
    """
    word = _RISK_WORD.get(risk_level, str(risk_level).replace("_", " ").capitalize())
    factors = factors or []
    if not factors:
        return f"{word} risk."

    elevated = risk_level in ("high", "very_high", "moderate")
    want = "increase" if elevated else "decrease"
    aligned = [f for f in factors if f.get("direction") == want] or factors
    drivers = [f.get("label", "") for f in aligned[:2] if f.get("label")]
    if not drivers:
        return f"{word} risk."

    phrase = " and ".join(drivers) if len(drivers) == 2 else drivers[0]
    connector = "driven by" if elevated else "with"
    return f"{word} risk, {connector} {phrase}."
