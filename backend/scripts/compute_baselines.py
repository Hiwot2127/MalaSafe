"""Compute climatological baselines for anomaly features.

Reads climate_per_woreda_monthly.csv (the long table from Stage 4), computes
mean rainfall and avg temp per (ADM3_PCODE, gregorian_month) over the TRAIN
window only (2021-07 -> 2024-12, mirroring 08_feature_engineering.py), and
writes models/regional_baselines.json. The predictor's features module reads
this file at startup.

Three levels of lookup are written so inference always finds *something*:
  - by_pcode_month   "ETxxxxxx:M"
  - by_region_month  "Region Name:M"
  - global_month     "M"

Usage:
  python scripts/compute_baselines.py
"""
from __future__ import annotations

import json
from datetime import date

import pandas as pd

from _common import cli_argparser, SEED_DATA_DIR
from seed_climate_history import ec_to_gregorian

CLIMATE_CSV = SEED_DATA_DIR / "climate-pipeline" / "processed" / "climate_per_woreda_monthly.csv"
GEO_CSV = SEED_DATA_DIR / "reference-geo-name" / "reference_geo_names.csv"

# Sit alongside the other model artifacts. _common.py adds BACKEND_ROOT to sys.path.
from _common import BACKEND_ROOT
OUT_PATH = BACKEND_ROOT / "models" / "regional_baselines.json"

TRAIN_END = date(2024, 12, 31)


def main() -> None:
    args = cli_argparser("compute_baselines").parse_args()

    print(f"reading {CLIMATE_CSV.name} ...")
    df = pd.read_csv(CLIMATE_CSV)
    df["date"] = df["Eth_Month_Year"].apply(ec_to_gregorian)
    df = df.dropna(subset=["date"]).copy()
    df["g_month"] = df["date"].apply(lambda d: d.month)

    # train rows only
    train = df[df["date"].apply(lambda d: d <= TRAIN_END)].copy()
    print(f"train rows: {len(train):,} / {len(df):,}")

    # Region lookup
    geo = pd.read_csv(GEO_CSV)
    pcode_to_region = dict(zip(geo["ADM3_PCODE"], geo["region"]))
    train["region"] = train["ADM3_PCODE"].map(pcode_to_region)

    # --- by (ADM3_PCODE, g_month) ------------------------------------------
    g_w = train.groupby(["ADM3_PCODE", "g_month"]).agg(
        rainfall=("Rainfall_mm", "mean"),
        avgtemp=("AvgTemp_C", "mean"),
    ).reset_index()
    by_pcode_month = {
        f"{row.ADM3_PCODE}:{int(row.g_month)}": {
            "rainfall": round(float(row.rainfall), 2),
            "avgtemp":  round(float(row.avgtemp), 2),
        }
        for row in g_w.itertuples()
    }

    # --- by (region, g_month) ----------------------------------------------
    g_r = train.dropna(subset=["region"]).groupby(["region", "g_month"]).agg(
        rainfall=("Rainfall_mm", "mean"),
        avgtemp=("AvgTemp_C", "mean"),
    ).reset_index()
    by_region_month = {
        f"{row.region}:{int(row.g_month)}": {
            "rainfall": round(float(row.rainfall), 2),
            "avgtemp":  round(float(row.avgtemp), 2),
        }
        for row in g_r.itertuples()
    }

    # --- by g_month (global) -----------------------------------------------
    g_g = train.groupby("g_month").agg(
        rainfall=("Rainfall_mm", "mean"),
        avgtemp=("AvgTemp_C", "mean"),
    ).reset_index()
    global_month = {
        str(int(row.g_month)): {
            "rainfall": round(float(row.rainfall), 2),
            "avgtemp":  round(float(row.avgtemp), 2),
        }
        for row in g_g.itertuples()
    }

    payload = {
        "_meta": {
            "train_window_end": TRAIN_END.isoformat(),
            "by_pcode_month_n": len(by_pcode_month),
            "by_region_month_n": len(by_region_month),
            "global_month_n": len(global_month),
        },
        "by_pcode_month": by_pcode_month,
        "by_region_month": by_region_month,
        "global_month": global_month,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2))
    print(f"wrote {OUT_PATH}")
    print(f"  by_pcode_month:  {len(by_pcode_month):,}")
    print(f"  by_region_month: {len(by_region_month):,}")
    print(f"  global_month:    {len(global_month):,}")


if __name__ == "__main__":
    main()
