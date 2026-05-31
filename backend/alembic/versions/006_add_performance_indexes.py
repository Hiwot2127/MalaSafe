"""Add performance indexes for production optimization

Revision ID: 006_add_performance_indexes
Revises: 005_add_audit_logs
Create Date: 2026-05-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_add_performance_indexes'
down_revision = '005_add_audit_logs'
branch_labels = None
depends_on = None


def upgrade():
    """Add missing indexes for query performance."""
    
    # (idx_malaria_district_year_month is already created in 001_add_malaria_surveillance_models)
    
    # Predictions - latest prediction per district
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_predictions_district_date '
        'ON predictions (district_id, prediction_date, created_at)'
    )
    
    # Alerts - active alerts by district
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_alerts_active_district '
        'ON alerts (is_active, district_id, created_at)'
    )
    
    # ClimateData - zonal stats queries
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_climate_district_date '
        'ON climate_data (district_id, date)'
    )
    
    # AuditLogs - admin queries by user/action
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_audit_user_action_timestamp '
        'ON audit_logs (actor_id, action, timestamp)'
    )
    
    # (idx_uploaded_files_status_date removed because status/uploaded_at columns do not exist)


def downgrade():
    """Remove performance indexes."""
    # idx_malaria_district_year_month will be dropped by 001 downgrade
    op.execute('DROP INDEX IF EXISTS idx_predictions_district_date')
    op.execute('DROP INDEX IF EXISTS idx_alerts_active_district')
    op.execute('DROP INDEX IF EXISTS idx_climate_district_date')
    op.execute('DROP INDEX IF EXISTS idx_audit_user_action_timestamp')
    # idx_uploaded_files_status_date removed
