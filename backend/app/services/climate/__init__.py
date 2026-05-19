"""Server-side port of the offline climate-pipeline.

Stubs landed in Phase 1. Real implementation in Phase 3.
"""
from .climate_fetch_service import ClimateFetchService

__all__ = ["ClimateFetchService"]
