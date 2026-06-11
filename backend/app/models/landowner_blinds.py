"""
Landowner Blind Sites model — user favorites and notes.

The MD DNR publishes ~2,000 landowner-registered blind sites as a public GeoJSON layer.
This model tracks user-specific metadata (favorites, personal notes) only.
The blind locations and permit numbers are stored client-side in mobile/src/data/landownerBlinds.ts.
"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class LandownerBlindFavorite(Base):
    """
    User favorite and notes for a landowner blind site.
    
    Attributes:
        id: Primary key
        user_id: Foreign key to User
        blind_id: DNR feature OBJECTID (string)
        notes: User's personal notes about the blind site
        created_at: Timestamp when favorited
    """
    __tablename__ = "landowner_blind_favorites"

    id = Column(Integer, primary_key=True)
    # users.id is UUID — an Integer FK here breaks create_all on a fresh DB
    # (asyncpg DatatypeMismatchError, found 2026-06-10 when the expired Render
    # Postgres was recreated from scratch). Must match users.id exactly.
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blind_id = Column(String(50), nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("User", back_populates="blind_favorites")

    def __repr__(self):
        return f"<LandownerBlindFavorite(user_id={self.user_id}, blind_id={self.blind_id})>"
