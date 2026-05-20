"""Align malaria_data + drift + backtest schema to real processed data.

Revision ID: 004_align_malaria_schema
Revises: 003_monthly_close
Create Date: 2026-05-20 12:00:00.000000

Realigns the surveillance schema to match the actual processed CSV
(columns: orgunitlevel*, Eth_Month_Year, Travel, Positive, Tests,
Positivity_Rate). Drops `deaths` (always 0 in real data), renames
`cases` -> `positive`, adds `travel`. Updates drift metric label and
backtest column names to match.
"""
from alembic import op
import sqlalchemy as sa


revision = '004_align_malaria_schema'
down_revision = '003_monthly_close'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add new columns nullable so backfill is safe.
    op.add_column('malaria_data', sa.Column('positive', sa.Integer(), nullable=True))
    op.add_column('malaria_data', sa.Column('travel', sa.Integer(), nullable=True))
    op.create_check_constraint('check_positive_non_negative', 'malaria_data', 'positive >= 0')
    op.create_check_constraint('check_travel_non_negative', 'malaria_data', 'travel IS NULL OR travel >= 0')

    # 2. Backfill positive from legacy `cases`.
    op.execute('UPDATE malaria_data SET positive = cases')

    # 3. Lock down `positive`.
    op.alter_column('malaria_data', 'positive', nullable=False)

    # 4. Drop legacy deaths constraints + columns.
    op.drop_constraint('check_deaths_not_exceed_cases', 'malaria_data', type_='check')
    op.drop_constraint('check_deaths_non_negative', 'malaria_data', type_='check')
    op.drop_constraint('check_cases_non_negative', 'malaria_data', type_='check')
    op.drop_column('malaria_data', 'deaths')
    op.drop_column('malaria_data', 'cases')

    # 5. drift_findings: relabel metric and rebuild CHECK.
    op.drop_constraint('check_drift_metric', 'drift_findings', type_='check')
    op.execute("UPDATE drift_findings SET metric = 'positive' WHERE metric = 'cases'")
    op.create_check_constraint(
        'check_drift_metric',
        'drift_findings',
        "metric IN ('positive', 'rainfall', 'temp', 'humidity')",
    )

    # 6. backtest_results: rename columns.
    op.alter_column('backtest_results', 'actual_cases', new_column_name='actual_positive')
    op.alter_column('backtest_results', 'predicted_cases', new_column_name='predicted_positive')


def downgrade() -> None:
    # Symmetric reverse.
    op.alter_column('backtest_results', 'predicted_positive', new_column_name='predicted_cases')
    op.alter_column('backtest_results', 'actual_positive', new_column_name='actual_cases')

    op.drop_constraint('check_drift_metric', 'drift_findings', type_='check')
    op.execute("UPDATE drift_findings SET metric = 'cases' WHERE metric = 'positive'")
    op.create_check_constraint(
        'check_drift_metric',
        'drift_findings',
        "metric IN ('cases', 'rainfall', 'temp', 'humidity')",
    )

    # Recreate legacy columns nullable, backfill cases from positive, then lock.
    op.add_column('malaria_data', sa.Column('cases', sa.Integer(), nullable=True))
    op.add_column('malaria_data', sa.Column('deaths', sa.Integer(), nullable=True, server_default='0'))
    op.execute('UPDATE malaria_data SET cases = positive')
    op.execute('UPDATE malaria_data SET deaths = 0 WHERE deaths IS NULL')
    op.alter_column('malaria_data', 'cases', nullable=False)
    op.alter_column('malaria_data', 'deaths', nullable=False, server_default='0')

    op.create_check_constraint('check_cases_non_negative', 'malaria_data', 'cases >= 0')
    op.create_check_constraint('check_deaths_non_negative', 'malaria_data', 'deaths >= 0')
    op.create_check_constraint('check_deaths_not_exceed_cases', 'malaria_data', 'deaths <= cases')

    op.drop_constraint('check_travel_non_negative', 'malaria_data', type_='check')
    op.drop_constraint('check_positive_non_negative', 'malaria_data', type_='check')
    op.drop_column('malaria_data', 'travel')
    op.drop_column('malaria_data', 'positive')
