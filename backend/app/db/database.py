"""
HuntPlan AI — Database Connection

PostgreSQL + PostGIS + pgvector via SQLAlchemy async.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables and enable extensions. Call on startup or via migration."""
    # Import all models so Base.metadata knows about every table
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        from sqlalchemy import text as sa_text
        # Enable PostGIS extension
        await conn.execute(sa_text("CREATE EXTENSION IF NOT EXISTS postgis"))
        # Enable pgvector if available (for future semantic search)
        try:
            await conn.execute(sa_text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception:
            pass  # pgvector not available on this database tier
        await conn.run_sync(Base.metadata.create_all)
