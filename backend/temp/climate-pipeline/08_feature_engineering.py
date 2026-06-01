"""Stage 8: Feature engineering for the malaria + climate model.

Inputs : outputs/final_processed_df_*EC_with_climate.csv  (60,940 rows total)
Outputs:
  processed/train_ready.parquet     -- all features + target + split column
  processed/feature_manifest.json   -- column groupings
  processed/splits.json             -- row indices per split (sanity dump)
  reports/feature_eda.md            -- missingness, target distribution, top correlations

Design choices (from the plan):
  - target            : Positive count, modeled as log1p(Positive). log_tests acts as
                        the exposure offset.
  - unit              : facility-month (organisationunitid x Period). All 60,940 rows
                        kept (462 ADM3_PCODE-null rows dropped).
  - lag baseline      : 3-month direct lags + 3/6-month rolling, all leak-safe via
                        shift(1) before rolling.
  - anomaly baseline  : computed on train rows only (split = 'train') so test/val
                        carry no information backwards.
  - cold start        : first 3 months per facility flagged is_warm=False; lag NaNs
                        are kept (caller decides drop vs impute).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path("/Users/danielbogale/Documents/second-brain/temp/climate-pipeline")
OUT_DIR = ROOT / "outputs"
PROC_DIR = ROOT / "processed"
REPORT_DIR = ROOT / "reports"
PROC_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

CLIMATE_COLS = ["Rainfall_mm", "AvgTemp_C", "MaxTemp_C", "MinTemp_C", "Humidity_pct"]
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

TRAIN_END   = pd.Timestamp("2024-12-31")
VAL_END     = pd.Timestamp("2025-06-30")
# anything after VAL_END is test; data ends 2026-01-09


def load_all() -> pd.DataFrame:
    files = sorted(OUT_DIR.glob("final_processed_df_*EC_with_climate.csv"))
    print(f"loading {len(files)} files ...")
    frames = []
    for f in files:
        df = pd.read_csv(f)
        df["_src_year"] = f.name.split("_")[3]  # e.g. '2014EC'
        frames.append(df)
    df = pd.concat(frames, ignore_index=True)
    print(f"  total rows: {len(df):,}")
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    # Keep null-ADM3_PCODE rows (3,630 unresolved woredas) -- their climate was
    # imputed in Stage 7 and lat/lon/elevation are present. Anomaly features
    # (which key on ADM3_PCODE) will be NaN for these rows; that's a feature,
    # not a bug -- it tells the model "this row has weaker geography".
    n_unresolved = df["ADM3_PCODE"].isna().sum()
    print(f"  keeping {n_unresolved:,} rows with null ADM3_PCODE (woreda unresolved, climate imputed)")

    df["Positivity_Rate"] = df["Positivity_Rate"].clip(upper=100.0)

    travel_p99 = df["Travel"].quantile(0.99)
    n_winz = (df["Travel"] > travel_p99).sum()
    df["Travel"] = df["Travel"].clip(upper=travel_p99)
    print(f"  winsorized Travel at p99 = {travel_p99:.0f} ({n_winz:,} rows)")

    df["Period_Gregorian_start"] = pd.to_datetime(df["Period_Gregorian_start"])
    df["Period_Gregorian_end"]   = pd.to_datetime(df["Period_Gregorian_end"])
    return df


def add_temporal(df: pd.DataFrame) -> pd.DataFrame:
    g = df["Period_Gregorian_start"]
    df["g_year"]      = g.dt.year
    df["g_month"]     = g.dt.month
    df["g_month_sin"] = np.sin(2 * np.pi * df["g_month"] / 12)
    df["g_month_cos"] = np.cos(2 * np.pi * df["g_month"] / 12)

    # Ethiopian month from "Meskerem 2016" style
    df["ec_month"] = (
        df["Eth_Month_Year"].str.split().str[0].map(EC_MONTHS).astype("Int64")
    )

    anchor = g.min().to_period("M")
    df["month_index"] = (g.dt.to_period("M") - anchor).apply(lambda p: p.n).astype(int)
    return df


def add_climate_lags(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["organisationunitid", "Period_Gregorian_start"]).reset_index(drop=True)
    grp = df.groupby("organisationunitid", sort=False)

    for col in CLIMATE_COLS:
        df[f"{col}_lag1"] = grp[col].shift(1)
        df[f"{col}_lag2"] = grp[col].shift(2)
        df[f"{col}_lag3"] = grp[col].shift(3)
        # rolling on shifted series -- current month not in window (leak-safe)
        shifted = grp[col].shift(1)
        df[f"{col}_roll3_mean"] = shifted.groupby(df["organisationunitid"]).rolling(3, min_periods=1).mean().reset_index(level=0, drop=True)
        df[f"{col}_roll6_mean"] = shifted.groupby(df["organisationunitid"]).rolling(6, min_periods=1).mean().reset_index(level=0, drop=True)

    # rainfall cumulative is biologically meaningful
    shifted_r = grp["Rainfall_mm"].shift(1)
    df["Rainfall_mm_roll3_sum"] = shifted_r.groupby(df["organisationunitid"]).rolling(3, min_periods=1).sum().reset_index(level=0, drop=True)
    return df


def add_target_lags(df: pd.DataFrame) -> pd.DataFrame:
    grp = df.groupby("organisationunitid", sort=False)
    for col in ["Positive", "Tests", "Positivity_Rate"]:
        for k in (1, 2, 3):
            df[f"{col.lower()}_lag{k}"] = grp[col].shift(k)
    df["is_warm"] = df["positive_lag3"].notna()
    return df


def add_anomalies(df: pd.DataFrame) -> pd.DataFrame:
    """Baseline = mean of (ADM3_PCODE, g_month) over TRAIN rows only."""
    train_mask = df["split"] == "train"
    base = (
        df[train_mask]
          .groupby(["ADM3_PCODE", "g_month"])[["Rainfall_mm", "AvgTemp_C"]]
          .mean()
          .rename(columns={"Rainfall_mm": "baseline_rainfall",
                           "AvgTemp_C":   "baseline_avgtemp"})
          .reset_index()
    )
    df = df.merge(base, on=["ADM3_PCODE", "g_month"], how="left")
    df["rainfall_anomaly"] = df["Rainfall_mm"] - df["baseline_rainfall"]
    df["temp_anomaly"]     = df["AvgTemp_C"]   - df["baseline_avgtemp"]
    return df


def add_geo(df: pd.DataFrame) -> pd.DataFrame:
    df["is_highland"] = (df["Elevation_m"] >= 2000).astype(int)
    return df


def add_split(df: pd.DataFrame) -> pd.DataFrame:
    g = df["Period_Gregorian_start"]
    cond = [g <= TRAIN_END, (g > TRAIN_END) & (g <= VAL_END)]
    df["split"] = np.select(cond, ["train", "val"], default="test")
    return df


def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    df = pd.get_dummies(df, columns=["Region"], prefix="region", dtype=int)
    df = pd.get_dummies(df, columns=["climate_source"], prefix="csrc", dtype=int)
    return df


def add_model_target(df: pd.DataFrame) -> pd.DataFrame:
    df["log_positive"] = np.log1p(df["Positive"])
    df["log_tests"]    = np.log1p(df["Tests"])
    return df


def leakage_check(df: pd.DataFrame) -> None:
    """For test rows: every lag/rolling feature must come from <= test row's prior months."""
    test = df[df["split"] == "test"]
    # lag1 of Period_Gregorian_start: prior month must be < current
    df_sorted = df.sort_values(["organisationunitid", "Period_Gregorian_start"])
    prior_start = df_sorted.groupby("organisationunitid")["Period_Gregorian_start"].shift(1)
    bad = ((df_sorted["split"] == "test") & (prior_start >= df_sorted["Period_Gregorian_start"])).sum()
    if bad:
        raise SystemExit(f"leakage check: FAIL ({bad} rows have prior >= current)")
    print(f"  leakage check: PASS (lagged temporal order intact, {len(test):,} test rows)")


