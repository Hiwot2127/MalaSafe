"""Model version registry: list / get-active / promote / register-candidate.

Stub for Phase 1. Real implementation in Phase 5.
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ModelVersion


class ModelRegistryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_versions(self) -> list[ModelVersion]:
        raise NotImplementedError("Implemented in Phase 5")

    async def get_active(self) -> ModelVersion | None:
        raise NotImplementedError("Implemented in Phase 5")

    async def promote(self, version_id: UUID, user_id: UUID) -> ModelVersion:
        """Atomically archive the current active row and promote `version_id`.
        Calls `app.ai.invalidate_active()` so the predictor singleton reloads.
        """
        raise NotImplementedError("Implemented in Phase 5")

    async def register_candidate(
        self,
        *,
        version: str,
        artifacts_path: str,
        model_card_json: dict,
        risk_thresholds_json: dict,
        parent_version_id: UUID | None = None,
        notes: str | None = None,
    ) -> ModelVersion:
        raise NotImplementedError("Implemented in Phase 5")
