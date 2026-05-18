# MalaSafe Backend Architecture

How the MalaSafe backend is laid out, how requests flow through it, and how the
monthly ML pipeline runs.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Clients                                                     │
│  • Web dashboard (Next.js)   • Mobile app   • Cron triggers │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS, JWT bearer
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI app (uvicorn / gunicorn on Render)                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Routers  (/api/v1/...)                                 │ │
│  │  health · auth · mobile · uploads · analytics · maps   │ │
│  │  predictions · alerts · monthly-close · examples       │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │ Middleware                                              │ │
│  │  CORS · JWT auth (via Depends) · global error handler   │ │
│  └────────────────────────┬───────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │ Services  (business logic, no FastAPI)                  │ │
│  │  UploadService · AnalyticsService · PredictionService   │ │
│  └────────────┬─────────────┬───────────────┬─────────────┘ │
│               │             │               │                │
│  ┌────────────▼──┐  ┌──────▼─────┐  ┌─────▼──────────────┐ │
│  │ Models +      │  │ AI module   │  │ Background tasks   │ │
│  │ Schemas       │  │ predictor / │  │ monthly_close.run  │ │
│  │ (SQLAlchemy + │  │ features /  │  │ predict_monthly    │ │
│  │  Pydantic)    │  │ phrasebook  │  │ (asyncio tasks)    │ │
│  └──────┬────────┘  └─────────────┘  └────────────────────┘ │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
   ┌─────────────┐                ┌───────────────────────┐
   │ PostgreSQL  │                │ Trained LightGBM      │
   │ (Async      │                │ artifacts (models/)   │
   │  SQLAlchemy)│                │ — model versions in DB│
   └─────────────┘                └───────────────────────┘
```

No Redis, no Celery — background work runs in-process via `asyncio.create_task`.
Scheduled runs come from external cron (Render Cron Jobs, GitHub Actions) hitting
`POST /monthly-close/predict-monthly`.

## Directory Layout

```
app/
├── main.py            # FastAPI app, OpenAPI metadata, router wiring, exception handler
├── config/            # Pydantic-Settings from environment
├── database/          # Async engine + session factory + get_db dependency
├── middleware/        # CORS setup (called from main.py)
├── models/            # 12 SQLAlchemy ORM models (see DATABASE_MODELS.md)
├── schemas/           # Pydantic v2 request/response models
├── routes/            # 10 routers (one APIRouter per file)
├── services/          # Business logic, called from routes
│   ├── upload_service.py        # CSV parsing, validation, persistence, dispatch
│   ├── analytics_service.py     # Dashboard, trends, risk map aggregation
│   └── prediction_service.py    # Single + batch prediction generation
├── ai/                # ML inference + helpers (separate from training scripts)
│   ├── predictor.py             # Loads active ModelVersion, runs inference
│   ├── features.py              # Feature engineering shared between train + infer
│   └── phrasebook.py            # prediction_reason text templates
├── tasks/             # In-process background jobs
│   ├── monthly_close.py         # Orchestrates a close: backtest → drift → predict
│   └── predict_monthly.py       # Generates next-month predictions for all districts
└── utils/             # security (JWT/bcrypt), dependencies (RBAC), csv_parser,
                       # district_mapper, season_generator
```

External:

```
alembic/         # Migrations
data/            # Reference data (district lookups, GeoJSON keys)
models/          # Trained ML artifact bundles, referenced by ModelVersion.artifacts_path
scripts/         # One-off operational scripts (training runs, backfills, seeds)
logs/            # Loguru log files (rotated)
```

## Request Flow

A typical authenticated request:

```
client                             FastAPI                              Postgres
  │  POST /api/v1/predictions/generate                                       │
  │  Authorization: Bearer <JWT>                                             │
  ├───────────────────────────────────►                                      │
  │            ┌─ CORS middleware ────────┐                                  │
  │            ├─ JWT decode (Depends)    │                                  │
  │            │  get_current_user        │                                  │
  │            ├─ require_roles(...)      │  ◄── 403 if wrong role           │
  │            ├─ Pydantic body validate  │  ◄── 422 on schema fail          │
  │            │                          │                                  │
  │            │  route handler ──────────┼──► PredictionService.generate_one│
  │            │                          │       │                          │
  │            │                          │       │  SELECT district ───────►│
  │            │                          │       │  ◄────── 404 if missing  │
  │            │                          │       │  load active ModelVersion│
  │            │                          │       │  predictor.predict()     │
  │            │                          │       │  INSERT prediction ─────►│
  │            │  PredictionResultResponse│                                  │
  │  ◄─────────┴──────────────────────────┘                                  │
  │  201 Created                                                             │
```

`Depends(get_current_user)` and `Depends(require_roles(...))` are reusable across
routes — see [app/utils/dependencies.py](./app/utils/dependencies.py).

## Auth Model

- Stateless JWT. Login (`/auth/login`) returns an `access_token` containing
  `user_id`, `email`, and `role` claims.
- Tokens are HS256-signed with `SECRET_KEY`; expiry from `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Every protected route declares its policy via dependency:
  - `Depends(get_current_user)` — must be logged in
  - `Depends(require_admin)` / `require_official` — role gates
  - `Depends(require_roles(UserRole.X, UserRole.Y))` — explicit allow-list
