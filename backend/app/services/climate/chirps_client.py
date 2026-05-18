"""CHIRPS rainfall download client.

Ports the offline pipeline's `03a_fetch_chirps.py` for online use: download
ONE month's Africa-wide monthly rainfall raster from UCSB, gunzip it, return
the local path. Pure HTTP - no API key, no SDK.

Source: https://data.chc.ucsb.edu/products/CHIRPS-2.0/africa_monthly/tifs/
File:   chirps-v2.0.YYYY.MM.tif.gz  (~1-2 MB gzipped, ~5km Africa coverage)

Provisional vs final: CHIRPS publishes a "preliminary" estimate within ~2
days of month-end and the "final" gauge-corrected estimate ~90 days later.
Anything inside CHIRPS_PROVISIONAL_DAYS is flagged so the row can be
upgraded on a later fetch.
"""
from __future__ import annotations

import gzip
import shutil
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

from loguru import logger

from app.config.settings import settings


BASE_URL = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/africa_monthly/tifs"
_USER_AGENT = "MalaSafe-climate/1.0"


def download_month(year: int, month: int, dest_dir: Path) -> Path:
    """Download CHIRPS monthly rainfall TIF for the given month.

    Returns the path to the uncompressed .tif. Idempotent: if a sufficiently
    large TIF already exists in ``dest_dir`` it is returned without re-fetching.
    Raises ``FileNotFoundError`` (404) when the month is not yet published
    (e.g. the current calendar month before mid-month publication).
    """
    dest_dir.mkdir(parents=True, exist_ok=True)
    gz_name = f"chirps-v2.0.{year}.{month:02d}.tif.gz"
    tif_path = dest_dir / gz_name[:-3]
    gz_path = dest_dir / gz_name

    if tif_path.exists() and tif_path.stat().st_size > 1024:
        return tif_path

    url = f"{BASE_URL}/{gz_name}"
    _fetch_with_retry(url, gz_path)

    with gzip.open(gz_path, "rb") as src, tif_path.open("wb") as dst:
        shutil.copyfileobj(src, dst)
    gz_path.unlink(missing_ok=True)
    logger.info(f"CHIRPS {year}-{month:02d}: downloaded ({tif_path.stat().st_size // 1024} KB)")
    return tif_path


def is_provisional(target_month: date, today: date | None = None) -> bool:
    """Treat months younger than CHIRPS_PROVISIONAL_DAYS as preliminary.

    The offline pipeline uses a fixed 90-day window - same default here.
    """
    cutoff = today or date.today()
    age_days = (cutoff - target_month).days
    return age_days < settings.CHIRPS_PROVISIONAL_DAYS


def _fetch_with_retry(url: str, dest: Path, retries: int = 3, timeout: int = 60) -> None:
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as resp, dest.open("wb") as fh:
                shutil.copyfileobj(resp, fh)
            return
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise FileNotFoundError(f"CHIRPS not yet published: {url}") from e
            last_err = e
            logger.warning(f"CHIRPS fetch attempt {attempt}/{retries} failed: {e}")
        except Exception as e:
            last_err = e
            logger.warning(f"CHIRPS fetch attempt {attempt}/{retries} failed: {e}")
        time.sleep(2 * attempt)
    assert last_err is not None
    raise last_err
