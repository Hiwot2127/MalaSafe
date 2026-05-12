"""Add malaria surveillance models

Revision ID: 001_malaria_models
Revises: 
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '001_malaria_models'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('district_id', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('email', name='uq_users_email'),
        sa.Index('ix_users_id', 'id'),
        sa.Index('ix_users_email', 'email'),
        sa.Index('ix_users_role', 'role'),
    )
    
    # Create districts table
    op.create_table(
        'districts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('district_code', sa.String(50), nullable=False),
        sa.Column('district_name', sa.String(100), nullable=False),
        sa.Column('region', sa.String(100), nullable=False),
        sa.Column('zone', sa.String(100), nullable=True),
        sa.Column('geojson_key', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('district_code', name='uq_districts_code'),
        sa.Index('ix_districts_id', 'id'),
        sa.Index('ix_districts_code', 'district_code'),
        sa.Index('ix_districts_name', 'district_name'),
        sa.Index('ix_districts_region', 'region'),
    )
    
    # Create malaria_data table
    op.create_table(
        'malaria_data',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('week', sa.Integer(), nullable=True),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('cases', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('deaths', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['district_id'], ['districts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ondelete='SET NULL'),
        sa.CheckConstraint('cases >= 0', name='check_cases_non_negative'),
        sa.CheckConstraint('deaths >= 0', name='check_deaths_non_negative'),
        sa.CheckConstraint('deaths <= cases', name='check_deaths_not_exceed_cases'),
        sa.CheckConstraint('week >= 1 AND week <= 53', name='check_valid_week'),
        sa.CheckConstraint('month >= 1 AND month <= 12', name='check_valid_month'),
        sa.CheckConstraint('year >= 2000 AND year <= 2100', name='check_valid_year'),
        sa.Index('ix_malaria_data_id', 'id'),
        sa.Index('ix_malaria_data_district_id', 'district_id'),
        sa.Index('ix_malaria_data_source_type', 'source_type'),
        sa.Index('ix_malaria_data_month', 'month'),
        sa.Index('ix_malaria_data_year', 'year'),
        sa.Index('ix_malaria_data_uploaded_by', 'uploaded_by'),
        sa.Index('ix_malaria_data_created_at', 'created_at'),
        sa.Index('idx_malaria_district_year_month', 'district_id', 'year', 'month'),
        sa.Index('idx_malaria_year_month', 'year', 'month'),
    )
    
    # Create climate_data table
    op.create_table(
        'climate_data',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rainfall', sa.Float(), nullable=True),
        sa.Column('temperature', sa.Float(), nullable=True),
        sa.Column('season', sa.String(50), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['district_id'], ['districts.id'], ondelete='CASCADE'),
        sa.CheckConstraint('rainfall >= 0', name='check_rainfall_non_negative'),
        sa.CheckConstraint('temperature >= -50 AND temperature <= 60', name='check_valid_temperature'),
        sa.Index('ix_climate_data_id', 'id'),
        sa.Index('ix_climate_data_district_id', 'district_id'),
        sa.Index('ix_climate_data_season', 'season'),
        sa.Index('ix_climate_data_date', 'date'),
        sa.Index('idx_climate_district_date', 'district_id', 'date'),
    )
    
    # Create district_environment table
    op.create_table(
        'district_environment',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('altitude', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['district_id'], ['districts.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('district_id', name='uq_district_environment_district'),
        sa.CheckConstraint('altitude >= -500 AND altitude <= 9000', name='check_valid_altitude'),
        sa.Index('ix_district_environment_id', 'id'),
        sa.Index('ix_district_environment_district_id', 'district_id'),
    )
    
    # Create predictions table
    op.create_table(
        'predictions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('risk_level', sa.String(20), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('prediction_score', sa.Float(), nullable=False),
        sa.Column('prediction_reason', sa.Text(), nullable=True),
        sa.Column('prediction_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['district_id'], ['districts.id'], ondelete='CASCADE'),
        sa.CheckConstraint('confidence_score >= 0 AND confidence_score <= 1', name='check_valid_confidence'),
        sa.CheckConstraint("risk_level IN ('low', 'moderate', 'high', 'very_high')", name='check_valid_risk_level'),
        sa.Index('ix_predictions_id', 'id'),
        sa.Index('ix_predictions_district_id', 'district_id'),
        sa.Index('ix_predictions_risk_level', 'risk_level'),
        sa.Index('ix_predictions_prediction_date', 'prediction_date'),
        sa.Index('ix_predictions_created_at', 'created_at'),
        sa.Index('idx_prediction_district_date', 'district_id', 'prediction_date'),
        sa.Index('idx_prediction_date_risk', 'prediction_date', 'risk_level'),
    )
    
    # Create alerts table
    op.create_table(
        'alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('district_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('risk_level', sa.String(20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['district_id'], ['districts.id'], ondelete='CASCADE'),
        sa.CheckConstraint("risk_level IN ('low', 'moderate', 'high', 'very_high')", name='check_alert_valid_risk_level'),
        sa.Index('ix_alerts_id', 'id'),
        sa.Index('ix_alerts_district_id', 'district_id'),
        sa.Index('ix_alerts_risk_level', 'risk_level'),
        sa.Index('ix_alerts_is_active', 'is_active'),
        sa.Index('ix_alerts_created_at', 'created_at'),
        sa.Index('idx_alert_district_active', 'district_id', 'is_active'),
        sa.Index('idx_alert_active_created', 'is_active', 'created_at'),
    )
    
    # Create uploaded_files table
    op.create_table(
        'uploaded_files',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('upload_type', sa.String(50), nullable=False),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ondelete='SET NULL'),
        sa.Index('ix_uploaded_files_id', 'id'),
        sa.Index('ix_uploaded_files_upload_type', 'upload_type'),
        sa.Index('ix_uploaded_files_uploaded_by', 'uploaded_by'),
        sa.Index('ix_uploaded_files_created_at', 'created_at'),
        sa.Index('idx_uploaded_file_type_date', 'upload_type', 'created_at'),
        sa.Index('idx_uploaded_file_uploader_date', 'uploaded_by', 'created_at'),
    )


def downgrade() -> None:
    op.drop_table('uploaded_files')
    op.drop_table('alerts')
    op.drop_table('predictions')
    op.drop_table('district_environment')
    op.drop_table('climate_data')
    op.drop_table('malaria_data')
    op.drop_table('districts')
    op.drop_table('users')
