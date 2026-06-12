"""add organisationunitid to districts

Revision ID: 009
Revises: 008
Create Date: 2026-06-02

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade():
    """Add organisationunitid column to districts table for DHIS2 facility mapping."""
    # Add organisationunitid column
    op.add_column('districts', 
        sa.Column('organisationunitid', sa.String(50), nullable=True)
    )
    
    # Add index for faster lookups
    op.create_index(
        'idx_district_orgunitid', 
        'districts', 
        ['organisationunitid'], 
        unique=False
    )


def downgrade():
    """Remove organisationunitid column."""
    op.drop_index('idx_district_orgunitid', table_name='districts')
    op.drop_column('districts', 'organisationunitid')
