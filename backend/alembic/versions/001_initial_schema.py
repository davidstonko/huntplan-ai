"""Initial schema — baseline for existing production database.

Revision ID: 001_initial
Revises:
Create Date: 2026-04-02

This migration represents the existing production schema.
Run `alembic stamp head` on existing databases to mark them as up-to-date.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all tables for initial schema."""
    # Users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('handle', sa.String(64), unique=True, nullable=False),
        sa.Column('device_token', sa.String(256), unique=True, nullable=False),
        sa.Column('email', sa.String(256), unique=True, nullable=True),
        sa.Column('email_verified', sa.Boolean(), default=False),
        sa.Column('experience_level', sa.String(32), nullable=True),
        sa.Column('preferred_species', sa.Text(), nullable=True),
        sa.Column('home_county', sa.String(128), nullable=True),
        sa.Column('home_state', sa.String(2), nullable=True),
        sa.Column('last_lat', sa.Float(), nullable=True),
        sa.Column('last_lon', sa.Float(), nullable=True),
        sa.Column('reputation_score', sa.Integer(), default=0),
        sa.Column('reports_posted', sa.Integer(), default=0),
        sa.Column('reports_upvoted', sa.Integer(), default=0),
        sa.Column('is_verified_hunter', sa.Boolean(), default=False),
        sa.Column('notification_preferences', postgresql.JSONB(), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_admin', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_active_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table('users')
