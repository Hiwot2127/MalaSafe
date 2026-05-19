# Database Models

12 SQLAlchemy ORM models, all in [app/models/](./app/models/). Async SQLAlchemy 2.x,
PostgreSQL 14+, UUID primary keys, server-side `now()` defaults.

> Source of truth: the model files themselves. This doc is a navigable index — if the
> code and this file disagree, the code is correct.

## Models at a glance

| Model | Table | Purpose |
|---|---|---|
| [User](#user) | `users` | Auth subjects + RBAC role |
| [District](#district) | `districts` | Ethiopian woredas (admin level 3) |
| [DistrictEnvironment](#districtenvironment) | `district_environment` | Per-district static features (altitude) |
| [MalariaData](#malariadata) | `malaria_data` | Monthly cases/deaths per district |
| [ClimateData](#climatedata) | `climate_data` | Monthly rainfall/temperature/humidity |
| [Prediction](#prediction) | `predictions` | Model output for a (district, month) |
| [Alert](#alert) | `alerts` | High-risk notifications surfaced to users |
| [UploadedFile](#uploadedfile) | `uploaded_files` | Provenance for CSV uploads |
| [ModelVersion](#modelversion) | `model_versions` | Lifecycle of trained LightGBM artifacts |
| [MonthlyClose](#monthlyclose) | `monthly_closes` | One end-of-month pipeline run |
| [BacktestResult](#backtestresult) | `backtest_results` | Per-district predicted vs actual for a close |
| [DriftFinding](#driftfinding) | `drift_findings` | Feature-level distribution shifts (3-sigma) |

## Entity Relationships

```
User ──┬─< MalariaData.uploaded_by
       ├─< UploadedFile.uploaded_by
       ├─< ModelVersion.promoted_by_user_id
       └─< MonthlyClose.triggered_by_user_id

District ──┬─< MalariaData
           ├─< ClimateData
           ├─< Prediction
           ├─< Alert
           ├─1 DistrictEnvironment       (1:1)
           ├─< BacktestResult
           └─< DriftFinding

ModelVersion ──┬─< BacktestResult.model_version_id
               └─< ModelVersion.parent_version_id      (self-FK, lineage)

MonthlyClose ──┬─< BacktestResult
               ├─< DriftFinding
               └─> UploadedFile.uploaded_file_id      (nullable)
```

---

## User

`users` — authentication subject and RBAC carrier.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `full_name` | String | |
| `email` | String, unique, indexed | login identifier |
| `password_hash` | String | bcrypt |
| `role` | Enum `UserRole` | default `PUBLIC_USER` |
| `district_id` | String, nullable | bound for `REGIONAL_OFFICER` |
| `is_active` | Boolean, default `true` | inactive accounts cannot log in |
| `created_at`, `updated_at` | timestamptz | |

**`UserRole` values**: `admin`, `moh_officer`, `ephi_officer`, `regional_officer`, `public_user`.

---

## District

`districts` — Ethiopian woreda master list (admin level 3).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `district_code` | String(50), unique | external code used in CSV uploads |
| `district_name` | String(100) | |
| `region`, `zone` | String | |
| `geojson_key` | String(100), nullable | matches features in the frontend GeoJSON file |
| `adm3_pcode` | String(20), unique, nullable | HDX p-code; presence == "mapped to ML model" |
| `latitude`, `longitude` | Float, nullable | centroid |
| `elevation_m` | Float, nullable | |
| `created_at` | timestamptz | |

---

## DistrictEnvironment

`district_environment` — static environmental features, one row per district.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `district_id` | UUID FK → districts.id, **unique** | 1:1 with District |
| `altitude` | Float, nullable | meters above sea level |
| `created_at` | timestamptz | |

---

## MalariaData

`malaria_data` — monthly cases/deaths per district, the ingest target for `/uploads/malaria/monthly`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `district_id` | UUID FK → districts.id | |
| `source_type` | String(50) | `manual` \| `file_upload` \| `api` |
| `week` | Integer, nullable | optional weekly granularity |
| `month`, `year` | Integer | indexed jointly |
| `cases`, `deaths` | Integer | `deaths` is validated `≤ cases` on ingest |
| `tests` | Integer, nullable | real exposure when reported; falls back to `cases × 5` proxy |
| `uploaded_by` | UUID FK → users.id, nullable | provenance |
| `created_at` | timestamptz | |

**Indexes**: `(district_id, year, month)`, `(year, month)`.

---

## ClimateData

`climate_data` — monthly weather observations per district.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `district_id` | UUID FK → districts.id | |
| `rainfall` | Float, nullable | mm, ~CHIRPS monthly |
| `temperature` | Float, nullable | avg °C, ~ERA5-Land monthly mean |
| `min_temp`, `max_temp` | Float, nullable | proxies until hourly ERA5 wired in |
| `humidity` | Float, nullable | relative humidity %, derived from t2m + d2m |
| `season` | String(50), nullable | `kiremt` \| `bega` \| `belg` |
| `date` | Date | first-of-month |
| `is_provisional` | Boolean, default `true` | flips to `false` when CHIRPS-final supersedes |
| `data_source` | String(20) | `chirps` \| `era5` \| `manual_upload` \| `imputed_*` |
| `created_at` | timestamptz | |

**Unique**: `(district_id, date)`.
**Indexes**: `(district_id, date)`, `(date)`.

---

## Prediction

`predictions` — model output for one district + month, with calibrated quantiles.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `district_id` | UUID FK → districts.id | |
| `risk_level` | String(20) | `low` \| `moderate` \| `high` \| `very_high` |
| `confidence_score` | Float | 0..1 |
| `prediction_score` | Float | raw model output |
| `q10`, `q90` | Float, nullable | quantile-booster lower/upper bounds |
| `prediction_reason` | Text, nullable | human-readable explanation; starts with `cold-start` when fallback used |
| `prediction_date` | Date | the month being predicted |
| `created_at` | timestamptz | |

**Indexes**: `(district_id, prediction_date)`, `(prediction_date, risk_level)`.

**`RiskLevel` values**: `low`, `moderate`, `high`, `very_high`.

---

## Alert

`alerts` — high-risk notifications surfaced to users.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `district_id` | UUID FK → districts.id | |
| `risk_level` | String(20) | same enum as Prediction |
| `message` | Text | |
| `is_active` | Boolean, default `true` | |
| `created_at` | timestamptz | |

**Indexes**: `(district_id, is_active)`, `(is_active, created_at)`.

---

## UploadedFile

`uploaded_files` — provenance row for each accepted CSV upload.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `file_name` | String(255) | |
| `upload_type` | String(50) | `malaria_data` \| `climate_data` \| `bulk_import` |
| `row_count` | Integer, nullable | parsed row count |
| `month_span` | Integer, nullable | distinct `(year, month)` tuples; `≤2` → close mode, `>2` → backfill |
| `uploaded_by` | UUID FK → users.id, nullable | |
| `created_at` | timestamptz | |

**Indexes**: `(upload_type, created_at)`, `(uploaded_by, created_at)`.

---

## ModelVersion

`model_versions` — lifecycle metadata for each trained LightGBM artifact bundle.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `version` | String(50), unique | semver-ish identifier |
| `status` | String(20) | see `ModelVersionStatus` |
| `artifacts_path` | String(512) | filesystem/S3 path to the bundle |
| `model_card_json` | JSONB, nullable | metrics, hyperparams, feature list |
| `risk_thresholds_json` | JSONB, nullable | calibrated cutoffs per risk band |
| `trained_at` | timestamptz | |
| `promoted_at` | timestamptz, nullable | set when status moves to `active` |
| `promoted_by_user_id` | UUID FK → users.id, nullable | |
| `train_data_window_start`, `_end` | Date, nullable | training cutoff window |
| `parent_version_id` | UUID FK → model_versions.id, nullable | lineage |
| `notes` | Text, nullable | |

**Index**: `(status)`.

**`ModelVersionStatus` values**: `candidate`, `active`, `archived`, `rolled_back`.

---

## MonthlyClose

`monthly_closes` — one end-of-month pipeline execution. Owns the run state machine.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `month` | Date | first-of-month being closed |
| `uploaded_file_id` | UUID FK → uploaded_files.id, nullable | triggering upload, if any |
| `triggered_by_user_id` | UUID FK → users.id, nullable | |
| `mode` | String(20) | see `MonthlyCloseMode` |
| `status` | String(30), default `pending` | see `MonthlyCloseStatus` |
| `idempotency_key` | String(128), **unique** | prevents duplicate dispatch |
| `stats_json` | JSONB, nullable | run summary (rows ingested, predictions written, etc.) |
| `error` | Text, nullable | exception message on `failed` |
| `created_at`, `completed_at` | timestamptz | |

**Index**: `(status)`.

**`MonthlyCloseMode` values**: `close`, `backfill`.

**`MonthlyCloseStatus` state machine**:
`pending` → `climate_fetching` → `backtesting` → `drift_checking` → `predicting` → `completed`
(any step can transition to `failed`).

---

## BacktestResult

`backtest_results` — per-district predicted vs actual for one close, used for model quality review.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `monthly_close_id` | UUID FK → monthly_closes.id | |
| `model_version_id` | UUID FK → model_versions.id, nullable | which model produced the prediction |
| `district_id` | UUID FK → districts.id | |
| `month` | Date | the month being backtested (typically `monthly_close.month - 1`) |
| `actual_cases` | Integer | observed |
| `predicted_cases` | Float | model output |
| `predicted_risk` | String(20), nullable | risk band at prediction time |
| `q10`, `q90` | Float, nullable | quantile bounds |
| `abs_error` | Float | `|predicted - actual|`; sort key for the API |
| `pct_error` | Float, nullable | percent error |
| `within_q10_q90` | Boolean, nullable | calibration check |
| `created_at` | timestamptz | |

**Unique**: `(monthly_close_id, district_id)`.
**Index**: `(model_version_id, month)`.

---

## DriftFinding

`drift_findings` — feature-level distribution shifts detected during a close (3-sigma rule).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `monthly_close_id` | UUID FK → monthly_closes.id | |
| `district_id` | UUID FK → districts.id | |
| `metric` | String(30) | see `DriftMetric` |
| `observed_value` | Float | the close-period value |
| `baseline_mean`, `baseline_std` | Float | training-window stats |
| `z_score` | Float | sign preserved; sort key for the API |
| `severity` | String(10) | see `DriftSeverity` |
| `created_at` | timestamptz | |

**Index**: `(monthly_close_id, severity)`.

**`DriftMetric` values**: `cases`, `rainfall`, `temp`, `humidity`.

**`DriftSeverity` values**: `warn` (`|z| ≥ 2`), `critical` (`|z| ≥ 3`).
