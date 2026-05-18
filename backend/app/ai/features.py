"""Feature builder for inference.

Mirrors the transform in temp/climate-pipeline/08_feature_engineering.py so the
model gets the exact same shape at inference time. The single source of truth
is the column list inside model_card.json (predictor.feats) - this module
must produce values for every name in that list.

Design:
  - Inputs come from DB rows (District, MalariaData history, ClimateData history).
  - Lags are computed by sorting history by date and looking back 1/2/3 months
    relative to target_month.
  - Anomalies use a static (ADM3_PCODE, gregorian_month) baseline loaded from
    `models/regional_baselines.json` (written by scripts/compute_baselines.py).
  - Missing lags / climate are encoded as NaN - LightGBM handles missing natively.
  - is_warm = True when we have at least 3 prior months of MalariaData.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd

CLIMATE_COLS = ["Rainfall_mm", "AvgTemp_C", "MaxTemp_C", "MinTemp_C", "Humidity_pct"]

# Ethiopian month name -> 1..13. Same dict as 08_feature_engineering.py.
EC_MONTHS = {
    "Meskerem": 1,
    "Tikimt": 2, "Tikemt": 2, "Tikemet": 2,
    "Hidar": 3, "Hedar": 3,
    "Tahsas": 4, "Tahesas": 4,
    "Tir": 5, "Ter": 5,
    "Yekatit": 6, "Yakatit": 6,
    "Megabit": 7, "Megabbit": 7,
    "Miazia": 8, "Miyazya": 8,
    "Ginbot": 9, "Genbot": 9,
    "Sene": 10,
    "Hamle": 11,
    "Nehase": 12, "Nahase": 12,
    "Pagume": 13, "Paguemen": 13,
}

# Same anchor month as the pipeline (first row in train_ready was 2021-07-01).
MONTH_INDEX_ANCHOR = pd.Timestamp("2021-07-01").to_period("M")

# Region one-hot columns the model expects (from model_card.json features list).
# Populated lazily on first call by inspecting the booster's feature names.
_REGION_ONEHOTS: list[str] | None = None
_CSRC_ONEHOTS: list[str] = ["csrc_direct", "csrc_imp_r_m", "csrc_imp_z_m"]


@dataclass
class FeatureContext:
    """Bag of pre-loaded lookups; built once at predictor init."""
    baselines: dict          # {"by_pcode_month": {"ET010101:5": {"rainfall": ..., "avgtemp": ...}}, "by_region_month": {...}, "global_month": {...}}
    feature_order: list[str]  # exact column order from model_card.json["features"]
    cold_feature_order: list[str]

    @classmethod
    def load(cls, model_dir: Path) -> "FeatureContext":
        card = json.loads((model_dir / "model_card.json").read_text())
        baselines_path = model_dir / "regional_baselines.json"
        baselines = json.loads(baselines_path.read_text()) if baselines_path.exists() else {
            "by_pcode_month": {}, "by_region_month": {}, "global_month": {},
        }
        return cls(
            baselines=baselines,
            feature_order=card["features"],
            cold_feature_order=card.get("cold_start_features", []),
        )


# ---------------------------------------------------------------------------
# Helpers - match 08_feature_engineering.py semantics
# ---------------------------------------------------------------------------
def month_index(target: date) -> int:
    return (pd.Timestamp(target).to_period("M") - MONTH_INDEX_ANCHOR).n


def gregorian_to_season(month: int) -> str:
    # Ethiopian seasons (matches CLAUDE.md domain glossary)
    if month in (10, 11, 12, 1):
        return "bega"
    if month in (2, 3, 4, 5):
        return "belg"
    return "kiremt"  # Jun-Sep


def month_offset(d: date, months: int) -> date:
    """Subtract `months` calendar months from `d` (always returns the 1st)."""
    p = pd.Timestamp(d).to_period("M") - months
    return p.to_timestamp().date()


def _shift_value(series_by_date: dict[date, float], target: date, months_back: int) -> float | None:
    key = month_offset(target, months_back)
    return series_by_date.get(key)


def _rolling_window(series_by_date: dict[date, float], target: date,
                    months_back_start: int, window: int, op: str = "mean") -> float | None:
    """Compute rolling stat over [target - (start+window-1), target - start]."""
    vals: list[float] = []
    for k in range(months_back_start, months_back_start + window):
        v = series_by_date.get(month_offset(target, k))
        if v is not None and not pd.isna(v):
            vals.append(v)
    if not vals:
        return None
    if op == "sum":
        return float(np.sum(vals))
    return float(np.mean(vals))


# ---------------------------------------------------------------------------
# Build feature dict
# ---------------------------------------------------------------------------
def build_features(
    *,
    district,                       # ORM District
    target_month: date,             # first-of-month, Gregorian
    malaria_history: Iterable,      # ORM MalariaData rows (any order)
    climate_history: Iterable,      # ORM ClimateData rows including target_month
    tests_hint: float,              # exposure proxy (median of last 3 months' Tests or regional median)
    ec_month_name: str | None,      # e.g. "Meskerem"; if None we don't fill ec_month
    region_label: str,              # used for region_<name> one-hot
    climate_source_label: str = "direct",  # 'direct' | 'imp_r_m' | 'imp_z_m'
    ctx: FeatureContext,
) -> tuple[dict, bool]:
    """Return (feature_dict, is_warm). Missing features come back as NaN."""
    # --- Climate series keyed by date ---------------------------------------
    by_date: dict[str, dict[date, float]] = {c: {} for c in CLIMATE_COLS}
    target_row: dict[str, float] = {}
    for c in climate_history:
        d = c.date if isinstance(c.date, date) else pd.Timestamp(c.date).date()
        d = d.replace(day=1)
        by_date["Rainfall_mm"][d]  = float(c.rainfall) if c.rainfall is not None else np.nan
        by_date["AvgTemp_C"][d]    = float(c.temperature) if c.temperature is not None else np.nan
        by_date["MaxTemp_C"][d]    = float(c.max_temp) if getattr(c, "max_temp", None) is not None else np.nan
        by_date["MinTemp_C"][d]    = float(c.min_temp) if getattr(c, "min_temp", None) is not None else np.nan
        by_date["Humidity_pct"][d] = float(c.humidity) if getattr(c, "humidity", None) is not None else np.nan
        if d == target_month:
            target_row = {col: by_date[col][d] for col in CLIMATE_COLS}

    # --- Malaria history series ---------------------------------------------
    pos_by, tests_by, rate_by = {}, {}, {}
    for m in malaria_history:
        d = date(m.year, m.month, 1)
        pos_by[d] = float(m.cases or 0)
        # MalariaData doesn't carry Tests in this schema; treat absent as same as cases path.
        # Use tests_hint for current row; lag/roll will be NaN unless model has access to a Tests-style series.
        # For seeded historic data, we'll populate a richer history (see scripts/seed_malaria_history.py if added later).
        tests_by[d] = float(getattr(m, "tests", 0) or 0) or tests_hint
        rate_by[d]  = (pos_by[d] / tests_by[d] * 100.0) if tests_by[d] > 0 else 0.0

    f: dict[str, float] = {}

    # --- Direct climate values (target month) -------------------------------
    for c in CLIMATE_COLS:
        f[c] = target_row.get(c, np.nan)

    # --- Lags / rolling on climate (leak-safe: only past months) ------------
    for c in CLIMATE_COLS:
        f[f"{c}_lag1"] = _shift_value(by_date[c], target_month, 1)
        f[f"{c}_lag2"] = _shift_value(by_date[c], target_month, 2)
        f[f"{c}_lag3"] = _shift_value(by_date[c], target_month, 3)
        f[f"{c}_roll3_mean"] = _rolling_window(by_date[c], target_month, 1, 3, "mean")
        f[f"{c}_roll6_mean"] = _rolling_window(by_date[c], target_month, 1, 6, "mean")
    f["Rainfall_mm_roll3_sum"] = _rolling_window(by_date["Rainfall_mm"], target_month, 1, 3, "sum")

    # --- Anomaly vs (ADM3_PCODE, month) baseline (train-window means) -------
    pcode = district.adm3_pcode or district.district_code
    g_month = target_month.month
    base = (ctx.baselines.get("by_pcode_month", {}).get(f"{pcode}:{g_month}")
            or ctx.baselines.get("by_region_month", {}).get(f"{district.region}:{g_month}")
            or ctx.baselines.get("global_month", {}).get(str(g_month)))
    if base:
        f["baseline_rainfall"] = base.get("rainfall", np.nan)
        f["baseline_avgtemp"]  = base.get("avgtemp", np.nan)
        if not pd.isna(f.get("Rainfall_mm", np.nan)) and not pd.isna(f["baseline_rainfall"]):
            f["rainfall_anomaly"] = f["Rainfall_mm"] - f["baseline_rainfall"]
        else:
            f["rainfall_anomaly"] = np.nan
        if not pd.isna(f.get("AvgTemp_C", np.nan)) and not pd.isna(f["baseline_avgtemp"]):
            f["temp_anomaly"] = f["AvgTemp_C"] - f["baseline_avgtemp"]
        else:
            f["temp_anomaly"] = np.nan
    else:
        f["baseline_rainfall"] = np.nan
        f["baseline_avgtemp"]  = np.nan
        f["rainfall_anomaly"]  = np.nan
        f["temp_anomaly"]      = np.nan

    # --- Autoregressive target lags -----------------------------------------
    for k in (1, 2, 3):
        prev = month_offset(target_month, k)
        f[f"positive_lag{k}"]        = pos_by.get(prev)
        f[f"tests_lag{k}"]           = tests_by.get(prev)
        f[f"positivity_rate_lag{k}"] = rate_by.get(prev)

    is_warm = all(f.get(f"positive_lag{k}") is not None for k in (1, 2, 3))
    f["is_warm"] = 1 if is_warm else 0

    # --- Geography ----------------------------------------------------------
    f["Latitude"]    = district.latitude if district.latitude is not None else np.nan
    f["Longitude"]   = district.longitude if district.longitude is not None else np.nan
    f["Elevation_m"] = district.elevation_m if district.elevation_m is not None else np.nan
    f["is_highland"] = 1 if (district.elevation_m or 0) >= 2000 else 0

    # --- Temporal -----------------------------------------------------------
    f["g_year"]      = target_month.year
    f["g_month"]     = g_month
    f["g_month_sin"] = float(np.sin(2 * np.pi * g_month / 12))
    f["g_month_cos"] = float(np.cos(2 * np.pi * g_month / 12))
    f["ec_month"]    = EC_MONTHS.get(ec_month_name) if ec_month_name else np.nan
    f["month_index"] = month_index(target_month)

    # --- Travel: not available at inference time (would require a feed).
    #     The model trained on Travel; we pass 0 (median is 0 anyway, 58.8% zeros).
    f["Travel"] = 0.0

    # --- Categoricals (raw) -------------------------------------------------
    f["Zone"]               = district.zone
    f["ADM3_PCODE"]         = district.adm3_pcode or district.district_code
    f["organisationunitid"] = district.adm3_pcode or district.district_code  # facility-less inference

    # --- Region one-hots: emit only the matching column to True ------------
    for col in ctx.feature_order:
        if col.startswith("region_"):
            label = col.removeprefix("region_")
            f[col] = 1 if label == region_label else 0

    # --- Climate-source one-hots -------------------------------------------
    for col in _CSRC_ONEHOTS:
        f[col] = 1 if col == f"csrc_{climate_source_label}" else 0

    return f, is_warm


def to_dataframe(feature_dict: dict, feature_order: list[str]) -> pd.DataFrame:
    """Coerce the dict to a 1-row DataFrame with exactly the expected column order.

    LightGBM only accepts int/float/bool/category dtypes; raw None values land
    as `object`. Cast everything that isn't a declared categorical to float
    (NaN-friendly) so missing values flow through LightGBM's native missing
    handling.
    """
    row = {col: feature_dict.get(col, np.nan) for col in feature_order}
    df = pd.DataFrame([row], columns=feature_order)
    cat_cols = {"Zone", "ADM3_PCODE", "organisationunitid"}
    for col in df.columns:
        if col in cat_cols:
            df[col] = df[col].astype("category")
        else:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df
