"""Seed climate_data from temp/climate-pipeline/processed/climate_per_woreda_monthly.csv.

Converts Ethiopian month strings (e.g. "Meskerem 2016") to Gregorian first-of-month
dates using the same EC dict as 08_feature_engineering.py.

Usage:
  python scripts/seed_climate_history.py
  python scripts/seed_climate_history.py --dry-run
"""
from __future__ import annotations

import pandas as pd
from datetime import date
from sqlalchemy import select

from _common import cli_argparser, sync_session, SEED_DATA_DIR

CLIMATE_CSV = SEED_DATA_DIR / "climate-pipeline" / "processed" / "climate_per_woreda_monthly.csv"

# EC -> 1..13; mirrors app.ai.features.EC_MONTHS
EC_MONTHS = {
    "Meskerem": 1, "Tikimt": 2, "Tikemt": 2, "Tikemet": 2, "Hidar": 3, "Hedar": 3,
    "Tahsas": 4, "Tahesas": 4, "Tir": 5, "Ter": 5, "Yekatit": 6, "Yakatit": 6,
    "Megabit": 7, "Megabbit": 7, "Miazia": 8, "Miyazya": 8, "Ginbot": 9, "Genbot": 9,
    "Sene": 10, "Hamle": 11, "Nehase": 12, "Nahase": 12, "Pagume": 13, "Paguemen": 13,
}


def gregorian_to_season(month: int) -> str:
    if month in (10, 11, 12, 1):
        return "bega"
    if month in (2, 3, 4, 5):
        return "belg"
    return "kiremt"


def ec_to_gregorian(ec_str: str) -> date | None:
    """Convert 'Meskerem 2016' (EC) -> first day of corresponding Gregorian month.

    EC year N starts on Gregorian Sep 11 (or 12 in leap years) of year N+7.
    For a given EC (month_idx, year):
      EC month 1 = Meskerem  -> Sep
      EC month 2 = Tikimt    -> Oct
      ... etc.
    This script trusts that climate_per_woreda_monthly.csv carries the same
    EC dating produced by 01_date_norm.py, so we compute the Gregorian start
    by matching: Meskerem 2016 -> 2023-09-01, Tikimt 2016 -> 2023-10-01, ...
    """
    parts = ec_str.strip().split()
    if len(parts) != 2:
        return None
    name, year_str = parts[0], parts[1].replace("EC", "").strip()
    em = EC_MONTHS.get(name)
    if em is None:
        return None
    try:
        ec_year = int(year_str)
    except ValueError:
        return None
    # Map: EC year N = Gregorian Sep (year N+7) through Sep (year N+8)
    # EC month 1 (Meskerem) -> Sep of (N+7)
    # EC month 2 (Tikimt)   -> Oct of (N+7)
    # ...
    # EC month 5 (Tir)      -> Jan of (N+8)
    g_year = ec_year + 7
    g_month = 8 + em  # em=1 -> 9 (Sep), em=2 -> 10 (Oct), ...
    if g_month > 12:
        g_month -= 12
        g_year += 1
    if em == 13:  # Pagume - intercalary days, attach to August of the next G-year-1
        # Pagume rolls over to early Sep but is small (5-6 days). For monthly
        # aggregation we lump it into August preceding the new EC year start.
        g_month = 8
    return date(g_year, g_month, 1)


def main() -> None:
    args = cli_argparser("seed_climate_history").parse_args()

    df = pd.read_csv(CLIMATE_CSV)
    if args.limit:
        df = df.head(args.limit)

    df["date"] = df["Eth_Month_Year"].apply(ec_to_gregorian)
    bad = df["date"].isna().sum()
    df = df.dropna(subset=["date"]).copy()
    print(f"loaded {len(df)+bad} rows; dropped {bad} unparseable EC dates; "
          f"writing {len(df)}")

    if args.dry_run:
        print(df[["ADM3_PCODE", "Eth_Month_Year", "date", "Rainfall_mm", "AvgTemp_C"]].head(10).to_string())
        return

    from app.models import District, ClimateData
    inserted = skipped = 0
    with sync_session() as s:
        pcode_to_id = {d.adm3_pcode or d.district_code: d.id
                       for d in s.execute(select(District)).scalars().all()}

        # Pre-load existing (district_id, date) to avoid duplicates
        existing = {(c.district_id, c.date) for c in s.execute(select(ClimateData)).scalars().all()}

        batch = []
        for _, row in df.iterrows():
            did = pcode_to_id.get(row["ADM3_PCODE"])
            if did is None:
                skipped += 1
                continue
            key = (did, row["date"])
            if key in existing and not args.force:
                skipped += 1
                continue
            batch.append(ClimateData(
                district_id=did,
                rainfall=float(row["Rainfall_mm"]) if pd.notna(row["Rainfall_mm"]) else None,
                temperature=float(row["AvgTemp_C"]) if pd.notna(row["AvgTemp_C"]) else None,
                min_temp=float(row["MinTemp_C"]) if pd.notna(row["MinTemp_C"]) else None,
                max_temp=float(row["MaxTemp_C"]) if pd.notna(row["MaxTemp_C"]) else None,
                humidity=float(row["Humidity_pct"]) if pd.notna(row["Humidity_pct"]) else None,
                season=gregorian_to_season(row["date"].month),
                date=row["date"],
            ))
            inserted += 1
            if len(batch) >= 1000:
                s.bulk_save_objects(batch)
                s.flush()
                batch.clear()
        if batch:
            s.bulk_save_objects(batch)
    print(f"done: inserted {inserted}, skipped {skipped} "
          f"(skipped includes unresolved P-codes + already-present rows)")


if __name__ == "__main__":
    main()
