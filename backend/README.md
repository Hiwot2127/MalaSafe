# MalaSafe Backend API

FastAPI backend for malaria surveillance and prediction. Ingests case + climate data,
runs monthly ML predictions, raises alerts, and serves analytics + GIS maps to the
web dashboard and mobile app.

- **Production:** https://malasafe-api.onrender.com (`/api/v1` prefix)
- **Interactive docs (prod):** https://malasafe-api.onrender.com/api/docs
- **Interactive docs (local):** http://localhost:8000/api/docs

## Tech Stack

- **FastAPI** + Uvicorn — async HTTP API
- **PostgreSQL 14+** with async **SQLAlchemy 2.x** + **Alembic**
- **Pydantic v2** — request/response schemas
- **JWT** — bearer-token auth (no sessions)
- **LightGBM** — monthly risk-prediction model
- **Pandas / NumPy** — feature engineering, backtests
- **Loguru** — structured logging
- Background work via **FastAPI BackgroundTasks** + in-process `asyncio.create_task`
  (the previous Celery Beat schedule has been removed — see Monthly Pipeline below)

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app + router wiring + OpenAPI metadata
│   ├── config/              # Pydantic-settings (env vars)
│   ├── database/            # Async SQLAlchemy engine + session
│   ├── models/              # ORM models (12 tables, see DATABASE_MODELS.md)
│   ├── schemas/             # Pydantic request/response models
│   ├── routes/              # 10 routers (health, auth, mobile, uploads,
│   │                        #            analytics, maps, predictions, alerts,
│   │                        #            monthly_close, protected_examples)
│   ├── services/            # Business logic (upload, analytics, prediction)
│   ├── ai/                  # Predictor + feature engineering + phrasebook
│   ├── tasks/               # Background jobs (monthly_close, predict_monthly)
│   ├── middleware/          # CORS setup
│   └── utils/               # security (JWT/passwords), deps (RBAC),
│                            # csv_parser, district_mapper, season_generator
├── alembic/                 # Database migrations
├── models/                  # Trained ML artifacts (.pkl/.joblib)
├── data/                    # Reference data (district lookups, GeoJSON keys)
├── scripts/                 # Operational scripts (training, backfills)
├── requirements.txt
└── *.md                     # Documentation (see below)
```

## Documentation Map

| Doc | What's inside |
|---|---|
| [README.md](./README.md) | You are here — orientation and setup |
| [QUICKSTART.md](./QUICKSTART.md) | Minimal-steps local run |
| [API_REFERENCE.md](./API_REFERENCE.md) | Every endpoint, grouped by router, with auth + payloads |
| [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md) | Auth flow, roles, JWT details |
| [AUTH_QUICKSTART.md](./AUTH_QUICKSTART.md) | Five-minute auth integration |
| [CSV_UPLOAD_DOCUMENTATION.md](./CSV_UPLOAD_DOCUMENTATION.md) | CSV formats, validation, preview |
| [DATABASE_MODELS.md](./DATABASE_MODELS.md) | All 12 ORM models, FKs, indexes |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, request flow, ML pipeline |

## Setup

### 1. Prerequisites
- Python 3.10+
- PostgreSQL 14+

### 2. Create venv and install deps

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/malasafe
#   DATABASE_URL_SYNC=postgresql://user:pass@host:5432/malasafe
#   SECRET_KEY=$(openssl rand -hex 32)
#   ENVIRONMENT=development
```

### 4. Database

```bash
createdb malasafe                  # or via psql
alembic upgrade head
python create_admin.py             # creates the first admin account
```

### 5. Run

