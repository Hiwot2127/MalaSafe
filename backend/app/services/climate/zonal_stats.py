"""Per-woreda aggregation of raster climate data.

Stub for Phase 1. Real implementation in Phase 3 ports
`temp/climate-pipeline/04_zonal_stats.py`. Uses `rasterstats` against the
bundled Ethiopia woreda shapefile (no GDAL CLI dependency).
"""
from __future__ import annotations

from pathlib import Path
from typing import Any


def aggregate_chirps(tif_path: Path, shapefile_path: Path) -> list[dict[str, Any]]:
    """Mean monthly rainfall per woreda."""
    raise NotImplementedError("Implemented in Phase 3")


def aggregate_era5(netcdf_path: Path, shapefile_path: Path) -> list[dict[str, Any]]:
    """Mean temperature + dewpoint per woreda, with min/max bounds and Magnus humidity."""
    raise NotImplementedError("Implemented in Phase 3")
