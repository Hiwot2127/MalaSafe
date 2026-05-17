# `backend/models/` — trained model artifacts

Everything the predictor reads at startup. ~11 MB total; small enough to live in
git (no LFS). Do not edit by hand — replace as a set after retraining.

## What's in this directory

| File | Size | Source | Purpose |
|---|---|---|---|
| `lightgbm_main.txt` | 3.1 MB | climate-pipeline Stage 9 | Main Poisson booster — predicts case count |
| `lightgbm_q10.txt` | 2.7 MB | climate-pipeline Stage 9 | Quantile α=0.1, lower edge of confidence interval |
| `lightgbm_q90.txt` | 2.7 MB | climate-pipeline Stage 9 | Quantile α=0.9, upper edge of confidence interval |
| `lightgbm_coldstart.txt` | 2.1 MB | climate-pipeline Stage 9 | Fallback for facilities with no case history |
| `risk_thresholds.json` | 108 KB | climate-pipeline Stage 9 | Per-woreda p50/p75/p95 cutoffs for risk binning |
| `model_card.json` | 8 KB | climate-pipeline Stage 9 | Version, training metrics, feature list, gates |
| `regional_baselines.json` | 808 KB | `scripts/compute_baselines.py` | Per-(P-code, month) climate means for anomaly features |
| `README.md` | — | this file | — |

## `model_card.json` schema

```json
{
  "version": "v1.0.0",
  "trained_at": "2026-05-17T...",
  "input": "...train_ready.parquet",
  "rows": {"train": 46536, "val": 6648, "test": 7756},
  "features": ["Latitude", "Longitude", ...],   // EXACT column order the boosters expect
  "categorical_high": ["Zone", "ADM3_PCODE", "organisationunitid"],
  "cold_start_features": [...],                  // subset used by lightgbm_coldstart
  "metrics": {
    "rmse": 182.75, "mae": 65.70, "mape": 53.4,
    "pearson_log": 0.977, "spearman": 0.982,
    "n_test": 7756, "n_warm": 7756, "n_cold": 0
  },
  "gates": {"pass_spearman": true, "pass_climate_top5": false},
  "dependencies": {"lightgbm": "4.3.0", "pandas": "2.1.4", "numpy": "1.26.3"},
  "notes": [...]                                 // caveats: MaxTemp/MinTemp proxy, etc.
}
```

The `features` list is the **canonical column order** the predictor passes to `booster.predict()`. Both `app/ai/features.py` (inference) and `08_feature_engineering.py` (training) must produce exactly this set in exactly this order.

## `risk_thresholds.json` shape

```json
{
  "_meta": {"woreda_count": 780, "region_fallback_count": 118, "global_fallback_count": 0},
  "by_pcode":  {"ET010101": {"p50": 38.0, "p75": 208.0, "p95": 1530.0, "source": "woreda"}, ...},
  "by_region": {"Tigray":   {"p50": 22.0, "p75": 130.0, "p95": 940.0,  "source": "region"}, ...},
  "global":    {"p50": 38.0, "p75": 208.0, "p95": 1530.0, "source": "global"}
}
```

Lookup order in the predictor: `by_pcode[district_code]` → `by_region[district.region]` → `global`. Risk binning:

| Prediction vs. cutoff | `risk_level` |
|---|---|
| ≤ p50 | `low` |
| p50 < pred ≤ p75 | `moderate` |
| p75 < pred ≤ p95 | `high` |
| > p95 | `very_high` |

## `regional_baselines.json` — special case

This file is **not** produced by the trainer. It's generated against the live
DB by `scripts/compute_baselines.py`:

```bash
./venv/bin/python scripts/compute_baselines.py
```

Regenerate it whenever:
- the set of districts changes (Alembic 002 added new woredas)
- the climate-history window shifts (new EC year added)
- you want anomaly features to recalibrate against a longer train window

Schema:
```json
{
  "_meta": {"train_window_end": "2024-12-31", "by_pcode_month_n": 10776, ...},
  "by_pcode_month":  {"ET010101:5": {"rainfall": 89.4, "avgtemp": 23.1}, ...},
  "by_region_month": {"Tigray:5":   {"rainfall": 76.1, "avgtemp": 22.8}, ...},
  "global_month":    {"5":          {"rainfall": 84.7, "avgtemp": 22.5}, ...}
}
```

If this file is missing, the predictor still works but `rainfall_anomaly` /
`temp_anomaly` will be NaN for every row (LightGBM handles missing natively, so
predictions degrade gracefully).

## Updating after retraining

```bash
# In the climate-pipeline workspace
cd ~/Documents/second-brain/temp/climate-pipeline
.venv/bin/python 09_train_model.py

# Copy artifacts back (overwrites this directory)
cp models/lightgbm_*.txt models/risk_thresholds.json models/model_card.json \
   ~/Documents/Lili/MalaSafe/backend/models/

# Regenerate baselines against the current DB
cd ~/Documents/Lili/MalaSafe/backend
./venv/bin/python scripts/compute_baselines.py

# Restart the API to load the new boosters
```

The predictor logs the version on first invocation:
`[predictor] loaded v1.0.0: 76 feats, 320 trees`.

## Why these are in git (not LFS)

- Total ~11 MB. Well under GitHub's 100 MB per-file limit and 1 GB repo soft limit.
- A fresh clone gets a working predictor with zero extra steps.
- Git LFS adds setup overhead, a paid bandwidth quota, and confuses CI builds.
- Trade-off revisit: if we ever ship 5+ model versions in one repo, switch to LFS.
