"""Stage 2b: Merge auto-matched crosswalk with user-filled manual_review.csv.

Run this AFTER you finish reviewing manual_review.csv.

Produces:
  crosswalk/final_crosswalk.csv  -- the join key for Stage 5

Logic for each manual_review row:
  - If ADM3_PCODE_final is filled (non-empty) -> use it
  - If blank -> row is treated as unresolved (climate columns will be null in final output)
"""
from __future__ import annotations
from pathlib import Path
import pandas as pd

ROOT = Path("/Users/danielbogale/Documents/second-brain")
CW_DIR = ROOT / "temp" / "climate-pipeline" / "crosswalk"
AUTO = CW_DIR / "facility_to_pcode.csv"
REVIEW = CW_DIR / "manual_review.csv"
OUT = CW_DIR / "final_crosswalk.csv"


def main() -> None:
    auto = pd.read_csv(AUTO)
    print(f"Auto-matched: {len(auto)} rows")

    if REVIEW.exists():
        review = pd.read_csv(REVIEW, dtype=str).fillna("")
        review["ADM3_PCODE_final"] = review["ADM3_PCODE_final"].str.strip()
        filled = review[review["ADM3_PCODE_final"] != ""].copy()
        blank  = review[review["ADM3_PCODE_final"] == ""].copy()
        print(f"Manual review:")
        print(f"  filled (will be used): {len(filled)}")
        print(f"  blank (no climate):    {len(blank)}")

        # Convert filled rows to the same shape as auto-matched
        if len(filled) > 0:
            filled_out = pd.DataFrame({
                "organisationunitname": filled["organisationunitname"],
                "region_malaria":       filled["region_malaria"],
                "zone_malaria":         filled["zone_malaria"],
                "match_type":           "manual",
                "confidence":           pd.NA,
                "ADM3_PCODE":           filled["ADM3_PCODE_final"],
                "ADM3_EN_ref":          pd.NA,
                "ADM2_EN_ref":          pd.NA,
                "ADM1_EN_ref":          pd.NA,
            })
            combined = pd.concat([auto, filled_out], ignore_index=True)
        else:
            combined = auto
    else:
        print(f"WARN: {REVIEW} does not exist; using auto-matched only.")
        combined = auto

    # Drop duplicates on (organisationunitname, region_malaria, zone_malaria) — manual wins
    combined = combined.drop_duplicates(
        subset=["organisationunitname", "region_malaria", "zone_malaria"],
        keep="last",
    )
    combined.to_csv(OUT, index=False)
    print(f"\nWrote: {OUT}  ({len(combined)} rows)")

    # Summary
    print("\nFinal coverage by match_type:")
    print(combined["match_type"].value_counts())


if __name__ == "__main__":
    main()
