"""Standalone smoke test for the MalariaPredictor.

Matches the existing project test style (a script that hits live components,
not pytest). Loads the model, builds a synthetic district + history, asserts
the prediction has the right shape.

Run:
  python test_predictor.py

Requires only the model artifacts to be present at MODEL_PATH. Does NOT touch
the DB.
"""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path
from types import SimpleNamespace

# bootstrap import path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))


def fake_district(pcode: str = "ET010101", region: str = "Tigray") -> SimpleNamespace:
    return SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        district_code=pcode,
        district_name="Tahtay Adiyabo",
        region=region,
        zone="North Western",
        adm3_pcode=pcode,
        latitude=14.4,
        longitude=37.7,
        elevation_m=1023.0,
    )


def fake_malaria_history(district_id: str, target: date) -> list[SimpleNamespace]:
    """6 months of synthetic history ending the month before `target`."""
    rows = []
    cur = date(target.year, target.month, 1)
    for k in range(6, 0, -1):
        # walk back k months
        m = cur.month - k
        y = cur.year
        while m <= 0:
            m += 12; y -= 1
        rows.append(SimpleNamespace(
            district_id=district_id, year=y, month=m, week=None,
            positive=80 + k * 12, tests=400 + k * 20, travel=5 + k))
    return rows


def fake_climate_history(district_id: str, target: date) -> list[SimpleNamespace]:
    """7 months of climate up to and including `target`."""
    rows = []
    cur = date(target.year, target.month, 1)
    for k in range(6, -1, -1):
        m = cur.month - k
        y = cur.year
        while m <= 0:
            m += 12; y -= 1
        rows.append(SimpleNamespace(
            district_id=district_id, date=date(y, m, 1),
            rainfall=40.0 + k * 5,
            temperature=22.0,
            min_temp=17.0,
            max_temp=27.0,
            humidity=55.0,
            season="kiremt" if m in (6, 7, 8, 9) else "bega",
        ))
    return rows


def main() -> int:
    from app.ai import get_predictor

    predictor = get_predictor()
    print(f"  model version: {predictor.card['version']}")
    print(f"  features: {len(predictor.feats)}; trees: {predictor.main.num_trees()}")

    district = fake_district()
    target = date(2025, 8, 1)
    history = fake_malaria_history(district.id, target)
    climate = fake_climate_history(district.id, target)

    print(f"\n  predicting for {district.district_code} @ {target} ...")
    result = predictor.predict_one(
        district=district,
        target_month=target,
        malaria_history=history,
        climate_history=climate,
        tests_hint=400.0,
        ec_month_name="Hamle",
    )

    print(f"  risk_level:      {result.risk_level}")
    print(f"  prediction_score: {result.prediction_score:.1f}")
    print(f"  confidence_score: {result.confidence_score:.3f}")
    print(f"  is_warm:         {result.is_warm}")
    print(f"  reason:          {result.prediction_reason}")

    # --- assertions --------------------------------------------------------
    assert result.risk_level in ("low", "moderate", "high", "very_high"), \
        f"bad risk_level: {result.risk_level}"
    assert 0.0 <= result.confidence_score <= 1.0, \
        f"confidence out of range: {result.confidence_score}"
    assert result.prediction_score >= 0, "negative prediction"
    assert result.prediction_reason, "empty reason"
    assert result.is_warm is True, "expected warm-path for 6 months of history"

    print("\n  ✓ smoke test PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
