"""Seed districts.organisationunitid with the REAL DHIS2 org unit ids.

The upload pipeline keys malaria rows by `organisationunitid` (DHIS2 ids like
`JgBKioqJo5h`). `OrgUnitMapper` resolves them against `districts.organisationunitid`.
This script populates that column from the climate-pipeline outputs, which carry
both the DHIS2 `organisationunitid` and the matched `ADM3_PCODE` for each woreda.

An earlier name-based approach stored the facility *name* in
`districts.organisationunitid` (so real DHIS2 ids never resolved); this maps the
real ids into `org_unit_mappings` instead.

Idempotent: re-running just re-sets the same values.

Usage:
  python scripts/seed_orgunit_mappings.py
  python scripts/seed_orgunit_mappings.py --dry-run
"""
from __future__ import annotations

import glob

import pandas as pd
from sqlalchemy import text

from _common import cli_argparser, sync_session, SEED_DATA_DIR

OUTPUTS_GLOB = str(
    SEED_DATA_DIR / "climate-pipeline" / "outputs" / "final_processed_df_*EC_with_climate.csv"
)
# org id -> name comes from the dated facility files (which carry organisationunitname).
DATED_GLOB = str(
    SEED_DATA_DIR / "climate-pipeline" / "processed" / "malaria_*EC_dated.csv"
)


def load_mapping() -> pd.DataFrame:
    files = sorted(glob.glob(OUTPUTS_GLOB))
    if not files:
        raise SystemExit(f"No mapping files found at {OUTPUTS_GLOB}")
    frames = [pd.read_csv(f, usecols=["organisationunitid", "ADM3_PCODE"]) for f in files]
    df = pd.concat(frames, ignore_index=True).dropna(subset=["organisationunitid", "ADM3_PCODE"])
    df["organisationunitid"] = df["organisationunitid"].astype(str).str.strip()
    df["ADM3_PCODE"] = df["ADM3_PCODE"].astype(str).str.strip()
    df = df[(df["organisationunitid"] != "") & (df["ADM3_PCODE"] != "")]
    pairs = df.drop_duplicates()

    # Guard: a DHIS2 id must resolve to a single woreda.
    conflicts = pairs.groupby("organisationunitid")["ADM3_PCODE"].nunique()
    conflicts = conflicts[conflicts > 1]
    if len(conflicts):
        print(f"WARNING: {len(conflicts)} org ids map to >1 ADM3_PCODE; dropping them:")
        for oid in conflicts.index[:10]:
            print(f"    {oid}: {sorted(pairs.loc[pairs.organisationunitid == oid, 'ADM3_PCODE'])}")
        pairs = pairs[~pairs["organisationunitid"].isin(conflicts.index)]

    # Attach human-readable org unit names where available.
    name_files = sorted(glob.glob(DATED_GLOB))
    if name_files:
        names = pd.concat(
            [pd.read_csv(f, usecols=["organisationunitid", "organisationunitname"]) for f in name_files],
            ignore_index=True,
        ).dropna(subset=["organisationunitid"])
        names["organisationunitid"] = names["organisationunitid"].astype(str).str.strip()
        names = names.drop_duplicates(subset=["organisationunitid"])
        pairs = pairs.merge(names, on="organisationunitid", how="left")
    else:
        pairs["organisationunitname"] = None

    return pairs


def main() -> None:
    args = cli_argparser("seed_orgunit_mappings").parse_args()
    pairs = load_mapping()
    if args.limit:
        pairs = pairs.head(args.limit)

    print(f"plan: map {len(pairs)} DHIS2 org ids -> districts (by ADM3_PCODE)")
    if args.dry_run:
        print(pairs.head(10).to_string())
        return

    inserted = 0
    no_district: list[tuple[str, str]] = []
    with sync_session() as s:
        # Resolve ADM3_PCODE -> district_id once.
        rows = s.execute(
            text("SELECT id, district_code, adm3_pcode FROM districts")
        ).fetchall()
        by_pcode: dict[str, Any] = {}
        for did, code, adm3 in rows:
            if code:
                by_pcode[str(code).strip()] = did
            if adm3:
                by_pcode.setdefault(str(adm3).strip(), did)

        for _, row in pairs.iterrows():
            oid, pcode = row["organisationunitid"], row["ADM3_PCODE"]
            name = row.get("organisationunitname")
            name = None if (name is None or pd.isna(name)) else str(name).strip()
            district_id = by_pcode.get(pcode)
            if district_id is None:
                no_district.append((oid, pcode))
                continue
            # Upsert into org_unit_mappings (authoritative many->one source).
            s.execute(
                text(
                    "INSERT INTO org_unit_mappings (org_unit_id, district_id, org_unit_name) "
                    "VALUES (:oid, :did, :name) "
                    "ON CONFLICT (org_unit_id) DO UPDATE SET "
                    "district_id = EXCLUDED.district_id, org_unit_name = EXCLUDED.org_unit_name"
                ),
                {"oid": oid, "did": district_id, "name": name},
            )
            inserted += 1
            # Keep districts.organisationunitid populated with one representative id.
            s.execute(
                text(
                    "UPDATE districts SET organisationunitid = :oid "
                    "WHERE id = :did AND organisationunitid IS NULL"
                ),
                {"oid": oid, "did": district_id},
            )

    print(f"done: upserted {inserted} org unit mappings")
    if no_district:
        print(f"WARNING: {len(no_district)} org ids had no matching district (pcode not seeded):")
        for oid, pcode in no_district[:10]:
            print(f"    {oid} -> {pcode}")
        if len(no_district) > 10:
            print(f"    ... and {len(no_district) - 10} more")


if __name__ == "__main__":
    main()
