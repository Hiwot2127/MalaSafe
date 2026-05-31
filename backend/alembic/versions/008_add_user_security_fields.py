"""add user security fields

Revision ID: 008
Revises: 007
Create Date: 2026-05-30 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    """Add security fields to users table."""
    # Add new columns
    op.add_column('users', sa.Column('force_password_change', sa.Boolean(), nullable=True))
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('account_locked_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('last_login_ip', sa.String(), nullable=True))
    
    # Set default values for existing rows
    op.execute("UPDATE users SET force_password_change = false WHERE force_password_change IS NULL")
    op.execute("UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL")
    
    # Make columns non-nullable after setting defaults
    op.alter_column('users', 'force_password_change', nullable=False)
    op.alter_column('users', 'failed_login_attempts', nullable=False)
    
    # Add indexes for performance
    op.create_index('ix_users_account_locked_until', 'users', ['account_locked_until'])
    op.create_index('ix_users_last_login_at', 'users', ['last_login_at'])


def downgrade():
    """Remove security fields from users table."""
    op.drop_index('ix_users_last_login_at', table_name='users')
    op.drop_index('ix_users_account_locked_until', table_name='users')
    
    op.drop_column('users', 'last_login_ip')
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'account_locked_until')
    op.drop_column('users', 'failed_login_attempts')
    op.drop_column('users', 'force_password_change')
