"""Seed malaria_data from temp/climate-pipeline/outputs/*EC_with_climate.csv.

Each output CSV row is (facility, month) -> Positive cases. The MalaSafe
schema is keyed at (district, year, month) without a facility dimension, so
we aggregate Positive by (ADM3_PCODE, Period_Gregorian_start).

Result: ~49,400 rows in malaria_data (one per resolved woreda x month).
That populates the autoregressive lag features the predictor's warm path
needs, lifting it out of cold-start mode.

Usage:
  python scripts/seed_malaria_history.py
  python scripts/seed_malaria_history.py --dry-run
  python scripts/seed_malaria_history.py --force        # truncate first
"""
from __future__ import annotations

import pandas as pd
from datetime import date
from sqlalchemy import select, text

from _common import cli_argparser, sync_session, SEED_DATA_DIR

OUTPUTS_DIR = SEED_DATA_DIR / "climate-pipeline" / "outputs"
SOURCE_TAG = "historical_seed"


def load_all() -> pd.DataFrame:
    frames = []
    for f in sorted(OUTPUTS_DIR.glob("final_processed_df_*EC_with_climate.csv")):
        df = pd.read_csv(f, usecols=["ADM3_PCODE", "Period_Gregorian_start",
                                       "Positive", "Tests"])
        df["_src"] = f.name
        frames.append(df)
    return pd.concat(frames, ignore_index=True)


def main() -> None:
    args = cli_argparser("seed_malaria_history").parse_args()

    print(f"reading 5 EC CSVs from {OUTPUTS_DIR} ...")
    df = load_all()
    print(f"  loaded {len(df):,} facility-month rows")

    # Drop rows with unresolved ADM3_PCODE (these are the post-2021 split woredas)
    df = df.dropna(subset=["ADM3_PCODE"]).copy()
    df["Period_Gregorian_start"] = pd.to_datetime(df["Period_Gregorian_start"])
    df["year"] = df["Period_Gregorian_start"].dt.year
    df["month"] = df["Period_Gregorian_start"].dt.month

    # Aggregate facility -> woreda-month
    agg = (df.groupby(["ADM3_PCODE", "year", "month"], as_index=False)
             .agg(cases=("Positive", "sum")))
    print(f"  aggregated to {len(agg):,} (woreda, year, month) rows")

    if args.limit:
        agg = agg.head(args.limit)

    if args.dry_run:
        print(agg.head(10).to_string())
        print(f"\ncases distribution: min={agg['cases'].min()} med={agg['cases'].median():.0f} "
              f"max={agg['cases'].max()} mean={agg['cases'].mean():.1f}")
        return

    from app.models import District, MalariaData
    inserted = skipped = 0
    with sync_session() as s:
        if args.force:
            s.execute(text("DELETE FROM malaria_data WHERE source_type = :src"),
                       {"src": SOURCE_TAG})
            s.flush()
            print(f"  cleared previous {SOURCE_TAG} rows")

        pcode_to_id = {(d.adm3_pcode or d.district_code): d.id
                       for d in s.execute(select(District)).scalars().all()}

        batch = []
        for _, row in agg.iterrows():
            did = pcode_to_id.get(row["ADM3_PCODE"])
            if did is None:
                skipped += 1
                continue
            batch.append(MalariaData(
                district_id=did,
                source_type=SOURCE_TAG,
                week=None,
                month=int(row["month"]),
                year=int(row["year"]),
                cases=int(row["cases"]),
                deaths=0,
            ))
            inserted += 1
            if len(batch) >= 2000:
                s.bulk_save_objects(batch)
                s.flush()
                batch.clear()
        if batch:
            s.bulk_save_objects(batch)
    print(f"done: inserted {inserted:,}, skipped {skipped} (unresolved P-codes)")


if __name__ == "__main__":
    main()
