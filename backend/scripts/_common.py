"""Shared helpers for seed/backfill scripts.

Each script is a CLI: `python scripts/seed_foo.py [--dry-run] [--force]`.
They share the sync DB session (Alembic style) so they don't need an event loop.
"""
from __future__ import annotations

import argparse
import os
import sys
from contextlib import contextmanager
from pathlib import Path

# Make `app` importable when running these scripts from the backend root.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Path to the pre-computed climate CSV in the climate-pipeline workspace.
# Override via SEED_DATA_DIR env var if you've copied it locally.
SEED_DATA_DIR = Path(os.environ.get("SEED_DATA_DIR", BACKEND_ROOT / "temp"))


def cli_argparser(name: str) -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog=name)
    p.add_argument("--dry-run", action="store_true", help="parse + print plan, don't write")
    p.add_argument("--force", action="store_true", help="overwrite existing rows where supported")
    p.add_argument("--limit", type=int, default=None, help="cap rows for quick testing")
    return p


@contextmanager
def sync_session():
    from app.database.base import SessionLocal  # sync engine, used by Alembic
    s = SessionLocal()
    try:
        yield s
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()
