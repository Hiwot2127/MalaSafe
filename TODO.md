# TODO

## Backend
- Alembic migration `001` creates `users.role` as `VARCHAR`, but `User.role` is `SQLEnum(UserRole)` expecting a Postgres `userrole` enum. Add a revision: `CREATE TYPE userrole AS ENUM (...)` + `ALTER COLUMN role TYPE userrole`.
- `requirements.txt` missing `greenlet` (needed by SQLAlchemy async — currently pulled in transitively, but should be pinned explicitly).
- FastAPI root (`/`) response links to `/docs`, but Swagger UI is mounted at `/api/docs` — fix the welcome payload in `app/main.py`.

## Frontend
- 422 responses crash the UI: `error.response.data.detail` is an array of objects, components render it directly → `Objects are not valid as a React child`. Coerce to string in `lib/api/client.ts` interceptor.
