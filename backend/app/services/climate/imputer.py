"""Hierarchical imputation for missing climate cells.

Stub for Phase 1. Real implementation in Phase 3 ports
`temp/climate-pipeline/07_impute_climate.py`. Fallback tiers:
(region, zone, month) -> (region, month) -> (month) -> (region).
"""
from __future__ import annotations

from typing import Any


def impute_missing(
    rows: list[dict[str, Any]],
    *,
    column: str,
) -> list[dict[str, Any]]:
    """Fill nulls in `column` using the hierarchical fallback. Returns new rows
    with `data_source` set to 'imputed_hierarchical' or 'imputed_baseline'.
    """
    raise NotImplementedError("Implemented in Phase 3")
