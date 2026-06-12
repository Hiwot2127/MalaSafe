# Handoff prompt: migrate MalaSafe Postgres → Supabase

Copy everything below the `---` into a fresh Claude Code session in `~/Documents/Lili/MalaSafe/backend/`.

---

I need to migrate a local Postgres database to a Supabase free-tier project. The DB is already populated locally with 1,082 districts + 49,390 climate rows + 49,390 malaria rows + 59,510 predictions + 22,748 alerts (~180k rows total, <500 MB). The FastAPI app already runs against the local DB. After migration, the same code must run against Supabase with **only `.env` changes**, no code edits.

## Read this first — full project context

Read `/Users/danielbogale/Documents/second-brain/temp/climate-pipeline/PROJECT_REPORT.md` before doing anything. It documents all 11 pipeline stages, model metrics, the schema, and the current DB state. Skim sections "Stage 10/11" and "Operational instructions" — that's the relevant part for migration. Don't re-run any pipeline stages.

## What you're working with

| Concern | Value |
|---|---|
| Repo | `~/Documents/Lili/MalaSafe/backend` |
| Venv | `~/Documents/Lili/MalaSafe/backend/venv` |
| Local DB | `malasafe_db` on `localhost:5432`, role `postgres` |
| ORM | SQLAlchemy 2.0.25 async (`asyncpg`) + sync (`psycopg2-binary` for Alembic) |
| Two URL env vars | `DATABASE_URL` (async, `postgresql+asyncpg://...`) and `DATABASE_URL_SYNC` (sync, `postgresql://...`) |
| Tables (already created via Alembic) | `users, districts, malaria_data, climate_data, district_environment, predictions, alerts, uploaded_files, alembic_version` |
| Migrations applied | `001_malaria_models`, `002_extend_for_ml` |
| Alembic config | `backend/alembic.ini` (reads `DATABASE_URL_SYNC`) |

## What you need to do

1. Confirm Supabase project exists. Ask the user for:
   - Project ref (e.g. `abcdefghij`)
   - Database password
   - Region (probably `eu-west-2` or `eu-central-1` for Ethiopia latency)
   If they don't have a project yet, walk them through creating one at https://supabase.com/dashboard (just the project — no need to set up Auth/Storage/Realtime).

2. Construct the two connection strings. **Critical**: use port **5432** (direct), not 6543 (PgBouncer pooler). Asyncpg's prepared statements break under PgBouncer's transaction mode. Direct connection format:
   ```
   DATABASE_URL=postgresql+asyncpg://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
   DATABASE_URL_SYNC=postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
   ```
   URL-encode the password if it contains special characters.

3. Test connectivity before touching the dump:
   ```bash
   psql "postgresql://postgres:<PW>@db.<REF>.supabase.co:5432/postgres?sslmode=require" -c "SELECT version()"
   ```
   If this fails, stop and surface the error to the user — don't proceed with the dump.

4. Run Alembic against Supabase to create the schema cleanly. Don't trust `pg_dump --schema-only` here; we want Alembic's exact migration history so future migrations apply correctly:
   ```bash
   cd ~/Documents/Lili/MalaSafe/backend
   # temporarily point sync URL at Supabase
   DATABASE_URL_SYNC="postgresql://postgres:<PW>@db.<REF>.supabase.co:5432/postgres?sslmode=require" \
     ./venv/bin/python -m alembic upgrade head
   # verify both revisions present
   psql "postgresql://postgres:<PW>@db.<REF>.supabase.co:5432/postgres?sslmode=require" \
     -c "SELECT * FROM alembic_version"
   ```

5. Dump data only (not schema, since Alembic owns it) and restore:
   ```bash
   pg_dump --data-only --no-owner --no-acl -Fc malasafe_db > /tmp/malasafe.dump
   pg_restore --data-only --no-owner --no-acl \
     -d "postgresql://postgres:<PW>@db.<REF>.supabase.co:5432/postgres?sslmode=require" \
     /tmp/malasafe.dump
   ```
   Expect 2-5 minutes for ~180k rows over a typical home connection.

6. Verify row counts match. Run this against Supabase:
   ```sql
   SELECT 'districts', COUNT(*) FROM districts UNION ALL
   SELECT 'climate_data', COUNT(*) FROM climate_data UNION ALL
   SELECT 'malaria_data', COUNT(*) FROM malaria_data UNION ALL
   SELECT 'predictions', COUNT(*) FROM predictions UNION ALL
   SELECT 'alerts', COUNT(*) FROM alerts UNION ALL
   SELECT 'users', COUNT(*) FROM users;
   ```
   Expected: districts=1082, climate_data=49390, malaria_data=49390, predictions≈59510, alerts≈22748, users=1.

7. Update `.env` permanently with the Supabase URLs (back up the old file first as `.env.local-postgres`).

8. Restart uvicorn and run the live smoke tests already documented in `PROJECT_REPORT.md` section "What works right now". Specifically:
   - `GET /api/v1/health` should still return 200
   - `GET /api/v1/predictions/history/<some-district-uuid>?limit=5` should return rows
   - `POST /api/v1/predictions/generate` for a new target_month should return 201

9. Add an Uptime Robot (or equivalent) **5-minute ping** to `/api/v1/health`. Supabase free tier auto-pauses after 7 days of inactivity; the monthly Celery beat alone won't keep it warm. Tell the user this is required, not optional.

## Pitfalls — do not skip

- **Port 5432 not 6543.** If the user copies the "Connection pooler" string from Supabase's dashboard it'll be 6543. That will silently break asyncpg's prepared statements. Always use the "Direct connection" string.
- **`sslmode=require` is mandatory.** Supabase rejects unencrypted connections.
- **`--no-owner --no-acl` on both dump and restore.** Without these, restore tries to assign ownership to `postgres` superuser which doesn't exist on Supabase.
- **`--data-only` on restore** — schema came from Alembic in step 4. If you let pg_restore recreate tables, the indexes/constraints will conflict.
- **Don't dump `alembic_version`** — already populated by step 4. Use `--exclude-table=alembic_version` on `pg_dump` if you hit conflicts.
- **MCP**: if the Supabase MCP server is configured, prefer it for verification queries in step 6 instead of `psql`. It's faster and the user explicitly wanted MCP visibility — that was the whole reason they chose Supabase.

## What NOT to do

- Don't re-run any pipeline stages (Stages 1-9). They produced the model artifacts and the local seed CSVs which are already loaded into the DB. Re-running wastes hours.
- Don't change any application code unless a real bug blocks migration. The ORM, predictor, scripts — all work as-is against any Postgres.
- Don't enable Supabase Auth or Realtime. MalaSafe has its own JWT system; layering Supabase Auth would conflict.
- Don't try the 6543 PgBouncer port as an "optimization." This is a single-instance FastAPI app; direct connection on 5432 is the right call.

## Done criteria

- Live API responds 200 on `/api/v1/predictions/history/<id>` reading from Supabase.
- Row-count verification (step 6) matches expected values.
- `.env` updated and old `.env.local-postgres` preserved.
- Uptime ping configured.
- Brief summary back to user: what changed, what they should test next, where the keepalive ping is configured.

Read the project report first. Ask the user for the Supabase project ref + password before any psql/pg_restore. Then proceed.
