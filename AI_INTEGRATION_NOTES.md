# AI integration - what's wired and how to bring it online

This file describes the LightGBM malaria-risk predictor that was added to the
backend. It's intentionally separate from the historical `*_COMPLETE.md` docs:
those describe the pre-AI surveillance system. This one is forward-looking.

## What was added

### Backend

- `app/ai/__init__.py`, `predictor.py`, `features.py`, `phrasebook.py` -
  loads 4 LightGBM boosters + risk thresholds + climatological baselines,
  exposes a `MalariaPredictor` singleton via `get_predictor()`.
- `app/services/prediction_service.py` - bridges the predictor and the
  `predictions` table (idempotent upsert, alert raise on `high`/`very_high`).
- `app/schemas/predictions.py` - request/response models for generate endpoints.
- `app/routes/predictions.py` - adds `POST /predictions/generate` (admin/MOH/EPHI)
  and `POST /predictions/generate-batch` (admin/MOH, returns 202 + background).
- `app/tasks/{monthly_close,predict_monthly}.py` - in-process orchestrator
  (close pipeline: backtest → drift → predict) plus the monthly batch
  predictor. Dispatched via `asyncio.create_task` on uploads and triggered
  on demand by `POST /api/v1/monthly-close/predict-monthly`. No Celery, no
  Redis — scheduled runs come from external cron (Render Cron Jobs or
  GitHub Actions) on the 5th of each month.
- `alembic/versions/002_extend_for_ml.py` - adds geo columns to `districts`,
  full-set climate columns to `climate_data`, and a unique constraint on
  `(district_id, prediction_date)` so backfill is idempotent.
- `app/models/{district,climate_data}.py` - ORM updates to mirror the migration.
- `requirements.txt` - adds `lightgbm==4.3.0`, `pyarrow==15.0.0`.

### Scripts

- `scripts/seed_districts.py` - populates `districts` from
  `reference_geo_names.csv` + climate-CSV centroids (no GDAL needed).
- `scripts/seed_climate_history.py` - populates `climate_data` from
  `climate_per_woreda_monthly.csv`. Converts EC dates to Gregorian inline.
- `scripts/compute_baselines.py` - writes `models/regional_baselines.json` (used by
  the predictor for anomaly features).
- `scripts/backfill_predictions.py` - runs the model over every
  (district, month) in 2021-07..2026-01.
- `test_predictor.py` - standalone smoke test (no DB needed).

### Model artifacts

In `backend/models/`:
- `lightgbm_main.txt` (Poisson, 3.1 MB)
- `lightgbm_q10.txt`, `lightgbm_q90.txt` (quantile regressors for confidence interval)
- `lightgbm_coldstart.txt` (no-lag fallback for new facilities)
- `risk_thresholds.json` (per-woreda p50/p75/p95 cutoffs)
- `model_card.json` (version, training metrics, feature list)
- `regional_baselines.json` - produced by `compute_baselines.py`, **not yet present**

Training metrics (test set):
- Spearman r = 0.982
- Pearson r (log) = 0.977
- MAE = 65.7 cases (test mean = 339)
- Decile calibration within ±15% per bin
- Per-region MAE all within 2.3× median

Full report: `temp/climate-pipeline/reports/model_report.md` (in the
`second-brain` workspace, not this repo).

---

## Bring-it-online checklist

Assumes you're in `backend/` with `venv` activated.

```bash
# 1. Install new deps (lightgbm + pyarrow)
pip install -r requirements.txt

# 2. Apply schema migration
alembic upgrade head

# 3. Seed districts (1,082 woredas)
python scripts/seed_districts.py
# expect: "done: inserted 1082, updated 0"

# 4. Seed climate history (~48,000 rows)
python scripts/seed_climate_history.py
# expect: "done: inserted ~48,000, skipped ..."

# 5. Compute regional baselines for the predictor
python scripts/compute_baselines.py
# writes backend/models/regional_baselines.json

# 6. Smoke test the predictor (no DB)
python test_predictor.py
# expect: "✓ smoke test PASS"

# 7. Backfill historic predictions (~49,000 rows; takes a few minutes)
python scripts/backfill_predictions.py
# or test smaller first:
python scripts/backfill_predictions.py --limit 10 --start 2025-01-01 --end 2025-04-01

# 8. Start the API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 9. Smoke-test the live endpoint (use a valid admin JWT)
curl -X POST http://localhost:8000/api/v1/predictions/generate \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"district_id": "<uuid-from-districts-table>", "target_month": "2025-08-01"}'

# 10. (Optional) Trigger the monthly forward predictions
# Manually (any time), with a valid admin JWT:
curl -X POST http://localhost:8000/api/v1/monthly-close/predict-monthly \
  -H "Authorization: Bearer $ADMIN_JWT"
# For production: schedule the same call from Render Cron Jobs or GitHub
# Actions on the 5th of each month. There is no embedded scheduler.
```

