"""Stage 3c (FAST PATH): ERA5-Land monthly means for t2m + d2m, Ethiopia bbox.

This replaces the slow hourly download. One single request covers the full
2021-07 .. 2026-02 range. Tradeoff: we get monthly MEAN temperature only;
MaxTemp / MinTemp are approximated as AvgTemp ± 5°C (typical Ethiopian
diurnal range half-width). For exact daily extremes, switch back to hourly.

Output: raw_rasters/era5_land/era5_land_monthly_means.nc
"""
from __future__ import annotations
from pathlib import Path
import cdsapi

DEST = Path("/Users/danielbogale/Documents/second-brain/temp/climate-pipeline/raw_rasters/era5_land")
DEST.mkdir(parents=True, exist_ok=True)
OUT = DEST / "era5_land_monthly_means.nc"
AREA = [15, 33, 3, 48]   # N, W, S, E

# Build full year/month coverage 2021-07 .. 2026-02
YEARS = [str(y) for y in range(2021, 2027)]
MONTHS = [f"{m:02d}" for m in range(1, 13)]


def main() -> None:
    if OUT.exists() and OUT.stat().st_size > 100_000:
        print(f"Cached: {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")
        return
    client = cdsapi.Client()
    print("Requesting ERA5-Land monthly means (t2m + d2m) for 2021-2026 ...")
    client.retrieve(
        "reanalysis-era5-land-monthly-means",
        {
            "product_type": ["monthly_averaged_reanalysis"],
            "variable": ["2m_temperature", "2m_dewpoint_temperature"],
            "year": YEARS,
            "month": MONTHS,
            "time": "00:00",
            "data_format": "netcdf",
            "download_format": "unarchived",
            "area": AREA,
        },
        str(OUT),
    )
    print(f"OK -> {OUT}  ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
