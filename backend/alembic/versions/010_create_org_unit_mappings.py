"""create org_unit_mappings table

Maps many DHIS2 organisation unit ids to one district. `districts.organisationunitid`
only holds a single id per district; this table carries the full many-to-one set so
malaria uploads can resolve every reporting unit.

Revision ID: 010
Revises: 009
Create Date: 2026-06-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'org_unit_mappings',
        sa.Column('org_unit_id', sa.String(50), primary_key=True),
        sa.Column('district_id', UUID(as_uuid=True), nullable=False),
        sa.Column('org_unit_name', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['district_id'], ['districts.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_org_unit_mappings_district_id', 'org_unit_mappings', ['district_id'])


def downgrade():
    op.drop_index('ix_org_unit_mappings_district_id', table_name='org_unit_mappings')
    op.drop_table('org_unit_mappings')
