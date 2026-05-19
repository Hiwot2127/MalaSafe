"""Backfill the predictions table by running the model over every (district, month).

Uses an async session because PredictionService is async (matches the rest of
the app). Iterates districts x months, calls generate_one, commits in batches.

Window: 2021-07-01 -> 2026-01-01 (matches the climate-pipeline data range).

Usage:
  python scripts/backfill_predictions.py
  python scripts/backfill_predictions.py --start 2024-01-01 --end 2025-12-01
  python scripts/backfill_predictions.py --force --limit 100
"""
from __future__ import annotations

import asyncio
import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

# bootstrap path
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select

DEFAULT_START = date(2021, 7, 1)
DEFAULT_END   = date(2026, 1, 1)


def month_range(start: date, end_exclusive: date):
    cur = date(start.year, start.month, 1)
    while cur < end_exclusive:
        yield cur
        if cur.month == 12:
            cur = date(cur.year + 1, 1, 1)
        else:
            cur = date(cur.year, cur.month + 1, 1)


async def main_async(args) -> None:
    from app.database.base import AsyncSessionLocal
    from app.models import District
    from app.services.prediction_service import PredictionService
    from app.ai import get_predictor

    predictor = get_predictor()
    months = list(month_range(args.start, args.end))
    print(f"window: {args.start} .. {args.end} ({len(months)} months)")

    async with AsyncSessionLocal() as session:
        q = select(District).where(District.adm3_pcode.is_not(None))
        districts = (await session.execute(q)).scalars().all()
        if args.limit:
            districts = districts[: args.limit]
        print(f"districts: {len(districts)} (limit={args.limit})")

        total = len(districts) * len(months)
        print(f"plan: {total:,} predictions ({len(districts)} x {len(months)})")
        if args.dry_run:
            return

        svc = PredictionService(session, predictor)
        done = 0
        for m in months:
            for d in districts:
                try:
                    await svc.generate_one(d.id, m, force=args.force)
                except Exception as e:
                    print(f"  warn: {d.district_code} @ {m}: {e}")
                done += 1
                if done % 500 == 0:
                    await session.commit()
                    print(f"  progress: {done:,}/{total:,}")
        await session.commit()
        print(f"done: wrote {done:,} predictions")


def main() -> None:
    p = argparse.ArgumentParser(prog="backfill_predictions")
    p.add_argument("--start", type=lambda s: date.fromisoformat(s), default=DEFAULT_START)
    p.add_argument("--end",   type=lambda s: date.fromisoformat(s), default=DEFAULT_END)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--force", action="store_true")
    p.add_argument("--limit", type=int, default=None)
    args = p.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