```bash
# Dev (auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Prod
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
# or
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Visit http://localhost:8000/api/docs to verify.

## API Surface

All endpoints live under **`/api/v1`**. The interactive docs at `/api/docs` are the
source of truth — paths and schemas are generated from the code on every boot.

| Router | Prefix | Purpose |
|---|---|---|
| Health | `/health`, `/health/db` | Liveness + database probes |
| Authentication | `/auth/*` | Login, admin user-creation, current user |
| Mobile | `/mobile/register` | Public self-registration |
| Uploads | `/uploads/*` | Malaria + climate CSV ingest, dry-run preview, templates |
| Analytics | `/analytics/*` | Dashboard summary, weekly/monthly trends |
| GIS Maps | `/maps/risk` | Risk map as GeoJSON FeatureCollection |
| Predictions | `/predictions/*` | History, single + batch generation |
| Alerts | `/alerts` | List active high-risk alerts |
| Monthly Close | `/monthly-close/*` | Operational ML pipeline runs, backtests, drift |
| Protected Examples | `/examples/*` | Reference endpoints for RBAC patterns |

Full reference with request/response bodies: [API_REFERENCE.md](./API_REFERENCE.md).

## Authentication

JWT bearer tokens.

1. `POST /api/v1/auth/login` with `{email, password}` → returns `access_token`
2. Send `Authorization: Bearer <token>` on subsequent calls

Roles: `admin`, `moh_officer`, `ephi_officer`, `regional_officer`, `public_user`.
Most write endpoints require an "official" role (anything except `public_user`).
See [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md) for the full role/permission matrix.

## Monthly ML Pipeline

End-of-month flow:

1. Officials upload that month's malaria + climate CSVs via `/uploads/*`.
2. The upload service creates a `monthly_close` row and dispatches
   `app.tasks.monthly_close.run` in-process via `asyncio.create_task`.
3. The task: trains/refreshes the LightGBM model, generates next-month predictions,
   runs a backtest of the prior month, writes drift findings, and produces alerts.
4. The dashboard polls `/monthly-close/*` to show status, backtest rows, and drift.

To trigger the monthly forward predictions on a schedule, hit
`POST /api/v1/monthly-close/predict-monthly` from a cron (e.g. Render Cron Jobs or
GitHub Actions) on the 5th of each month. There is no longer an embedded Celery Beat.

## Database Migrations

```bash
alembic revision --autogenerate -m "add foo column"   # create
alembic upgrade head                                  # apply
alembic downgrade -1                                  # rollback one
alembic history                                       # see history
alembic current                                       # current rev
```

When adding models, import them in [alembic/env.py](./alembic/env.py) so autogenerate sees them.

## Environment Variables

See `.env.example` for the full list. Key ones:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Async DSN (`postgresql+asyncpg://...`) used at runtime |
| `DATABASE_URL_SYNC` | Sync DSN used by Alembic |
| `SECRET_KEY` | JWT signing key — `openssl rand -hex 32` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT TTL |
| `ENVIRONMENT` | `development` / `staging` / `production` |
| `DEBUG` | `true` exposes exception details in error responses |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins |
| `LOG_LEVEL`, `LOG_FILE` | Loguru configuration |

## Testing

```bash
pip install pytest pytest-asyncio httpx
pytest                          # smoke tests bundled in repo root
pytest --cov=app
```

Three task-specific test scripts live in this directory: `test_auth.py`,
`test_predictor.py`, `test_uploads.py`.

## Logging + Monitoring

- File logs rotate at 500 MB / 10-day retention (configured in `app/main.py`).
- Structured logs via Loguru — JSON-friendly format ready for log shippers.
- Production runs on Render; health checks hit `/api/v1/health/db`.

## Security Checklist

- [ ] `SECRET_KEY` generated per-environment, never committed
- [ ] HTTPS enforced at the platform layer (Render terminates TLS)
- [ ] `CORS_ORIGINS` set to the actual frontend domain(s), not `*`
- [ ] DB user has least-privilege grants
- [ ] `DEBUG=false` in production
- [ ] Dependencies refreshed (`pip list --outdated`) periodically

## Troubleshooting

**DB connection fails on boot** — verify `DATABASE_URL` uses the `+asyncpg` driver and the database exists.

**Alembic autogenerate misses a model** — confirm the model is imported in [alembic/env.py](./alembic/env.py).

**Monthly close stuck in `pending`** — re-dispatch with
`POST /api/v1/monthly-close/{id}/run` (admin only).

**429 / cold start on Render** — free-tier services sleep after inactivity; the first
request can take ~30 s.
