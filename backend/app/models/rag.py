"""
RAG Knowledge Base — Regulation Chunks for AI Retrieval

Stores chunked regulation text with full-text search vectors
for retrieval-augmented generation with Claude.
"""

from sqlalchemy import Column, String, Text, DateTime, Integer, Index, func
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from app.db.database import Base
import uuid


class RegulationChunk(Base):
    """
    A searchable chunk of regulation text.

    Each chunk is a self-contained piece of hunting regulation info
    (e.g., one season's dates, one county's rules, one species' bag limits)
    with metadata for filtering and full-text search for retrieval.
    """
    __tablename__ = "regulation_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Content
    content = Column(Text, nullable=False)       # The actual text chunk
    title = Column(String(500), nullable=False)   # Short title for display

    # Classification
    state = Column(String(2), nullable=False, default="MD")   # State code
    category = Column(String(100), nullable=False)  # season, bag_limit, weapon, land, sunday, license, general
    species = Column(String(100), nullable=True)     # deer, turkey, waterfowl, bear, etc.
    county = Column(String(100), nullable=True)      # County name if county-specific

    # Source tracking
    source = Column(String(500), nullable=True)      # "MD DNR Hunter's Guide", "eRegulations", etc.
    source_url = Column(String(1000), nullable=True)  # URL to original source

    # Extra data (flexible JSONB for season dates, weapon types, etc.)
    # Note: can't use 'metadata' — reserved by SQLAlchemy DeclarativeBase
    extra_data = Column(JSONB, nullable=True)

    # Full-text search vector (auto-populated by trigger or manual update)
    search_vector = Column(TSVECTOR)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Regulation year (so we can version data annually)
    regulation_year = Column(String(20), nullable=False, default="2025-2026")

    __table_args__ = (
        Index("ix_regulation_chunks_search", "search_vector", postgresql_using="gin"),
        Index("ix_regulation_chunks_state", "state"),
        Index("ix_regulation_chunks_category", "category"),
        Index("ix_regulation_chunks_species", "species"),
    )

    def __repr__(self):
        return f"<RegulationChunk {self.title[:50]}>"
