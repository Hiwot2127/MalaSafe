"""add prediction_factors JSONB to predictions

Stores the signed top SHAP drivers behind each prediction as structured JSON
(one object per factor: feature_name, label, impact, value, direction) so the
dashboard renders authoritative up/down arrows instead of guessing direction
from the wording of the human-readable `prediction_reason` string.

Revision ID: 011
Revises: 010
Create Date: 2026-06-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent add: the local Docker DB is auto-seeded from models on startup,
    # so the column may already exist there even before this migration runs.
    op.execute(
        "ALTER TABLE predictions "
        "ADD COLUMN IF NOT EXISTS prediction_factors JSONB"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE predictions DROP COLUMN IF EXISTS prediction_factors")
