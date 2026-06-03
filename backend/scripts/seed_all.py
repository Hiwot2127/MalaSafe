"""Idempotent full-database bootstrap for local/dev.

Run AFTER `alembic upgrade head`. Safe to run on every container start: each
step is guarded by its own table count and only runs when that table is empty,
so re-runs never duplicate and an already-seeded DB returns in ~1s.

On a fresh DB this populates everything needed for the app to be "ready":
geography -> org-unit mappings -> malaria history -> climate history -> admin
user -> predictions (ML backfill, the slow step).

All data comes from files committed to the repo (backend/temp/*.csv and the
LightGBM models in backend/models/), so no external/Supabase access is needed.

Exit code: non-zero if a core step fails (so the container command can halt and
surface it). The predictions backfill is best-effort — a model hiccup logs a
warning but does not block the server from starting.
"""
from __future__ import annotations

import subprocess
import sys
from datetime import date
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from sqlalchemy import text  # noqa: E402
from app.database.base import SessionLocal  # noqa: E402

PY = sys.executable


def table_counts() -> dict[str, int]:
    wanted = ("districts", "org_unit_mappings", "malaria_data",
              "climate_data", "predictions", "users")
    out: dict[str, int] = {}
    with SessionLocal() as s:
        for t in wanted:
            try:
                out[t] = s.execute(text(f"SELECT count(*) FROM {t}")).scalar() or 0
            except Exception:
                out[t] = -1  # table missing -> migrations not applied
    return out


def backfill_window() -> tuple[str, str]:
    """Last ~12 months up to the current month.

    The predictor rejects any target month more than 12 months in the past, so
    backfilling the full multi-year data range just floods the logs with ~50k
    'too far in the past' warnings. Restrict the window to what the model will
    actually score, which is also what a current dashboard needs.
    """
    t = date.today()
    end = date(t.year + (t.month // 12), (t.month % 12) + 1, 1)  # first of next month (exclusive)
    y, m = t.year, t.month - 12
    while m <= 0:
        m += 12
        y -= 1
    start = date(y, m, 1)
    return start.isoformat(), end.isoformat()


def run(label: str, argv: list[str], *, fatal: bool = True) -> None:
    print(f"[seed_all] -> {label}", flush=True)
    rc = subprocess.run([PY, *argv], cwd=str(BACKEND)).returncode
    if rc != 0:
        msg = f"[seed_all] {label} FAILED (exit {rc})"
        if fatal:
            print(msg + " — aborting bootstrap", flush=True)
            sys.exit(rc)
        print(msg + " — continuing (non-fatal)", flush=True)


def main() -> None:
    c = table_counts()
    print(f"[seed_all] counts before: {c}", flush=True)

    if c["districts"] == -1:
        print("[seed_all] tables missing — run `alembic upgrade head` first.", flush=True)
        sys.exit(1)

    if all(c[t] > 0 for t in ("districts", "org_unit_mappings", "malaria_data",
                              "climate_data", "predictions")):
        print("[seed_all] DB already fully populated — nothing to do.", flush=True)
        return

    # Reference geography + DHIS2 org-unit mappings (fast).
    if c["districts"] == 0:
        run("districts", ["scripts/seed_districts.py"])
    if c["org_unit_mappings"] == 0:
        run("org unit mappings", ["scripts/seed_orgunit_mappings.py"])

    # Historical malaria + climate (the bulk rows).
    if c["malaria_data"] == 0:
        run("malaria history", ["scripts/seed_malaria_history.py"])
    if c["climate_data"] == 0:
        run("climate history", ["scripts/seed_climate_history.py"])

    # Admin login (idempotent — skips if it already exists).
    run("admin user", ["seed_admin.py"])

    # Predictions: ML backfill over all (district x month). Slow on first run.
    # regional_baselines.json ships in the repo; recompute only if it's missing.
    if not (BACKEND / "models" / "regional_baselines.json").exists():
        run("climate baselines", ["scripts/compute_baselines.py"], fatal=False)
    if c["predictions"] == 0:
        start, end = backfill_window()
        run("predictions backfill", ["scripts/backfill_predictions.py",
            "--start", start, "--end", end], fatal=False)

    print(f"[seed_all] counts after: {table_counts()}", flush=True)
    print("[seed_all] bootstrap complete.", flush=True)


if __name__ == "__main__":
    main()
