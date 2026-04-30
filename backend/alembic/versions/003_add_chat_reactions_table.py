"""Add camp_message_reactions table for chat message reactions.

Revision ID: 003_chat_reactions
Revises: 002_camp_messages
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003_chat_reactions'
down_revision = '002_camp_messages'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create camp_message_reactions table for emoji reactions on messages."""
    op.create_table(
        'camp_message_reactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('camp_messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('username', sa.String(64), nullable=False),
        sa.Column('emoji', sa.String(16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )
    op.create_index('ix_reaction_message', 'camp_message_reactions', ['message_id'])
    op.create_unique_constraint('ix_reaction_unique', 'camp_message_reactions', ['message_id', 'user_id', 'emoji'])


def downgrade() -> None:
    """Drop camp_message_reactions table."""
    op.drop_constraint('ix_reaction_unique', 'camp_message_reactions', type_='unique')
    op.drop_index('ix_reaction_message', table_name='camp_message_reactions')
    op.drop_table('camp_message_reactions')
