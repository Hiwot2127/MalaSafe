"""Extend districts + climate_data for ML model + unique (district, prediction_date).

Revision ID: 002_extend_for_ml
Revises: 001_malaria_models
Create Date: 2026-05-17 00:45:00.000000

Adds the geo + climate columns the LightGBM predictor reads, plus a uniqueness
constraint so backfill_predictions.py can upsert safely.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_extend_for_ml'
down_revision = '001_malaria_models'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- districts: geo properties + woreda P-code ----------------------------
    op.add_column('districts', sa.Column('adm3_pcode', sa.String(20), nullable=True))
    op.add_column('districts', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('districts', sa.Column('longitude', sa.Float(), nullable=True))
    op.add_column('districts', sa.Column('elevation_m', sa.Float(), nullable=True))
    op.create_unique_constraint('uq_districts_adm3_pcode', 'districts', ['adm3_pcode'])
    op.create_index('ix_districts_adm3_pcode', 'districts', ['adm3_pcode'])

    # --- climate_data: full ML feature set -----------------------------------
    op.add_column('climate_data', sa.Column('min_temp', sa.Float(), nullable=True))
    op.add_column('climate_data', sa.Column('max_temp', sa.Float(), nullable=True))
    op.add_column('climate_data', sa.Column('humidity', sa.Float(), nullable=True))

    # --- predictions: unique (district_id, prediction_date) for idempotent
    #     backfill + monthly upsert.
    op.create_unique_constraint(
        'uq_predictions_district_date',
        'predictions',
        ['district_id', 'prediction_date'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_predictions_district_date', 'predictions', type_='unique')

    op.drop_column('climate_data', 'humidity')
    op.drop_column('climate_data', 'max_temp')
    op.drop_column('climate_data', 'min_temp')

    op.drop_index('ix_districts_adm3_pcode', table_name='districts')
    op.drop_constraint('uq_districts_adm3_pcode', 'districts', type_='unique')
    op.drop_column('districts', 'elevation_m')
    op.drop_column('districts', 'longitude')
    op.drop_column('districts', 'latitude')
    op.drop_column('districts', 'adm3_pcode')
