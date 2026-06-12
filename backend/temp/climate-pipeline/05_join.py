"""Stage 5: Join climate columns onto every malaria CSV.

For each malaria_<year>EC_dated.csv:
  - join final_crosswalk.csv on organisationunitname (+ region/zone for disambiguation) -> ADM3_PCODE
  - join climate_per_woreda_monthly.csv on (ADM3_PCODE, Eth_Month_Year) -> climate cols
  - write outputs/final_processed_df_<year>EC_with_climate.csv

The final schema matches temp/sample/terget-enviromental-data-sample.csv:
  Region, Zone, Woreda, Period, Latitude, Longitude, Elevation_m,
  MaxTemp_C, MinTemp_C, AvgTemp_C, Rainfall_mm, Humidity_pct
... plus the original malaria columns and the Eth_Month_Year/Period_Gregorian_* helpers.
"""
from __future__ import annotations
from pathlib import Path
import pandas as pd

ROOT = Path("/Users/danielbogale/Documents/second-brain")
CW = ROOT / "temp" / "climate-pipeline"
PROCESSED = CW / "processed"
OUT_DIR = CW / "outputs"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def main() -> None:
    print("Loading crosswalk + climate ...")
    crosswalk = pd.read_csv(CW / "crosswalk" / "final_crosswalk.csv", dtype=str)
    # Keep only rows with a resolved P-code
    crosswalk = crosswalk[crosswalk["ADM3_PCODE"].notna() & (crosswalk["ADM3_PCODE"].str.strip() != "")]
    cw_key = crosswalk[["organisationunitname", "region_malaria", "zone_malaria", "ADM3_PCODE"]].copy()
    cw_key = cw_key.drop_duplicates(subset=["organisationunitname", "region_malaria", "zone_malaria"])
    print(f"  crosswalk rows: {len(cw_key)}")

    climate = pd.read_csv(PROCESSED / "climate_per_woreda_monthly.csv")
    print(f"  climate rows: {len(climate)}")

    for in_p in sorted(PROCESSED.glob("malaria_*EC_dated.csv")):
        ec_year = in_p.stem.split("_")[1].replace("EC", "")
        df = pd.read_csv(in_p)
        n0 = len(df)
        df_m = df.merge(
            cw_key,
            left_on=["organisationunitname", "orgunitlevel2", "orgunitlevel3"],
            right_on=["organisationunitname", "region_malaria", "zone_malaria"],
            how="left",
        )
        df_m = df_m.merge(climate, on=["ADM3_PCODE", "Eth_Month_Year"], how="left")
        # Add sample-style human columns
        df_m = df_m.rename(columns={
            "orgunitlevel2": "Region",
            "orgunitlevel3": "Zone",
            "organisationunitname": "Woreda",
        })
        # Reorder: sample-schema columns first (where available), then originals
        sample_cols = ["Region", "Zone", "Woreda", "Period", "Latitude", "Longitude",
                       "Elevation_m", "MaxTemp_C", "MinTemp_C", "AvgTemp_C", "Rainfall_mm", "Humidity_pct"]
        other_cols = [c for c in df_m.columns if c not in sample_cols and c not in ("region_malaria", "zone_malaria")]
        df_out = df_m[sample_cols + other_cols]

        out_p = OUT_DIR / f"final_processed_df_{ec_year}EC_with_climate.csv"
        df_out.to_csv(out_p, index=False)
        # Coverage report
        climate_resolved = df_out["ADM3_PCODE"].notna().sum()
        rain_present = df_out["Rainfall_mm"].notna().sum()
        temp_present = df_out["MaxTemp_C"].notna().sum()
        print(f"\n{ec_year}EC:")
        print(f"  rows: {n0} -> {len(df_out)}")
        print(f"  ADM3_PCODE resolved: {climate_resolved} ({climate_resolved/n0*100:.1f}%)")
        print(f"  Rainfall_mm filled:  {rain_present} ({rain_present/n0*100:.1f}%)")
        print(f"  MaxTemp_C  filled:   {temp_present} ({temp_present/n0*100:.1f}%)")
        print(f"  wrote {out_p}")


if __name__ == "__main__":
    main()
