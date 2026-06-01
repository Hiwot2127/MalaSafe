"""Stage 3a: Download CHIRPS-2.0 Africa monthly rainfall rasters.

Range: 2021-07 through 2026-02 (covers all 5 EC malaria years).
Source: https://data.chc.ucsb.edu/products/CHIRPS-2.0/africa_monthly/tifs/
Files:  chirps-v2.0.YYYY.MM.tif.gz  (~1-2 MB each gzipped, ~5km Africa coverage)
No account required.

Cached: skip files already present (by uncompressed size > 1 KB).
"""
from __future__ import annotations
import gzip
import shutil
import sys
import time
from pathlib import Path
import urllib.request
import urllib.error

DEST = Path("/Users/danielbogale/Documents/second-brain/temp/climate-pipeline/raw_rasters/chirps")
DEST.mkdir(parents=True, exist_ok=True)
BASE = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/africa_monthly/tifs"

START = (2021, 7)
END   = (2026, 2)


def months_inclusive(s: tuple, e: tuple):
    y, m = s
    while (y, m) <= e:
        yield y, m
        m += 1
        if m == 13:
            m = 1
            y += 1


def fetch(url: str, dest: Path, retries: int = 3, timeout: int = 60) -> None:
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "climate-pipeline/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp, dest.open("wb") as fh:
                shutil.copyfileobj(resp, fh)
            return
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code == 404:
                raise
            print(f"  attempt {attempt} failed: {e}", file=sys.stderr)
        except Exception as e:
            last_err = e
            print(f"  attempt {attempt} failed: {e}", file=sys.stderr)
        time.sleep(2 * attempt)
    raise last_err


def main() -> None:
    total_months = sum(1 for _ in months_inclusive(START, END))
    print(f"Fetching {total_months} CHIRPS monthly rasters: {START[0]}-{START[1]:02d} .. {END[0]}-{END[1]:02d}")
    print(f"Destination: {DEST}")
    n_skip = 0
    n_dl = 0
    n_404 = 0
    for y, m in months_inclusive(START, END):
        gz_name = f"chirps-v2.0.{y}.{m:02d}.tif.gz"
        tif_name = gz_name[:-3]  # strip .gz
        out_gz = DEST / gz_name
        out_tif = DEST / tif_name

        if out_tif.exists() and out_tif.stat().st_size > 1024:
            n_skip += 1
            continue

        url = f"{BASE}/{gz_name}"
        print(f"  {y}-{m:02d}: downloading...", end=" ", flush=True)
        try:
            fetch(url, out_gz)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"NOT YET PUBLISHED ({e.code})")
                n_404 += 1
                continue
            raise
        # gunzip
        with gzip.open(out_gz, "rb") as src, out_tif.open("wb") as dst:
            shutil.copyfileobj(src, dst)
        out_gz.unlink()
        size_kb = out_tif.stat().st_size // 1024
        print(f"OK  ({size_kb} KB)")
        n_dl += 1

    print(f"\nSummary: downloaded={n_dl}, cached={n_skip}, not-yet-published={n_404}, total={total_months}")
    if n_404 > 0:
        print("NOTE: Some recent months are not yet published. Re-run later, or accept gaps for those months.")


if __name__ == "__main__":
    main()
