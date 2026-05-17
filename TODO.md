# TODO

## Backend
- `/api/v1/analytics/trends` ignores `trend_type` — always returns monthly. Fix in `app/routes/analytics.py`.
- Alembic migration `001` creates `users.role` as `VARCHAR`, but `User.role` is `SQLEnum(UserRole)` expecting a Postgres `userrole` enum. Add a revision: `CREATE TYPE userrole AS ENUM (...)` + `ALTER COLUMN role TYPE userrole`.
- `requirements.txt` missing `greenlet` (needed by SQLAlchemy async).
- `requirements.txt` doesn't pin `bcrypt` — `passlib==1.7.4` breaks with `bcrypt>=4`. Pin `bcrypt<4`.
- README default password `Admin@123` fails `validate_password_strength` (needs upper+lower+digit+special).
- README + `/` response link `/docs`, but Swagger UI is at `/api/docs`.

## Frontend
- 422 responses crash the UI: `error.response.data.detail` is an array of objects, components render it directly → `Objects are not valid as a React child`. Coerce to string in `lib/api/client.ts` interceptor.
- `package.json` missing `tailwindcss-animate` (referenced by `tailwind.config.ts`).
- `app/layout.tsx` imports `@/components/theme-provider`, file didn't exist in repo.

## README
- Setup steps are Windows-only (`copy`, `venv\Scripts\activate`). Add macOS/Linux variant.
