# `app/ai/` — malaria risk predictor

Exposes a process-wide singleton that loads four trained LightGBM boosters at
startup and returns `(risk_level, prediction_score, confidence_score,
prediction_reason)` for any `(District, target_month)` pair the FastAPI app
asks about.

## Module layout

| File | Role |
|---|---|
| `__init__.py` | `get_predictor()` lazy singleton; first call ≈ 1s, subsequent ≈ 5ms |
| `predictor.py` | `MalariaPredictor` class — load + `predict_one(...)` |
| `features.py` | Builds the exact 76-column feature vector the boosters expect from DB rows |
| `phrasebook.py` | Maps SHAP feature contributions to human-readable phrases for `prediction_reason` |

## Why four boosters

| Booster file | Objective | Purpose |
|---|---|---|
| `lightgbm_main.txt` | Poisson, `init_score=log(Tests+1)` | Predicts the case count |
| `lightgbm_q10.txt` | Quantile, α=0.1 | 10th-percentile sibling for confidence interval |
| `lightgbm_q90.txt` | Quantile, α=0.9 | 90th-percentile sibling for confidence interval |
| `lightgbm_coldstart.txt` | Poisson, no target lags | Fallback when fewer than 3 months of case history exist |

A single regressor only emits a point estimate. The `q10`/`q90` pair gives an 80% prediction interval; we convert its width to `confidence_score ∈ [0, 1]`. The cold-start variant exists so a new facility (or the first 3 months of any series at forward-prediction time) still gets a usable answer instead of NaN.

## Critical contract: `features.py` mirrors the training-side transform

The columns produced here must match — name-for-name and dtype-for-dtype — what `temp/climate-pipeline/08_feature_engineering.py` produced when the model was trained. The source of truth is `models/model_card.json["features"]`. If you change one side without changing the other, predictions silently drift.

Lag/rolling features use prior months only (leak-safe). Anomalies key on `(ADM3_PCODE, month)` against the baselines in `models/regional_baselines.json` (computed from the train window).

## How to retrain

The trainer lives in a separate workspace (`temp/climate-pipeline/`). After a successful retrain there:

1. Copy the new boosters + thresholds + model card into `backend/models/` (overwrite).
2. Regenerate baselines: `python backend/scripts/compute_baselines.py`.
3. Restart the API. The predictor reads `model_card.json["version"]` at boot and prints it.

The current model card describes test-set Spearman r 0.982, MAE 65.7 cases. See `backend/models/README.md` for the full metric snapshot.

## Pointers

- Artifact details and JSON shapes — `backend/models/README.md`
- Bring-it-online checklist — `AI_INTEGRATION_NOTES.md` (repo root)
- Standalone smoke test (no DB) — `backend/test_predictor.py`