- Public users self-register via `/mobile/register`. Officials are provisioned by
  admins via `/auth/create-official`.

See [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md).

## Data Ingest Path

```
official user
   │
   │  multipart POST /uploads/malaria/monthly (.csv)
   ▼
UploadService
   │  1. parse + validate every row (csv_parser, district_mapper)
   │  2. compute month_span across the file
   │  3. insert MalariaData rows
   │  4. insert UploadedFile provenance row
   │  5. if month_span <= 2  →  CLOSE mode:
   │         create MonthlyClose(status='pending')
   │         asyncio.create_task(monthly_close.run(id))
   │     else                →  BACKFILL mode (no close dispatched)
   ▼
202/200 response with counts + file_id
```

Climate uploads follow the same shape but target `climate_data` and never dispatch
a close.

## Monthly Close Pipeline

Orchestrator: [app/tasks/monthly_close.py](./app/tasks/monthly_close.py).

```
MonthlyClose status transitions
─────────────────────────────────

  pending ──► climate_fetching ──► backtesting ──► drift_checking
                                                         │
                                                         ▼
                                              predicting ──► completed
                                                         │
                                                (any step) ▼
                                                       failed (error captured)
```

For each close:

1. **climate_fetching** — top up `climate_data` for the close month (manual or
   CHIRPS-final supersede; current implementation is manual_upload-only).
2. **backtesting** — score the previous month's predictions against newly-arrived
   actuals; write `BacktestResult` rows.
3. **drift_checking** — compute z-scores for `cases`, `rainfall`, `temp`, `humidity`
   against the training-window baseline; write `DriftFinding` rows where
   `|z| ≥ 2` (warn) or `≥ 3` (critical).
4. **predicting** — generate next-month predictions for every mapped district
   (`adm3_pcode IS NOT NULL`) using the active `ModelVersion`. Writes to
   `predictions`; risk-band alerts get a row in `alerts`.

Admin can re-run a stuck close via `POST /monthly-close/{id}/run`.
Admin can manually trigger only the prediction batch via
`POST /monthly-close/predict-monthly` — used by external cron in lieu of Celery Beat.

## ML Inference

[app/ai/predictor.py](./app/ai/predictor.py) loads the row from `model_versions`
where `status='active'`. The bundle pointed to by `artifacts_path` contains the
LightGBM booster, calibrated risk thresholds, and feature transforms. Inference
shares feature engineering with training via [app/ai/features.py](./app/ai/features.py).

Cold-start fallback: if a district has insufficient history for full feature
extraction, the predictor falls back to a regional baseline and tags the prediction
with `prediction_reason: "cold-start: ..."`. The API surfaces this via the
`is_warm` field on `PredictionResultResponse`.

Quantile bounds (`q10`, `q90`) come from a parallel quantile-loss booster and are
used by the dashboard to render uncertainty intervals.

## Background Tasks

| Trigger | What runs | Where |
|---|---|---|
| Successful malaria CSV upload (close mode) | `monthly_close.run` | in-process |
| `POST /predictions/generate-batch` | `_run_batch_predict` | in-process via `BackgroundTasks` |
| `POST /monthly-close/{id}/run` | `monthly_close.run` (re-dispatch) | in-process |
| `POST /monthly-close/predict-monthly` | `predict_monthly.run_monthly_predictions` | in-process |
| External cron (Render / GHA) | hits `predict-monthly` | external |

All tasks open their own DB session (`AsyncSessionLocal`) — the request session is
gone by the time they run.

## Deployment

- **Platform**: Render.com (web service, Python runtime)
- **Process**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **DB**: Render Postgres (or Supabase, per `DATABASE_URL`)
- **TLS**: terminated at Render's edge
- **Cron**: external — Render Cron Jobs or GitHub Actions hitting
  `/monthly-close/predict-monthly`

Health probes:
- `/api/v1/health` — process liveness
- `/api/v1/health/db` — DB connectivity (preferred for load balancers)

## Observability

- Loguru → stdout + `logs/app.log`, 500 MB rotation, 10-day retention.
- Configuration in [app/main.py](./app/main.py).
- Recommended additions for production: Sentry for errors, an APM agent for
  request tracing.

## Conventions

- **Models** stay thin — no business logic in `app/models/`.
- **Services** are stateless classes that take a DB session in their constructor.
- **Routes** do auth, validation, response shaping. They do not contain SQL beyond
  trivial lookups (district by id, exists checks).
- **Schemas** are Pydantic v2 — separate request and response types when they
  differ (don't reuse ORM models as response shapes).
- **All write paths are idempotent where possible** (`MonthlyClose.idempotency_key`,
  the `(district_id, target_month)` constraint on predictions).
- **Background tasks open their own session** — never pass the request session.

For deeper guidance on a specific subsystem, see:
- [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md)
- [CSV_UPLOAD_DOCUMENTATION.md](./CSV_UPLOAD_DOCUMENTATION.md)
- [DATABASE_MODELS.md](./DATABASE_MODELS.md)
- [API_REFERENCE.md](./API_REFERENCE.md)
