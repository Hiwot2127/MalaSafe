"""Audit `predictions.district_id` rows whose UUID no longer maps to `districts.id`.

When the districts table is recreated (test wipe, fresh local DB, schema reset),
seed_districts.py re-inserts each row with a fresh UUID (it's idempotent on
`district_code`, not on UUID). Predictions written before the wipe keep their
old `district_id` FK pointing at the dropped UUIDs - those rows become orphans.
The user-visible symptom is /predictions/history/{uuid} returning 404 even
though the GeoJSON snapshot from /maps/risk shows the district.

This script reports orphans and optionally deletes them. Re-linking by
district_code isn't possible from the orphan row alone (predictions only
carry the UUID FK), so the recovery path is: re-run the backfill script
to produce fresh predictions for every district, then run this with
--delete to drop the orphans.

Usage:
  python scripts/audit_orphan_predictions.py            # report only (default)
  python scripts/audit_orphan_predictions.py --json     # machine-readable output
  python scripts/audit_orphan_predictions.py --delete --yes  # remove orphans (irreversible)

Exit code: 0 = clean, 1 = orphans found (so CI / dev hooks can detect drift).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Iterable

# Make `app` importable when running from the backend root.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select, delete, func
from sqlalchemy.orm import Session

from app.models import District, Prediction  # noqa: E402
from scripts._common import sync_session  # noqa: E402


def find_orphans(s: Session) -> list[Prediction]:
    """Predictions whose district_id has no matching row in districts."""
    valid_ids = select(District.id)
    stmt = (
        select(Prediction)
        .where(Prediction.district_id.notin_(valid_ids))
        .order_by(Prediction.created_at.desc())
    )
    return list(s.execute(stmt).scalars().all())


def orphan_count(s: Session) -> int:
    valid_ids = select(District.id)
    stmt = select(func.count()).select_from(
        select(Prediction.id).where(Prediction.district_id.notin_(valid_ids)).subquery()
    )
    return int(s.execute(stmt).scalar_one())


def print_human(orphans: Iterable[Prediction], total: int) -> None:
    orphans = list(orphans)
    print(f"orphan_count: {total}")
    if total == 0:
        print("All predictions FK-resolve cleanly.")
        return
    sample = orphans[:20]
    print(f"showing {len(sample)} of {total}:")
    for p in sample:
        print(
            f"  pred_id={p.id} district_id={p.district_id} "
            f"risk={p.risk_level} date={p.prediction_date} created={p.created_at}"
        )
    if total > len(sample):
        print(f"  ... + {total - len(sample)} more")


def print_json(orphans: Iterable[Prediction], total: int) -> None:
    payload = {
        "orphan_count": total,
        "sample": [
            {
                "prediction_id": str(p.id),
                "district_id": str(p.district_id),
                "risk_level": p.risk_level,
                "prediction_date": p.prediction_date.isoformat() if p.prediction_date else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in list(orphans)[:50]
        ],
    }
    print(json.dumps(payload, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser(prog="audit_orphan_predictions")
    parser.add_argument("--json", action="store_true", help="emit JSON for tooling")
    parser.add_argument(
        "--delete",
        action="store_true",
        help="DELETE orphan predictions (irreversible); requires --yes",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="acknowledge destructive --delete without prompting",
    )
    args = parser.parse_args()

    with sync_session() as s:
        total = orphan_count(s)
        orphans = find_orphans(s) if total > 0 else []

        if args.delete:
            if total == 0:
                print("Nothing to delete.")
                return 0
            if not args.yes:
                print(
                    f"--delete would remove {total} prediction row(s). "
                    "Re-run with --yes to confirm."
                )
                return 2
            valid_ids = select(District.id)
            s.execute(delete(Prediction).where(Prediction.district_id.notin_(valid_ids)))
            print(f"deleted {total} orphan prediction row(s).")
            return 0

        if args.json:
            print_json(orphans, total)
        else:
            print_human(orphans, total)
    # Non-zero exit when orphans exist so CI / dev scripts can detect drift.
    return 1 if total > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
