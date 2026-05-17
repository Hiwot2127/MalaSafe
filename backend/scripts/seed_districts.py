"""Seed the districts table from reference_geo_names.csv + climate centroid data.

Idempotent on district_code = ADM3_PCODE. Reads centroid lat/lon/elevation
from climate_per_woreda_monthly.csv (first row per ADM3) so no GDAL needed.

Usage:
  python scripts/seed_districts.py
  python scripts/seed_districts.py --dry-run
"""
from __future__ import annotations

import pandas as pd
from sqlalchemy import select

from _common import cli_argparser, sync_session, SEED_DATA_DIR

GEO_CSV = SEED_DATA_DIR / "reference-geo-name" / "reference_geo_names.csv"
CLIMATE_CSV = SEED_DATA_DIR / "climate-pipeline" / "processed" / "climate_per_woreda_monthly.csv"


def load_geo() -> pd.DataFrame:
    df = pd.read_csv(GEO_CSV)
    df.columns = [c.strip() for c in df.columns]
    # Expected: region, zone, woreda, ADM3_PCODE
    df = df.drop_duplicates(subset=["ADM3_PCODE"])
    return df


def load_centroids() -> pd.DataFrame:
    df = pd.read_csv(CLIMATE_CSV, usecols=["ADM3_PCODE", "Latitude", "Longitude", "Elevation_m"])
    df = df.drop_duplicates(subset=["ADM3_PCODE"], keep="first")
    return df


def main() -> None:
    args = cli_argparser("seed_districts").parse_args()

    geo = load_geo()
    cents = load_centroids()
    full = geo.merge(cents, on="ADM3_PCODE", how="left")
    if args.limit:
        full = full.head(args.limit)

    print(f"plan: upsert {len(full)} districts "
          f"({full[['Latitude', 'Longitude', 'Elevation_m']].notna().all(axis=1).sum()} with full geo)")

    if args.dry_run:
        print(full.head(5).to_string())
        return

    from app.models import District
    inserted = updated = 0
    with sync_session() as s:
        existing = {d.district_code: d for d in s.execute(select(District)).scalars().all()}
        for _, row in full.iterrows():
            code = row["ADM3_PCODE"]
            payload = dict(
                district_code=code,
                district_name=row["woreda"],
                region=row["region"],
                zone=row["zone"] if pd.notna(row.get("zone")) else None,
                adm3_pcode=code,
                latitude=float(row["Latitude"]) if pd.notna(row.get("Latitude")) else None,
                longitude=float(row["Longitude"]) if pd.notna(row.get("Longitude")) else None,
                elevation_m=float(row["Elevation_m"]) if pd.notna(row.get("Elevation_m")) else None,
            )
            d = existing.get(code)
            if d is None:
                s.add(District(**payload))
                inserted += 1
            elif args.force:
                for k, v in payload.items():
                    setattr(d, k, v)
                updated += 1
    print(f"done: inserted {inserted}, updated {updated}")


if __name__ == "__main__":
    main()
