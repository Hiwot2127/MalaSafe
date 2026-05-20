# API Reference

Every endpoint exposed by the MalaSafe backend. **Interactive docs are the source of
truth** — this file is a hand-readable companion that doesn't require a running
server:

- Swagger UI: https://malasafe-api.onrender.com/api/docs (or `http://localhost:8000/api/docs`)
- ReDoc: https://malasafe-api.onrender.com/api/redoc
- OpenAPI JSON: https://malasafe-api.onrender.com/api/openapi.json

All paths are prefixed with `/api/v1`. All authenticated endpoints expect
`Authorization: Bearer <JWT>` (obtain via [`POST /auth/login`](#post-authlogin)).

## Roles (RBAC)

| Role | Notes |
|---|---|
| `admin` | Full access. Only role that can create officials or trigger admin endpoints. |
| `moh_officer` | Ministry of Health. Can upload data, run predictions, run batch jobs. |
| `ephi_officer` | EPHI. Same as MOH except cannot trigger batch prediction. |
| `regional_officer` | Bound to one `district_id`; can upload only for that district. |
| `public_user` | Mobile-app end-users. Read-only access to predictions, alerts, maps. |

"Official" in this doc means anything except `public_user`.

---

## Health — `/health`

### `GET /health`
**Auth**: none.
Lightweight liveness probe. Returns `{status, app_name, version, environment, timestamp}`. Does not touch the database.

### `GET /health/db`
**Auth**: none.
Runs `SELECT 1` against Postgres. Always returns HTTP 200; check the `status` field — `unhealthy` means the DB query failed (error message in `error`).

---

## Authentication — `/auth`

### `POST /auth/login`
**Auth**: none.
**Body**: `{ "email": str, "password": str }`
**Response 200** `Token`:
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": { "id": "...", "email": "...", "full_name": "...", "role": "admin", ... }
}
```
**Errors**: 401 (bad credentials), 403 (account inactive).

### `POST /auth/create-official`
**Auth**: `admin` only.
**Body**:
```json
{
  "email": "officer@moh.gov.et",
  "full_name": "Dr. Abebe Kebede",
  "password": "SecurePass123!",
  "role": "moh_officer",
  "district_id": null
}
```
Creates an official (any role except `public_user`). Password is validated for strength. Returns the new user (without `password_hash`).
**Errors**: 400 (email exists / weak password), 403 (caller not admin).

### `GET /auth/me`
**Auth**: any authenticated user.
Returns the authenticated user's profile.

See [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md) for token lifetime, password rules, and dependency helpers.

---

## Mobile — `/mobile`

### `POST /mobile/register`
**Auth**: none.
**Body**:
```json
{
  "email": "user@example.com",
  "full_name": "Almaz Tesfaye",
  "password": "MySecurePass123!",
  "district_id": "addis_ababa_bole"
}
```
Public self-registration. The created account is always `public_user` regardless of input. Use this from the mobile app; for office accounts use `/auth/create-official` (admin-gated).
**Errors**: 400 (email exists / weak password).

---

## Uploads — `/uploads`

All upload endpoints require an *official* role. See [CSV_UPLOAD_DOCUMENTATION.md](./CSV_UPLOAD_DOCUMENTATION.md) for full column specs.

### `POST /uploads/malaria/monthly`
**Auth**: official.
**Body**: `multipart/form-data` with `file=<CSV>`.
CSV columns: `organisationunitid, Eth_Month_Year, Travel, Positive, Tests`. Backend resolves `organisationunitid` to its parent woreda, parses `Eth_Month_Year` to Gregorian `(year, month)`, then aggregates facility rows to one woreda-month row.
Validates rows, persists into `malaria_data`, creates an `uploaded_files` provenance row, and — for a "close" upload (`month_span ≤ 2`) — dispatches a `MonthlyClose` orchestration in the background.
**Returns**: `UploadResponse` with success status, processed/created/skipped counts, validation errors, and `file_id`.

### `POST /uploads/malaria/monthly/preview`
**Auth**: official.
Same body shape as above. **Does not write** — runs validation and returns the same shape of result for a dry-run.

### `POST /uploads/climate`
**Auth**: official.
**Body**: `multipart/form-data` with `file=<CSV>`.
CSV columns: `district_code, month, year, rainfall, temperature, humidity` (proxies for `min_temp`/`max_temp` are derived). Persists into `climate_data`.

### `GET /uploads/templates/malaria/monthly`
**Auth**: official.
**Returns**: a blank CSV file (`text/csv`) with the correct header for malaria monthly uploads.

### `GET /uploads/templates/climate`
**Auth**: official.
**Returns**: a blank CSV file for climate uploads.

---

## Analytics — `/analytics`

### `GET /analytics/dashboard`
**Auth**: any authenticated user.
**Query**: `year?` (default current), `month?` (1–12), `region?`.
Returns summary KPIs (`total_positive`, `total_tests`, `active_alerts`, `high_risk_districts`, `period`), a `by_region` breakdown (omitted when `region` is set), and a `recent_trends` series (last 6 months).

### `GET /analytics/trends`
**Auth**: any authenticated user.
**Query**: `period_type=monthly` (only `monthly` is supported), `year?`, `limit` (1–52, default 12), `region?`.
Returns `{period_type, data: [{period, positive, tests, travel}, ...], total_periods}`.

---

## GIS Maps — `/maps`

### `GET /maps/risk`
**Auth**: any authenticated user.
**Query**: `date_filter?` (default today), `region?`.
Returns a **GeoJSON FeatureCollection**. Each feature carries district risk properties (`district_code`, `district_name`, `region`, `geojson_key`, `risk_level`, `confidence_score`, `prediction_score`, `recent_positive`) and `geometry: null` — the client is expected to join `geojson_key` against the local boundary GeoJSON to render the polygon. The response also includes a `metadata` object with `total_districts` and per-risk-band counts.

---

## Predictions — `/predictions`

### `GET /predictions/history/{district_id}`
**Auth**: any authenticated user.
**Path**: `district_id` (UUID).
**Query**: `limit` (1–365, default 30), `start_date?`, `end_date?` (YYYY-MM-DD).
Returns the district and a list of predictions newest-first, with `risk_level`, `confidence_score`, `prediction_score`, `prediction_reason`, `created_at`.
**Errors**: 404 (district not found).

### `POST /predictions/generate`
**Auth**: `admin` | `moh_officer` | `ephi_officer`.
**Body**:
```json
{ "district_id": "<uuid>", "target_month": "2025-08-01" }
```
Idempotent on `(district_id, target_month)`: an existing prediction is returned unchanged. The response includes `is_warm` — `false` indicates the model fell back to a cold-start path (low confidence).
**Errors**: 404 (district not found).

### `POST /predictions/generate-batch`
**Auth**: `admin` | `moh_officer`.
**Body**:
```json
{
  "target_month": "2025-08-01",
  "district_ids": ["uuid", "..."],
  "force": false
}
```
`district_ids` is optional; omit to run for every district with an `adm3_pcode`. `force=true` overwrites existing predictions. Returns **202 Accepted** with `{queued, target_month, n_districts}` — results land in the `predictions` table as the background task writes them. Poll `/predictions/history/{district_id}` to observe.

---

## Alerts — `/alerts`

### `GET /alerts`
**Auth**: any authenticated user.
**Query**:
- `active_only` (default `true`)
- `risk_level`: `low` | `moderate` | `high` | `very_high`
- `region`, `district_code`
- `q`: substring match on district name (typeahead)
- `limit` (1–500, default 50), `offset` (default 0)

Returns `{alerts: [...], total, active_count, high_risk_count}`. `total` is the filtered count ignoring pagination.

---

## Monthly Close — `/monthly-close`

The operational ML pipeline. Read endpoints are *official*-only; trigger endpoints are admin-only.

### `GET /monthly-close`
**Auth**: official.
**Query**: `status?` (`pending` | `running` | `completed` | `failed`), `month?` (`YYYY-MM-01`), `limit` (1–200).
Returns `{items: [MonthlyClose...]}` newest first.

### `GET /monthly-close/{close_id}`
**Auth**: official.
Single close, full payload (`status`, `mode`, `stats_json`, `error`, timestamps).
**Errors**: 404.

### `GET /monthly-close/{close_id}/backtest`
**Auth**: official.
**Query**: `skip` (default 0), `limit` (1–2000, default 50).
Backtest rows sorted by `abs_error` desc (worst predictions first). Response: `{monthly_close_id, count, skip, limit, items}`.

### `GET /monthly-close/{close_id}/drift`
**Auth**: official.
**Query**: `severity?` (`warn` | `critical`), `skip`, `limit` (1–500, default 50).
Drift findings sorted by `z_score` desc. Response shape matches the backtest endpoint.

### `POST /monthly-close/{close_id}/run`
**Auth**: `admin` only.
Re-dispatches the orchestrator for an existing close. If the close is in a terminal state (`completed`/`failed`), it's reset to `pending` before dispatch. Returns **202** `{monthly_close_id, status: "dispatched"}`.

### `POST /monthly-close/predict-monthly`
**Auth**: `admin` only.
**Query**: `target_month?` (`YYYY-MM-DD`; defaults to next calendar month).
Manually triggers the monthly batch prediction. Use a cron service (Render Cron Jobs, GitHub Actions) on the 5th of each month to automate. Returns **202** `{target_month, status: "dispatched"}`.

---

## Protected Examples — `/examples`

Reference endpoints illustrating each RBAC pattern. Useful for frontend integration testing.

| Path | Auth |
|---|---|
| `GET /examples/public` | none |
| `GET /examples/authenticated` | any authenticated user |
| `GET /examples/admin-only` | `admin` only |
| `GET /examples/officials-only` | any official role |
| `GET /examples/moh-ephi-only` | `moh_officer` or `ephi_officer` |
| `GET /examples/regional-officers` | `regional_officer` or `admin` |
| `GET /examples/my-district-data` | regional officer (uses their bound district) |

Each returns a small JSON describing what role was required and which user is calling.

---

## Errors

Standard FastAPI error envelope:
```json
{ "detail": "<message>" }
```

| Code | Meaning |
|---|---|
| 400 | Validation error (bad body, weak password, dup email, CSV defects) |
| 401 | Missing or invalid bearer token |
| 403 | Authenticated but role not permitted (or account inactive) |
| 404 | Resource not found |
| 422 | Pydantic validation failed (auto-emitted) |
| 500 | Unhandled exception; `error` field present when `DEBUG=true` |

## Versioning

There is currently one version: `/api/v1`. Breaking changes will go to `/api/v2`; the
existing `/api/v1` paths remain stable for backwards compatibility.
