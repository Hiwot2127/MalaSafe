# `backend/scripts/` — operator CLIs for seeding and backfilling

Idempotent command-line tools that populate the DB from the climate-pipeline
workspace and run the predictor over historical months. All scripts accept
`--dry-run`, `--force`, and `--limit N`.

## Bring-it-online order (run once, in this exact order)

| Step | Command | What it does | Expected outcome |
|---|---|---|---|
| 1 | `alembic upgrade head` | Applies schema migrations 001 + 002 | `\d districts` shows `adm3_pcode`, `latitude`, `longitude`, `elevation_m`; `\d climate_data` shows `min_temp`, `max_temp`, `humidity` |
| 2 | `python scripts/seed_districts.py` | Loads 1,082 woredas from `reference_geo_names.csv` + climate centroids | `inserted 1082, updated 0` |
| 3 | `python scripts/seed_climate_history.py` | Loads 49,390 climate rows (55 months × 898 woredas) | `inserted 49390, skipped 0` |
| 4 | `python scripts/seed_malaria_history.py` | Loads 49,390 aggregated woreda-month case rows | `inserted 49390, skipped 0` |
| 5 | `python scripts/compute_baselines.py` | Writes `models/regional_baselines.json` (10,776 entries) | File present at `backend/models/regional_baselines.json` |
| 6 | `python test_predictor.py` | Standalone smoke test (no DB) | `✓ smoke test PASS` |
| 7 | `python scripts/backfill_predictions.py` | Runs predictor over full historic window (~10 min) | `wrote ≈59,000 predictions` |

Steps 2–4 each take a minute or two locally and 5–15 minutes against a remote
Supabase. Step 7 takes ~10 minutes locally and 30–60 minutes against Supabase
(network round-trips per prediction). Run a tiny sanity backfill first:

```bash
python scripts/backfill_predictions.py --limit 10 --start 2025-06-01 --end 2025-09-01
```

## Per-script reference

### `seed_districts.py`

- **Reads**: `reference_geo_names.csv` (1,082 rows) + `climate_per_woreda_monthly.csv` (for lat/lon/elevation centroids, no GDAL needed)
- **Writes**: `districts` table — upserts on `district_code = ADM3_PCODE`
- **Idempotent**: yes (unique constraint on `district_code`)
- **Note**: 82 woredas have no lat/lon (post-2021 splits with no climate centroids); they're inserted with NULL geo and won't render as map markers

### `seed_climate_history.py`

- **Reads**: `climate_per_woreda_monthly.csv` (49,390 rows)
- **Writes**: `climate_data` table — one row per (district, month-start-date)
- **Idempotent**: yes (skips existing (district_id, date) pairs unless `--force`)
- **Date handling**: converts EC strings ("Meskerem 2016") to Gregorian month-start dates inline using the same EC dict as `08_feature_engineering.py`

### `seed_malaria_history.py`

- **Reads**: 5 files matching `final_processed_df_*EC_with_climate.csv` (60,940 facility-month rows)
- **Aggregates**: sum of `Positive` per `(ADM3_PCODE, year, month)` — drops to 49,390 woreda-month rows
- **Writes**: `malaria_data` table with `source_type = 'historical_seed'`
- **Idempotent**: yes (`--force` truncates rows tagged `historical_seed` first)
- **Caveat**: MalariaData schema has no `tests` column, so `cases = sum(Positive)`, `deaths = 0`. The predictor's exposure-offset uses a regional median fallback at inference time.

### `compute_baselines.py`

- **Reads**: `climate_per_woreda_monthly.csv` + `reference_geo_names.csv` (region lookup)
- **Filters**: train window only (`date ≤ 2024-12-31`) — matches Stage 8 anomaly baselines
- **Writes**: `backend/models/regional_baselines.json` with three lookup tables (by_pcode_month / by_region_month / global_month)
- **Idempotent**: yes (overwrites file each run)
- **Re-run when**: districts change, climate window extends, or you want anomaly features to recalibrate

### `backfill_predictions.py`

- **Reads**: `districts` + `malaria_data` + `climate_data` (everything the predictor needs)
- **Writes**: `predictions` + `alerts` (auto-raise for high/very_high)
- **Idempotent**: yes (`(district_id, prediction_date)` unique constraint via Alembic 002)
- **Behavior on existing row**: returns existing unless `--force`, then overwrites
- **Flags**: `--start YYYY-MM-DD`, `--end YYYY-MM-DD` (exclusive), `--force`, `--limit N`, `--dry-run`
- **Default window**: 2021-07-01 → 2026-01-01 (55 months × 1,082 districts ≈ 59,510 predictions)

### `_common.py`

Shared helpers — `cli_argparser(name)`, `sync_session()` context manager (uses
Alembic's sync engine, not the async one), `SEED_DATA_DIR` env var resolution.
Not meant to run on its own.

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `KeyError: 'SEED_DATA_DIR'` | Default path `~/Documents/second-brain/temp` doesn't exist | `export SEED_DATA_DIR=/path/to/your/temp` before running |
| `seed_climate_history.py` skips ~3,600 rows | Imputed-climate rows from training have NULL `ADM3_PCODE` | Expected — they're the post-2021 split woredas; not a bug |
| `backfill_predictions.py` warning: "pandas dtypes must be int, float or bool" | District has NULL lat/lon/elevation | Already handled by `features.py:to_dataframe` (coerces with `pd.to_numeric(errors='coerce')`) |
| `regional_baselines.json` missing → bland anomaly features | Step 5 not run | `python scripts/compute_baselines.py` |
| `risk_level` always "moderate" | Per-pcode threshold lookup falling back to global | Confirm `seed_districts.py` ran first (predictor reads `district.adm3_pcode`) |
| Backfill very slow on Supabase (>30 min) | Network round-trips per prediction | Local DB or commit-batching tweaks; for forward-only runs use `--limit` and target months you actually need |

## Data sources

All scripts read from `SEED_DATA_DIR` (default `~/Documents/second-brain/temp`):

```
temp/
├── reference-geo-name/reference_geo_names.csv
├── climate-pipeline/processed/climate_per_woreda_monthly.csv
└── climate-pipeline/outputs/final_processed_df_*EC_with_climate.csv  (5 files)
```

To deploy MalaSafe somewhere without the climate-pipeline workspace, copy
those three groups of files into the backend repo (e.g. under
`backend/seed_data/`) and set `SEED_DATA_DIR=./seed_data`.
