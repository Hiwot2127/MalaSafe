"""add response recommendations

Revision ID: 007
Revises: 006
Create Date: 2026-05-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create response_recommendations table
    op.create_table(
        'response_recommendations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('prediction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('risk_level', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('recommendation_text', sa.Text(), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('trigger_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['district_id'], ['districts.id'], ),
        sa.ForeignKeyConstraint(['prediction_id'], ['predictions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_response_rec_prediction', 'response_recommendations', ['prediction_id'], unique=False)
    op.create_index('idx_response_rec_district', 'response_recommendations', ['district_id'], unique=False)
    op.create_index('idx_response_rec_priority', 'response_recommendations', ['priority'], unique=False)
    op.create_index('idx_response_rec_category', 'response_recommendations', ['category'], unique=False)
    op.create_index('idx_response_rec_created', 'response_recommendations', ['created_at'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_response_rec_created', table_name='response_recommendations')
    op.drop_index('idx_response_rec_category', table_name='response_recommendations')
    op.drop_index('idx_response_rec_priority', table_name='response_recommendations')
    op.drop_index('idx_response_rec_district', table_name='response_recommendations')
    op.drop_index('idx_response_rec_prediction', table_name='response_recommendations')
    
    # Drop table
    op.drop_table('response_recommendations')
