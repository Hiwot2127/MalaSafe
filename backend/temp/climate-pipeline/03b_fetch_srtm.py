"""Stage 3b: SRTM3 (90m) elevation for Ethiopia via `elevation` package.

Requires GDAL CLI (gdalbuildvrt, gdal_translate) on PATH.
Output: raw_rasters/srtm/ethiopia_srtm_90m.tif
"""
from __future__ import annotations
from pathlib import Path
import elevation

DEST = Path("/Users/danielbogale/Documents/second-brain/temp/climate-pipeline/raw_rasters/srtm")
DEST.mkdir(parents=True, exist_ok=True)
OUT = DEST / "ethiopia_srtm_90m.tif"
BBOX = (33, 3, 48, 15)  # lon_min, lat_min, lon_max, lat_max


def main() -> None:
    if OUT.exists() and OUT.stat().st_size > 100_000:
        print(f"Cached: {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")
        return
    print(f"Clipping SRTM3 (~90m) for Ethiopia bbox {BBOX} -> {OUT}")
    elevation.clip(bounds=BBOX, output=str(OUT), product="SRTM3", max_download_tiles=64)
    size_mb = OUT.stat().st_size / 1e6
    print(f"OK  {OUT}  ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
