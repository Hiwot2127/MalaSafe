"""Monthly Close foundation: model versioning, close orchestration, backtest, drift.

Revision ID: 003_monthly_close
Revises: 002_extend_for_ml
Create Date: 2026-05-17 12:00:00.000000

Foundation for the Monthly Close upload feature. Four new tables and a
handful of column additions on existing tables.

New tables
----------
- model_versions     — registry of LightGBM artifact bundles. One row per
                       trained model; partial unique index keeps exactly
                       one row with status='active' at any time.
- monthly_closes     — one row per uploaded malaria CSV that triggers the
                       closing pipeline. Tracks orchestration state.
- backtest_results   — predicted-vs-actual per district per close, with
                       the model version that produced the prediction.
- drift_findings     — 3σ anomalies detected per (district, metric) for a
                       close. Drives the drift-triggered retrain.

Column additions
----------------
- climate_data:    is_provisional (CHIRPS preliminary vs final),
                   data_source (chirps/era5/manual/imputed). Plus a
                   unique (district_id, date) so the climate-fetch
                   service can upsert idempotently.
- malaria_data:    tests (optional column — closes model card caveat #6).
- predictions:     q10, q90 (interval bounds — predictor already computes
                   them, we stop discarding the output).
- uploaded_files:  row_count, month_span (cheap downstream branching:
                   small upload = monthly close, big upload = backfill).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_monthly_close'
down_revision = '002_extend_for_ml'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. uploaded_files: branch hints (row_count, month_span)
    # ------------------------------------------------------------------
    op.add_column('uploaded_files', sa.Column('row_count', sa.Integer(), nullable=True))
    op.add_column('uploaded_files', sa.Column('month_span', sa.Integer(), nullable=True))

    # ------------------------------------------------------------------
    # 2. climate_data: provenance + provisional flag + idempotent upserts
    # ------------------------------------------------------------------
    op.add_column(
        'climate_data',
        sa.Column('is_provisional', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        'climate_data',
        sa.Column('data_source', sa.String(20), nullable=False, server_default='manual_upload'),
    )
    op.create_check_constraint(
        'check_climate_data_source',
        'climate_data',
        "data_source IN ('manual_upload', 'chirps', 'era5', 'imputed_hierarchical', 'imputed_baseline')",
    )
    # Existing rows arrived via the legacy CSV path — mark them final manual_upload.
    op.execute(
        "UPDATE climate_data SET is_provisional = false, data_source = 'manual_upload' "
        "WHERE data_source IS NULL OR data_source = 'manual_upload'"
    )
    op.create_unique_constraint(
        'uq_climate_data_district_date',
        'climate_data',
        ['district_id', 'date'],
    )

    # ------------------------------------------------------------------
    # 3. malaria_data: optional tests column (model card caveat #6)
    # ------------------------------------------------------------------
    op.add_column('malaria_data', sa.Column('tests', sa.Integer(), nullable=True))
    op.create_check_constraint(
        'check_tests_non_negative',
        'malaria_data',
        'tests IS NULL OR tests >= 0',
    )

    # ------------------------------------------------------------------
    # 4. predictions: q10 / q90 interval bounds
    # ------------------------------------------------------------------
    op.add_column('predictions', sa.Column('q10', sa.Float(), nullable=True))
    op.add_column('predictions', sa.Column('q90', sa.Float(), nullable=True))

    # ------------------------------------------------------------------
    # 5. model_versions: registry of trained artifacts
    # ------------------------------------------------------------------
    op.create_table(
        'model_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('version', sa.String(50), nullable=False, unique=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('artifacts_path', sa.String(512), nullable=False),
        sa.Column('model_card_json', postgresql.JSONB(), nullable=True),
        sa.Column('risk_thresholds_json', postgresql.JSONB(), nullable=True),
        sa.Column('trained_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('promoted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'promoted_by_user_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('train_data_window_start', sa.Date(), nullable=True),
        sa.Column('train_data_window_end', sa.Date(), nullable=True),
        sa.Column(
            'parent_version_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('model_versions.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.CheckConstraint(
            "status IN ('candidate', 'active', 'archived', 'rolled_back')",
            name='check_model_version_status',
        ),
    )
    op.create_index('ix_model_versions_status', 'model_versions', ['status'])
    # Exactly one active row at a time.
    op.create_index(
        'uq_model_versions_active',
        'model_versions',
        ['status'],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )

    # ------------------------------------------------------------------
    # 6. monthly_closes: one row per close run
    # ------------------------------------------------------------------
    op.create_table(
        'monthly_closes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('month', sa.Date(), nullable=False),
        sa.Column(
            'uploaded_file_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('uploaded_files.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'triggered_by_user_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('mode', sa.String(20), nullable=False),
        sa.Column('status', sa.String(30), nullable=False, server_default='pending'),
        sa.Column('idempotency_key', sa.String(128), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('stats_json', postgresql.JSONB(), nullable=True),
        sa.CheckConstraint(
            "mode IN ('close', 'backfill')",
            name='check_monthly_close_mode',
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'climate_fetching', 'backtesting', 'drift_checking', "
            "'predicting', 'completed', 'failed')",
            name='check_monthly_close_status',
        ),
    )
    op.create_index('ix_monthly_closes_month', 'monthly_closes', ['month'])
    op.create_index('ix_monthly_closes_status', 'monthly_closes', ['status'])

    # ------------------------------------------------------------------
    # 7. backtest_results: predicted vs actual per district per close
    # ------------------------------------------------------------------
    op.create_table(
        'backtest_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'monthly_close_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('monthly_closes.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'model_version_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('model_versions.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column(
            'district_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('districts.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('month', sa.Date(), nullable=False),
        sa.Column('actual_cases', sa.Integer(), nullable=False),
        sa.Column('predicted_cases', sa.Float(), nullable=False),
        sa.Column('predicted_risk', sa.String(20), nullable=True),
        sa.Column('q10', sa.Float(), nullable=True),
        sa.Column('q90', sa.Float(), nullable=True),
        sa.Column('abs_error', sa.Float(), nullable=False),
        sa.Column('pct_error', sa.Float(), nullable=True),
        sa.Column('within_q10_q90', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('monthly_close_id', 'district_id', name='uq_backtest_close_district'),
    )
    op.create_index('ix_backtest_close', 'backtest_results', ['monthly_close_id'])
    op.create_index('ix_backtest_model_month', 'backtest_results', ['model_version_id', 'month'])

    # ------------------------------------------------------------------
    # 8. drift_findings: 3σ anomalies per (district, metric)
    # ------------------------------------------------------------------
    op.create_table(
        'drift_findings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'monthly_close_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('monthly_closes.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'district_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('districts.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('metric', sa.String(30), nullable=False),
        sa.Column('observed_value', sa.Float(), nullable=False),
        sa.Column('baseline_mean', sa.Float(), nullable=False),
        sa.Column('baseline_std', sa.Float(), nullable=False),
        sa.Column('z_score', sa.Float(), nullable=False),
        sa.Column('severity', sa.String(10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "metric IN ('cases', 'rainfall', 'temp', 'humidity')",
            name='check_drift_metric',
        ),
        sa.CheckConstraint(
            "severity IN ('warn', 'critical')",
            name='check_drift_severity',
        ),
    )
    op.create_index('ix_drift_close_severity', 'drift_findings', ['monthly_close_id', 'severity'])


def downgrade() -> None:
    # Reverse order: drop FKs before parents.
    op.drop_index('ix_drift_close_severity', table_name='drift_findings')
    op.drop_table('drift_findings')

    op.drop_index('ix_backtest_model_month', table_name='backtest_results')
    op.drop_index('ix_backtest_close', table_name='backtest_results')
    op.drop_table('backtest_results')

    op.drop_index('ix_monthly_closes_status', table_name='monthly_closes')
    op.drop_index('ix_monthly_closes_month', table_name='monthly_closes')
    op.drop_table('monthly_closes')

    op.drop_index('uq_model_versions_active', table_name='model_versions')
    op.drop_index('ix_model_versions_status', table_name='model_versions')
    op.drop_table('model_versions')

    op.drop_column('predictions', 'q90')
    op.drop_column('predictions', 'q10')

    op.drop_constraint('check_tests_non_negative', 'malaria_data', type_='check')
    op.drop_column('malaria_data', 'tests')

    op.drop_constraint('uq_climate_data_district_date', 'climate_data', type_='unique')
    op.drop_constraint('check_climate_data_source', 'climate_data', type_='check')
    op.drop_column('climate_data', 'data_source')
    op.drop_column('climate_data', 'is_provisional')

    op.drop_column('uploaded_files', 'month_span')
    op.drop_column('uploaded_files', 'row_count')
