"""add audit logs table

Revision ID: 005_add_audit_logs
Revises: 004_align_malaria_schema
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_add_audit_logs'
down_revision = '004_align_malaria_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('actor_email', sa.String(), nullable=True),
        sa.Column('actor_role', sa.String(), nullable=True),
        sa.Column('action', sa.String(), nullable=False, index=True),
        sa.Column('resource_type', sa.String(), nullable=False, index=True),
        sa.Column('resource_id', sa.String(), nullable=True, index=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('metadata', postgresql.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, index=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
    )
    
    # Create indexes for common queries
    op.create_index('ix_audit_logs_action_timestamp', 'audit_logs', ['action', 'timestamp'])
    op.create_index('ix_audit_logs_resource_type_timestamp', 'audit_logs', ['resource_type', 'timestamp'])


def downgrade() -> None:
    op.drop_index('ix_audit_logs_resource_type_timestamp', table_name='audit_logs')
    op.drop_index('ix_audit_logs_action_timestamp', table_name='audit_logs')
    op.drop_table('audit_logs')