def write_manifest(df: pd.DataFrame) -> None:
    region_cols    = sorted([c for c in df.columns if c.startswith("region_")])
    csrc_cols      = sorted([c for c in df.columns if c.startswith("csrc_")])
    climate_lag    = [c for c in df.columns if any(c.startswith(b + "_lag") or c.startswith(b + "_roll") for b in CLIMATE_COLS)]
    target_lag     = [c for c in df.columns if c.startswith(("positive_lag", "tests_lag", "positivity_rate_lag"))]

    numeric = [
        "Latitude", "Longitude", "Elevation_m",
        "MaxTemp_C", "MinTemp_C", "AvgTemp_C", "Rainfall_mm", "Humidity_pct",
        "g_year", "g_month", "g_month_sin", "g_month_cos", "ec_month", "month_index",
        "is_highland", "is_warm",
        "rainfall_anomaly", "temp_anomaly",
        "baseline_rainfall", "baseline_avgtemp",
        "Travel",
    ] + climate_lag + target_lag

    manifest = {
        "target":            "Positive",
        "target_transformed": "log_positive",
        "exposure_offset":   "log_tests",
        "numeric":            sorted(set(numeric)),
        "categorical_low":    region_cols + csrc_cols,
        "categorical_high":  ["Zone", "ADM3_PCODE", "organisationunitid"],
        "leakage_cols":      ["Positive", "Positivity_Rate", "Tests", "log_positive"],
        "id_cols":           ["organisationunitid", "ADM3_PCODE", "Woreda",
                              "Period_Gregorian_start", "Period_Gregorian_end",
                              "Period", "Eth_Month_Year", "_src_year"],
        "split_col":         "split",
        "row_count":         int(len(df)),
        "feature_count":     int(len(numeric) + len(region_cols) + len(csrc_cols) + 3),
    }
    (PROC_DIR / "feature_manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"  wrote feature_manifest.json ({manifest['feature_count']} features)")


def write_splits(df: pd.DataFrame) -> None:
    splits = {s: df.index[df["split"] == s].tolist() for s in ("train", "val", "test")}
    (PROC_DIR / "splits.json").write_text(json.dumps({k: {"n": len(v)} for k, v in splits.items()}, indent=2))
    print(f"  splits: train {len(splits['train']):,} | val {len(splits['val']):,} | test {len(splits['test']):,}")


def write_eda(df: pd.DataFrame) -> None:
    lines: list[str] = []
    lines.append("# Feature Engineering EDA\n")
    lines.append(f"Rows: **{len(df):,}**  |  Columns: **{df.shape[1]}**\n")

    lines.append("## Split sizes\n")
    s = df["split"].value_counts().reindex(["train", "val", "test"])
    lines.append(s.to_markdown())
    lines.append("")

    lines.append("\n## Target (Positive) per split\n")
    g = df.groupby("split")["Positive"].agg(["count", "mean", "median",
                                             lambda x: (x == 0).mean(),
                                             "max"]).rename(
        columns={"<lambda_0>": "zero_frac"})
    lines.append(g.to_markdown())
    lines.append("")

    lines.append("\n## Missingness (top 20 features)\n")
    miss = df.isna().mean().sort_values(ascending=False)
    miss = miss[miss > 0].head(20)
    if len(miss):
        lines.append(miss.to_frame("missing_frac").to_markdown())
    else:
        lines.append("(no missing values)")
    lines.append("")

    lines.append("\n## Top correlations with log_positive (train rows, |r| desc, no leakage)\n")
    train = df[df["split"] == "train"]
    leakage = ["Positive", "log_positive", "Positivity_Rate", "Tests", "log_tests"]
    num = train.select_dtypes(include=[np.number]).drop(columns=leakage, errors="ignore")
    corr = num.corrwith(train["log_positive"])
    corr = corr.dropna().abs().sort_values(ascending=False).head(15)
    lines.append(corr.to_frame("|pearson_r|").to_markdown())
    lines.append("")

    lines.append("\n## climate_source mix per split\n")
    csrc_cols = [c for c in df.columns if c.startswith("csrc_")]
    if csrc_cols:
        mix = df.groupby("split")[csrc_cols].mean().round(3)
        lines.append(mix.to_markdown())

    (REPORT_DIR / "feature_eda.md").write_text("\n".join(lines))
    print(f"  wrote feature_eda.md")


def main() -> None:
    df = load_all()
    df = clean(df)
    df = add_temporal(df)
    df = add_climate_lags(df)
    df = add_target_lags(df)
    df = add_split(df)
    df = add_anomalies(df)
    df = add_geo(df)
    df = add_model_target(df)
    df = encode_categoricals(df)

    leakage_check(df)

    out_path = PROC_DIR / "train_ready.parquet"
    df.to_parquet(out_path, index=False)
    size_mb = out_path.stat().st_size / 1e6
    print(f"\nwrote {out_path}  ({size_mb:.1f} MB, {len(df):,} rows x {df.shape[1]} cols)")

    write_manifest(df)
    write_splits(df)
    write_eda(df)


if __name__ == "__main__":
    main()
