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
    
    # MalariaData - frequently queried by district + date
    op.create_index(
        'idx_malaria_district_year_month',
        'malaria_data',
        ['district_id', 'year', 'month'],
        unique=False
    )
    
    # Predictions - latest prediction per district
    op.create_index(
        'idx_predictions_district_date',
        'predictions',
        ['district_id', 'prediction_date', 'created_at'],
        unique=False
    )
    
    # Alerts - active alerts by district
    op.create_index(
        'idx_alerts_active_district',
        'alerts',
        ['is_active', 'district_id', 'created_at'],
        unique=False
    )
    
    # ClimateData - zonal stats queries
    op.create_index(
        'idx_climate_district_date',
        'climate_data',
        ['district_id', 'date'],
        unique=False
    )
    
    # AuditLogs - admin queries by user/action
    op.create_index(
        'idx_audit_user_action_timestamp',
        'audit_logs',
        ['user_id', 'action', 'timestamp'],
        unique=False
    )
    
    # UploadedFiles - status queries
    op.create_index(
        'idx_uploaded_files_status_date',
        'uploaded_files',
        ['status', 'uploaded_at'],
        unique=False
    )


def downgrade():
    """Remove performance indexes."""
    op.drop_index('idx_malaria_district_year_month', table_name='malaria_data')
    op.drop_index('idx_predictions_district_date', table_name='predictions')
    op.drop_index('idx_alerts_active_district', table_name='alerts')
    op.drop_index('idx_climate_district_date', table_name='climate_data')
    op.drop_index('idx_audit_user_action_timestamp', table_name='audit_logs')
    op.drop_index('idx_uploaded_files_status_date', table_name='uploaded_files')
