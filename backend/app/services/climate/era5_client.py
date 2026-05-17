"""ERA5-Land temperature + dewpoint fetch via Copernicus CDS.

Stub for Phase 1. Real implementation in Phase 3 ports
`temp/climate-pipeline/03c_fetch_era5.py`. Requires `~/.cdsapirc` populated
from settings.CDSAPI_URL + settings.CDSAPI_KEY at worker startup.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path


def download_month(year: int, month: int, dest_dir: Path) -> Path:
    """Fetch ERA5-Land monthly means (2m_temperature, 2m_dewpoint) for the month."""
    raise NotImplementedError("Implemented in Phase 3")


def humidity_from_dewpoint(t2m_c: float, d2m_c: float) -> float:
    """Magnus formula: relative humidity from 2m temperature and dewpoint."""
    raise NotImplementedError("Implemented in Phase 3")
