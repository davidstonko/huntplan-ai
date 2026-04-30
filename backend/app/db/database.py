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
        # Self-heal schema drift for tables that existed before recent column
        # additions. SQLAlchemy's create_all never ALTERs existing tables, so
        # when the User model (and peers) grow new columns, previously-deployed
        # Postgres schemas diverge until we ALTER explicitly. These statements
        # are idempotent (ADD COLUMN IF NOT EXISTS) and safe to run on every
        # startup against any Postgres 9.6+ target.
        await _self_heal_schema_drift(conn)


async def _self_heal_schema_drift(conn):
    """Idempotent ALTER TABLE ADD COLUMN IF NOT EXISTS for columns added to
    existing models after initial deployment.

    Why this exists:
        We don't run alembic migrations yet — `init_db()` uses
        `Base.metadata.create_all()` on startup, which is fine for fresh DBs
        but cannot add columns to already-created tables. Any time a model
        grows a new column, previously-deployed environments break on INSERT
        with "column does not exist". This helper closes that gap.

    Every statement must be idempotent and non-destructive. SQLite does not
    support `ADD COLUMN IF NOT EXISTS`, so each statement is wrapped in a
    per-statement try/except — SQLite will raise on re-add but the in-memory
    test DB always starts fresh, so this branch is a no-op for tests.
    """
    from sqlalchemy import text as sa_text

    # Key = table, value = list of "column_name TYPE [DEFAULT ...]" clauses.
    # Types here must match the canonical Postgres column types produced by
    # the model's SQLAlchemy types (see app/models/user.py).
    drift_fixes = {
        "users": [
            "email VARCHAR(256)",
            "email_verified BOOLEAN DEFAULT FALSE",
            "experience_level VARCHAR(32)",
            "preferred_species TEXT",
            "home_county VARCHAR(128)",
            "home_state VARCHAR(2)",
            "last_lat DOUBLE PRECISION",
            "last_lon DOUBLE PRECISION",
            "reputation_score INTEGER DEFAULT 0",
            "reports_posted INTEGER DEFAULT 0",
            "reports_upvoted INTEGER DEFAULT 0",
            "is_verified_hunter BOOLEAN DEFAULT FALSE",
            "last_active_at TIMESTAMP WITH TIME ZONE",
        ],
    }

    dialect_name = conn.dialect.name  # 'postgresql' or 'sqlite' in tests
    if dialect_name != "postgresql":
        return  # only needed for the deployed Postgres; SQLite tests are always fresh

    for table, columns in drift_fixes.items():
        for col_clause in columns:
            stmt = f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_clause}"
            try:
                await conn.execute(sa_text(stmt))
            except Exception:
                # Table may not exist yet on a brand-new DB (create_all would
                # have built it above, so this should be impossible) — swallow
                # so a single bad clause never blocks app startup.
                pass
