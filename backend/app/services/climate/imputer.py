"""Hierarchical imputation for missing climate cells.

Online port of `07_impute_climate.py`. The offline pipeline fills holes by
group-mean fallback through four tiers:

  1. (region, zone, month)  - closest spatial + temporal context
  2. (region, month)
  3. (month) across the country
  4. (region) across all time

For one-month online fetches there's no time variation, so the practical
tiers collapse to (region+zone), (region), and a global mean. The signature
keeps the same shape as the offline imputer so it stays comparable.

Input is a list of dicts, one per district:
    { "district_id", "adm3_pcode", "region", "zone", "rainfall", "temperature",
      "min_temp", "max_temp", "humidity", "data_source" }

Output: the same list mutated in place - every numeric column that was
``None`` is filled when possible, and ``data_source`` is updated to
``"imputed_hierarchical"`` (filled from a more local group) or
``"imputed_baseline"`` (fell through to the country-wide tier).
"""
from __future__ import annotations

from statistics import mean
from typing import Any, Iterable

from loguru import logger


CLIMATE_COLS = ("rainfall", "temperature", "min_temp", "max_temp", "humidity")


def impute_missing(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fill nulls in CLIMATE_COLS using hierarchical group means.

    Returns the same list (mutated in place) so callers can chain.
    """
    if not rows:
        return rows

    # Build the group lookup tables from rows that are fully observed (or at
    # least have the column we want to borrow).
    group_zone = _group_means(rows, ("region", "zone"))
    group_region = _group_means(rows, ("region",))
    global_mean = _group_means(rows, ())  # single empty-key entry

    n_imputed = 0
    n_baseline = 0
    for row in rows:
        missing_before = [c for c in CLIMATE_COLS if row.get(c) is None]
        if not missing_before:
            continue

        filled_local = False
        filled_baseline = False
        for col in missing_before:
            val = _lookup(group_zone, (row.get("region"), row.get("zone")), col)
            if val is None:
                val = _lookup(group_region, (row.get("region"),), col)
                if val is None:
                    val = _lookup(global_mean, (), col)
                    if val is not None:
                        filled_baseline = True
                else:
                    filled_local = True
            else:
                filled_local = True
            if val is not None:
                row[col] = round(val, 3 if col == "rainfall" else 2)

        # Don't downgrade rows already marked as a real source (chirps/era5);
        # only touch data_source on rows that came in as None/imputed already.
        existing_source = row.get("data_source")
        if existing_source in (None, "imputed_hierarchical", "imputed_baseline", "manual_upload"):
            if filled_local:
                row["data_source"] = "imputed_hierarchical"
                n_imputed += 1
            elif filled_baseline:
                row["data_source"] = "imputed_baseline"
                n_baseline += 1

    logger.info(f"imputed: hierarchical={n_imputed}, baseline={n_baseline}")
    return rows


def _group_means(
    rows: Iterable[dict[str, Any]],
    keys: tuple[str, ...],
) -> dict[tuple, dict[str, float]]:
    """Compute per-(group key) column means, ignoring None values."""
    buckets: dict[tuple, dict[str, list[float]]] = {}
    for row in rows:
        gk = tuple(row.get(k) for k in keys)
        bucket = buckets.setdefault(gk, {c: [] for c in CLIMATE_COLS})
        for c in CLIMATE_COLS:
            v = row.get(c)
            if v is not None:
                bucket[c].append(float(v))
    return {gk: {c: (mean(v) if v else None) for c, v in cols.items()} for gk, cols in buckets.items()}


def _lookup(
    table: dict[tuple, dict[str, float]],
    key: tuple,
    col: str,
) -> float | None:
    bucket = table.get(key)
    if bucket is None:
        return None
    return bucket.get(col)
