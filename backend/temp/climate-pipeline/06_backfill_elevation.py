"""Stage 6: Backfill Elevation_m into the 5 final output CSVs.

Reads the SRTM raster, computes zonal mean per woreda, then updates the
climate_per_woreda_monthly.csv and the 5 per-year output files in place.
"""
from __future__ import annotations
from pathlib import Path
import numpy as np
import pandas as pd
import geopandas as gpd
from rasterstats import zonal_stats

ROOT = Path("/Users/danielbogale/Documents/second-brain")
CW = ROOT / "temp" / "climate-pipeline"
SHP = ROOT / "temp" / "reference-geo-name" / "ETH shape file 2024" / "eth_admbnda_adm3_csa_bofedb_2021.shp"
SRTM = CW / "raw_rasters" / "srtm" / "ethiopia_srtm_90m.tif"
CLIMATE = CW / "processed" / "climate_per_woreda_monthly.csv"
OUT_DIR = CW / "outputs"


def main() -> None:
    if not SRTM.exists():
        raise SystemExit(f"SRTM not found at {SRTM}")
    print(f"Loading shapefile + SRTM {SRTM.stat().st_size/1e6:.1f} MB ...")
    woredas = gpd.read_file(SHP)
    if str(woredas.crs).upper() not in ("EPSG:4326", "WGS 84"):
        woredas = woredas.to_crs("EPSG:4326")

    print(f"Computing zonal mean elevation for {len(woredas)} woredas ...")
    stats = zonal_stats(woredas[["ADM3_PCODE", "geometry"]],
                       str(SRTM), stats=["mean"], nodata=-32768, all_touched=False)
    elev_df = pd.DataFrame({
        "ADM3_PCODE": woredas["ADM3_PCODE"].values,
        "Elevation_m": [round(s["mean"], 1) if s["mean"] is not None else np.nan for s in stats],
    })
    n_filled = elev_df["Elevation_m"].notna().sum()
    print(f"  filled: {n_filled}/{len(elev_df)} ({n_filled/len(elev_df)*100:.1f}%)")
    print(f"  range: {elev_df['Elevation_m'].min():.0f} .. {elev_df['Elevation_m'].max():.0f} m")
    print(f"  mean : {elev_df['Elevation_m'].mean():.0f} m")

    # Update climate_per_woreda_monthly.csv
    print(f"\nUpdating {CLIMATE.name} ...")
    cm = pd.read_csv(CLIMATE)
    cm = cm.drop(columns=["Elevation_m"], errors="ignore")
    cm = cm.merge(elev_df, on="ADM3_PCODE", how="left")
    # Re-order with Elevation_m back in place
    cols = ["ADM3_PCODE", "Eth_Month_Year", "Latitude", "Longitude", "Elevation_m",
            "MaxTemp_C", "MinTemp_C", "AvgTemp_C", "Rainfall_mm", "Humidity_pct"]
    cm[cols].to_csv(CLIMATE, index=False)
    print(f"  wrote {CLIMATE} ({len(cm)} rows)")

    # Update each per-year output
    print("\nUpdating per-year outputs ...")
    for f in sorted(OUT_DIR.glob("final_processed_df_*EC_with_climate.csv")):
        df = pd.read_csv(f)
        df = df.drop(columns=["Elevation_m"], errors="ignore")
        df = df.merge(elev_df, on="ADM3_PCODE", how="left")
        # Re-order so Elevation_m sits between Longitude and MaxTemp_C
        ordered = ["Region", "Zone", "Woreda", "Period", "Latitude", "Longitude",
                   "Elevation_m", "MaxTemp_C", "MinTemp_C", "AvgTemp_C", "Rainfall_mm", "Humidity_pct"]
        other = [c for c in df.columns if c not in ordered]
        df = df[ordered + other]
        df.to_csv(f, index=False)
        filled = df["Elevation_m"].notna().sum()
        print(f"  {f.name}: {len(df)} rows, Elevation_m filled {filled} ({filled/len(df)*100:.1f}%)")


if __name__ == "__main__":
    main()
