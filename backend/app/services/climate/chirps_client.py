"""CHIRPS rainfall download client.

Stub for Phase 1. Real implementation in Phase 3 ports
`temp/climate-pipeline/03a_fetch_chirps.py`. Downloads monthly GeoTIFFs from
https://data.chc.ucsb.edu/products/CHIRPS-2.0/africa_monthly/tifs/ with retries
and gzip decompression. No auth required.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path


def download_month(year: int, month: int, dest_dir: Path) -> Path:
    """Download CHIRPS monthly rainfall TIF for the given month."""
    raise NotImplementedError("Implemented in Phase 3")


def is_provisional(target_month: date, today: date | None = None) -> bool:
    """CHIRPS publishes preliminary almost immediately; final lands ~90 days later."""
    raise NotImplementedError("Implemented in Phase 3")