After step 7, open `http://localhost:3000/dashboard` and the analytics /
maps / alerts pages will show populated data.

---

## Where the seed data lives

The seed scripts read from the climate-pipeline workspace in
`second-brain/temp/climate-pipeline/`. Path is hard-coded via
`scripts/_common.py:SEED_DATA_DIR`. Override with the env var `SEED_DATA_DIR`
if you move the data:

```bash
export SEED_DATA_DIR=/path/to/temp
python scripts/seed_districts.py
```

To deploy MalaSafe to a server **without** second-brain present, copy these
three files into the repo (e.g. under `backend/seed_data/`):

- `temp/reference-geo-name/reference_geo_names.csv`
- `temp/climate-pipeline/processed/climate_per_woreda_monthly.csv`
- `temp/climate-pipeline/processed/feature_manifest.json` (optional, for audit)

Then point `SEED_DATA_DIR` at `backend/seed_data/`.

---

## Known caveats (mirrored in `model_card.json`)

1. **MaxTemp / MinTemp are AvgTemp ± 5°C** - monthly-means path; daily extremes
   not used. Acceptable for monthly predictions; revisit if predicting weekly.
2. **6% of training rows had imputed climate** - flagged via `csrc_*` one-hot.
   Model has learned to weight those rows slightly less.
3. **Cold-start sub-model** is used when fewer than 3 months of history exist
   for a district. First 3 months of any new facility's predictions are cold.
4. **Forward predictions use climatological normals** for the target month's
   climate (since the future is unknown). Anomaly years will be
   systematically missed. Stage 12 candidate: ERA5T near-real-time integration.
5. **Travel feature** isn't available at inference (no live data feed); we
   pass 0 (median value, 58.8% of training rows were 0).
6. **MalariaData.tests column missing** - the existing schema only stores
   `cases`. The predictor uses a regional median fallback for the exposure
   offset, which slightly biases the prediction toward regional means.

---

## Failure modes to watch

| Symptom | Cause | Fix |
|---|---|---|
| `MODEL_PATH` not found at startup | env not set, models dir empty | check `.env`, confirm 6 files in `backend/models/` |
| `regional_baselines.json` missing → bland predictions, no anomaly signal | step 5 not run | `python scripts/compute_baselines.py` |
| `risk_level` always "moderate" | per-pcode threshold lookup failing → falling back to global | confirm `seed_districts.py` ran first (predictor reads `district.adm3_pcode`) |
| Backfill very slow (>30 min) | most rows being persisted one-at-a-time | the script commits in batches of 500; if still slow, lower `HISTORY_WINDOW_MONTHS` in `prediction_service.py` |
| Monthly close stuck in `pending` | the in-process task crashed or never started | re-dispatch with `POST /api/v1/monthly-close/{id}/run` (admin only); check server logs for the original failure |
| Scheduled forward predictions not appearing | external cron not configured | hit `POST /api/v1/monthly-close/predict-monthly` manually, then verify the Render Cron Job / GitHub Actions workflow is enabled |

---

## File map

```
backend/
├── alembic/versions/002_extend_for_ml.py           NEW
├── app/
│   ├── ai/
│   │   ├── __init__.py                              MODIFIED (was empty stub)
│   │   ├── features.py                              NEW
│   │   ├── phrasebook.py                            NEW (copied from climate-pipeline)
│   │   └── predictor.py                             NEW
│   ├── models/
│   │   ├── district.py                              MODIFIED (+4 cols)
│   │   └── climate_data.py                          MODIFIED (+3 cols)
│   ├── routes/
│   │   └── predictions.py                           MODIFIED (+2 endpoints)
│   ├── schemas/
│   │   └── predictions.py                           NEW
│   ├── services/
│   │   └── prediction_service.py                    NEW
│   └── tasks/
│       ├── __init__.py                              NEW
│       ├── monthly_close.py                         NEW (in-process close orchestrator)
│       └── predict_monthly.py                       NEW (monthly batch predictor)
├── models/                                          NEW DIR
│   ├── lightgbm_main.txt
│   ├── lightgbm_q10.txt
│   ├── lightgbm_q90.txt
│   ├── lightgbm_coldstart.txt
│   ├── risk_thresholds.json
│   ├── model_card.json
│   └── regional_baselines.json   ← produced by compute_baselines.py
├── scripts/                                         NEW DIR
│   ├── _common.py
│   ├── seed_districts.py
│   ├── seed_climate_history.py
│   ├── compute_baselines.py
│   └── backfill_predictions.py
├── test_predictor.py                                NEW
└── requirements.txt                                 MODIFIED (+lightgbm, +pyarrow)
```
