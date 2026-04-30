"""Add camp_messages table for Deer Camp / Fish Camp chat.

Revision ID: 002_camp_messages
Revises: 001_initial
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '002_camp_messages'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create camp_messages table for real-time chat."""
    op.create_table(
        'camp_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('camp_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('deer_camps.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('username', sa.String(64), nullable=False),
        sa.Column('color', sa.String(16), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )
    op.create_index('ix_message_camp', 'camp_messages', ['camp_id'])
    op.create_index('ix_message_time', 'camp_messages', ['camp_id', 'created_at'])


def downgrade() -> None:
    """Drop camp_messages table."""
    op.drop_index('ix_message_time', table_name='camp_messages')
    op.drop_index('ix_message_camp', table_name='camp_messages')
    op.drop_table('camp_messages')
