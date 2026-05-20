# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Three independent applications in one repo, no monorepo tooling:

- `backend/` - FastAPI + PostgreSQL malaria surveillance API
- `frontend/` - Next.js 16 App Router dashboard
- `mobile/` - React Native (Expo) public-awareness app

All three talk to the same `/api/v1` over HTTP. Default dev wiring: frontend at `localhost:3000` calls backend at `http://localhost:8000/api/v1` via `NEXT_PUBLIC_API_URL`; mobile points at the same backend via `services/api.js` (use the host machine's LAN IP from a physical device).

## Common commands

### Backend (run from `backend/`)

```bash
# First-time setup
python -m venv venv && source venv/bin/activate      # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env                                   # edit DATABASE_URL + SECRET_KEY
alembic upgrade head
python create_admin.py                                 # interactive - enforces strong password

# Dev server (auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1

# Tests - these are standalone scripts that hit a running server, NOT pytest suites
python test_auth.py
python test_uploads.py

# Background work runs in-process via asyncio.create_task — no worker process
# to start. Trigger the monthly batch on demand with:
curl -X POST http://localhost:8000/api/v1/monthly-close/predict-monthly \
  -H "Authorization: Bearer $ADMIN_JWT"
# Production schedules the same call from external cron (Render Cron Jobs,
# GitHub Actions). There is no Celery, no Redis, no message broker.
```

API docs (when server is running): `/api/docs` (Swagger), `/api/redoc`, `/api/openapi.json`.

### Frontend (run from `frontend/`)

```bash
npm install
# .env.local must set NEXT_PUBLIC_API_URL (default: http://localhost:8000/api/v1)
npm run dev        # localhost:3000
npm run build
npm start
npm run lint       # next lint
```

There is no test runner configured on the frontend.

## Backend architecture

**Entry point:** [backend/app/main.py](backend/app/main.py) builds the FastAPI app, registers loguru, wires CORS via [backend/app/middleware](backend/app/middleware/), and mounts every router under the `/api/v1` prefix.

**Layered structure under `backend/app/`:**

- `config/settings.py` - Pydantic `BaseSettings` cached via `@lru_cache`; reads `.env`. All env keys are `case_sensitive = True`.
- `database/base.py` - defines **two SQLAlchemy engines**: an async engine (`asyncpg`) for the app and a sync engine (`psycopg2`) for Alembic. `get_db` is the async FastAPI dependency; `get_db_sync` exists for migrations only. The async `get_db` auto-commits on success and rolls back on exception - routes should not call `db.commit()` for the success path.
- `models/` - SQLAlchemy ORM. 12 tables: `users`, `districts`, `malaria_data`, `climate_data`, `district_environment`, `predictions`, `alerts`, `uploaded_files`, `model_versions`, `monthly_close`, `backtest_results`, `drift_findings`. Primary keys are `UUID(as_uuid=True)`. `users.role` is currently stored as `VARCHAR` (see `TODO.md` — migration to a Postgres enum is pending). See [backend/DATABASE_MODELS.md](backend/DATABASE_MODELS.md) for FKs and indexes.
- `schemas/` - Pydantic v2 request/response models.
- `routes/` - one module per resource: `health`, `auth`, `mobile`, `uploads`, `analytics`, `maps`, `predictions`, `alerts`, `monthly_close`, `protected_examples` (10 routers). Each exports `router` and is re-exported from `routes/__init__.py` as `<name>_router`.
- `services/` - business logic; routes are thin and delegate here (e.g. `upload_service.py`, `analytics_service.py`, `prediction_service.py`).
- `utils/security.py` - JWT (HS256) encode/decode, bcrypt hashing, `validate_password_strength` (8+ chars, upper, lower, digit, special). Token payload uses `user_id`, `email`, `role`, `exp`, `iat`, `type`.
- `utils/dependencies.py` - `get_current_user` (HTTPBearer) and `require_roles(*allowed_roles)` factory. Always protect endpoints via `Depends(require_roles(UserRole.X, ...))` rather than checking roles inline.
- `ai/` - ML inference module. `predictor.py` loads the active `ModelVersion` and runs LightGBM inference; `features.py` is shared between training and inference; `phrasebook.py` produces `prediction_reason` text templates. Artifacts live in `MODEL_PATH` (default `./models`).
- `tasks/` - in-process background jobs. `monthly_close.py` orchestrates a close (backtest → drift → predict); `predict_monthly.py` generates next-month predictions for every mapped district. Dispatched via `asyncio.create_task`; no Celery, no Redis.
- `alembic/` - migration scripts; uses `DATABASE_URL_SYNC` (not the async URL).

**Required env vars** (`backend/.env`, see `.env.example`): `DATABASE_URL` (async, `postgresql+asyncpg://...`), `DATABASE_URL_SYNC` (sync, `postgresql://...`), `SECRET_KEY` (generate with `openssl rand -hex 32`), `CORS_ORIGINS`. Optional: `MAX_UPLOAD_SIZE` (default 10 MB), `SMTP_*`, `LOG_FILE`, `MODEL_PATH`.

**Auth flow:** client sends `Authorization: Bearer <jwt>`; `get_current_user` decodes the token, fetches the user from DB, and rejects inactive users with 403. Roles: `ADMIN`, `MOH_OFFICER`, `EPHI_OFFICER`, `REGIONAL_OFFICER`, `PUBLIC_USER` (see [backend/app/models/user.py](backend/app/models/user.py)).

## Frontend architecture

**Next.js 16 App Router** with route groups (React 19):

- `app/(auth)/login/` - public login page
- `app/(dashboard)/{dashboard,analytics,maps,upload,alerts,settings}/` - authenticated pages, share `(dashboard)/layout.tsx`
- `app/layout.tsx` - root layout, mounts the theme provider (`next-themes`)
- `app/page.tsx` - landing/redirect

**API layer:** [frontend/lib/api/client.ts](frontend/lib/api/client.ts) is the single axios instance. It reads the base URL from `lib/constants.ts` (which exports `API_URL` from `NEXT_PUBLIC_API_URL`), injects the JWT from `localStorage.token` on every request, and on 401 clears storage and hard-redirects to `/login`. Resource modules (`auth.ts`, `analytics.ts`, `maps.ts`, `uploads.ts`, `alerts.ts`) wrap `apiClient`; do not call `axios` directly elsewhere.

**Token storage** is `localStorage` (`token`, `user`). All auth state lives there, including across reloads - there is no React context provider for auth.

**Styling:** Tailwind CSS + `class-variance-authority` + `tailwind-merge` (typical shadcn-style `cn()` helper in `lib/utils.ts`). Icons from `lucide-react`. Maps use `leaflet` + `react-leaflet`. Charts use `recharts`.

**Path alias:** `@/*` → repo `frontend/` root (see `tsconfig.json`).

## Conventions to follow

- **Don't add a new route without registering it** in [backend/app/routes/__init__.py](backend/app/routes/__init__.py) and including it in `main.py` with the `/api/v1` prefix.
- **Don't open raw DB sessions.** Inject via `Depends(get_db)` (async) - the dependency handles commit/rollback.
- **Don't check roles inline.** Use `Depends(require_roles(...))` so unauthorized access returns a consistent 403.
- **Schema changes go through Alembic.** Edit the model, then `alembic revision --autogenerate -m "..."`; review the generated script before applying.
- **Frontend API calls go through `lib/api/*.ts` modules,** not direct axios/fetch - this keeps interceptors, base URL, and 401 redirect behavior consistent.
- **Two database URLs are intentional** (async for the app, sync for Alembic). When adding env handling, update both.

## Gotchas

- There is no default admin credential. [backend/create_admin.py](backend/create_admin.py) is interactive and enforces password strength (8+ chars, upper, lower, digit, special). Older copies of the README cited `admin@malasafe.gov.et / admin123` — those values were never accepted by the validator.
- `backend/venv.py314.broken/` exists alongside `backend/venv/`; the active virtualenv is `venv/`. Ignore the `.broken` directory.
- There are many `*_COMPLETE.md` and `*_SUMMARY.md` files at the repo root - these are historical implementation reports from the initial build, not active specs. Source of truth is the code; treat these docs as background context only.
- Ethiopian domain vocabulary: 12 regions (Addis Ababa, Afar, Amhara, Benishangul-Gumuz, Dire Dawa, Gambela, Harari, Oromia, Sidama, SNNPR, Somali, Tigray) and 3 seasons (Bega Oct–Jan, Belg Feb–May, Kiremt Jun–Sep). The `mobile` backend router handles public-user self-registration (`POST /mobile/register`) and the risk dashboard read endpoints consumed by the Expo app under `mobile/`.
