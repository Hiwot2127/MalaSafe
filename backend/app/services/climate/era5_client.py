"""ERA5-Land monthly means fetch via Copernicus CDS.

Ports `03c_fetch_era5.py` but in a one-month-at-a-time shape. Requests two
variables for the target month over the Ethiopia bounding box:
  - 2m_temperature
  - 2m_dewpoint_temperature

The cdsapi client reads credentials from ``~/.cdsapirc`` by default. If the
rc file is absent (e.g. in a container deploy) we materialize one from
``settings.CDSAPI_URL`` and ``settings.CDSAPI_KEY``.

Relative humidity is recovered from t2m + d2m via the Magnus formula
(Alduchov & Eskridge 1996).
"""
from __future__ import annotations

import os
from pathlib import Path

import cdsapi
import numpy as np
from loguru import logger

from app.config.settings import settings


# Ethiopia bounding box [North, West, South, East], lat/lon decimal degrees.
ETHIOPIA_AREA = [15, 33, 3, 48]


def download_month(year: int, month: int, dest_dir: Path) -> Path:
    """Fetch one month of ERA5-Land monthly means as a NetCDF file.

    Idempotent: returns the cached path if a non-empty NetCDF already exists
    for that month.
    """
    dest_dir.mkdir(parents=True, exist_ok=True)
    out = dest_dir / f"era5_land_{year}_{month:02d}.nc"

    if out.exists() and out.stat().st_size > 50_000:
        return out

    _ensure_cdsapirc()
    client = cdsapi.Client(quiet=True, progress=False)
    logger.info(f"ERA5 {year}-{month:02d}: requesting from CDS ...")
    client.retrieve(
        "reanalysis-era5-land-monthly-means",
        {
            "product_type": ["monthly_averaged_reanalysis"],
            "variable": ["2m_temperature", "2m_dewpoint_temperature"],
            "year": [str(year)],
            "month": [f"{month:02d}"],
            "time": "00:00",
            "data_format": "netcdf",
            "download_format": "unarchived",
            "area": ETHIOPIA_AREA,
        },
        str(out),
    )
    logger.info(f"ERA5 {year}-{month:02d}: downloaded ({out.stat().st_size / 1e6:.1f} MB)")
    return out


def humidity_from_dewpoint(t2m_c, d2m_c):
    """Magnus formula: relative humidity (%) from 2m air temperature and dewpoint, both in °C.

    Accepts scalars or numpy arrays.
    """
    a, b = 17.625, 243.04
    es_t = np.exp((a * t2m_c) / (b + t2m_c))
    es_td = np.exp((a * d2m_c) / (b + d2m_c))
    return 100.0 * es_td / es_t


def _ensure_cdsapirc() -> None:
    """If the user has CDSAPI_URL+CDSAPI_KEY in env, materialize ~/.cdsapirc."""
    rc_path = Path.home() / ".cdsapirc"
    if rc_path.exists():
        return
    url = settings.CDSAPI_URL
    key = settings.CDSAPI_KEY
    if not url or not key:
        raise RuntimeError(
            "Copernicus CDS credentials not configured: set CDSAPI_URL and "
            "CDSAPI_KEY env vars, or place ~/.cdsapirc on the worker."
        )
    rc_path.write_text(f"url: {url}\nkey: {key}\n")
    os.chmod(rc_path, 0o600)
    logger.info(f"materialized {rc_path} from settings")
