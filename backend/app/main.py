"""
HuntPlan AI — FastAPI Application Entry Point

Standalone AI-powered hunting planning app.
iPhone-first with offline GIS data. Maryland pilot state.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

from app.config import settings
from app.db.database import init_db
from app.modules.regulations.routes import router as regulations_router
from app.modules.lands.routes import router as lands_router
from app.modules.ai_planner.routes import router as ai_planner_router
from app.modules.social.routes import router as social_router
from app.modules.integrations.routes import router as integrations_router
from app.modules.auth.routes import router as auth_router
from app.modules.deercamp.routes import router as deercamp_router
from app.modules.export.routes import router as export_router
from app.modules.notifications.routes import router as notifications_router

async def auto_ingest_if_empty():
    """Seed regulation chunks on first deploy (if table is empty)."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        from sqlalchemy import text
        from app.db.database import async_session
        async with async_session() as session:
            result = await session.execute(text("SELECT COUNT(*) FROM regulation_chunks"))
            count = result.scalar()
            if count and count > 0:
                logger.info(f"RAG knowledge base already has {count} chunks — skipping ingestion")
                return

        logger.info("Empty knowledge base detected — running auto-ingestion...")
        import uuid
        from app.db.database import engine
        from app.models.rag import RegulationChunk
        from scripts.ingest_regulations import (
            build_season_chunks, build_wma_chunks, build_county_chunks,
            build_bag_limit_chunks, build_general_chunks,
        )

        all_chunks = []
        all_chunks.extend(build_season_chunks())
        all_chunks.extend(build_wma_chunks())
        all_chunks.extend(build_county_chunks())
        all_chunks.extend(build_bag_limit_chunks())
        all_chunks.extend(build_general_chunks())

        async with async_session() as session:
            for chunk_data in all_chunks:
                chunk = RegulationChunk(
                    id=str(uuid.uuid4()),
                    content=chunk_data["content"],
                    title=chunk_data["title"],
                    state="MD",
                    category=chunk_data["category"],
                    species=chunk_data["species"],
                    county=chunk_data["county"],
                    source=chunk_data["source"],
                    extra_data=chunk_data["extra_data"],
                    regulation_year="2025-2026",
                )
                session.add(chunk)
            await session.commit()

        async with engine.begin() as conn:
            await conn.execute(text("""
                UPDATE regulation_chunks
                SET search_vector = to_tsvector('english', title || ' ' || content)
                WHERE state = 'MD'
            """))

        logger.info(f"Auto-ingestion complete: {len(all_chunks)} chunks loaded")
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Auto-ingestion skipped: {e}")


@asynccontextmanager
async def lifespan(app):
    """Initialize database tables and seed data on startup."""
    await init_db()
    await auto_ingest_if_empty()
    yield


app = FastAPI(
    lifespan=lifespan,
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI-powered hunting planning API. "
        "Provides regulation queries, public land search, AI hunt planning, "
        "anonymous social networking, and external data integrations."
    ),
)

# CORS — allow React Native app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health check ---

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
    }


# --- Register module routers ---

app.include_router(regulations_router, prefix="/api/v1/regulations", tags=["Regulations"])
app.include_router(lands_router, prefix="/api/v1/lands", tags=["Lands"])
app.include_router(ai_planner_router, prefix="/api/v1/planner", tags=["AI Planner"])
app.include_router(social_router, prefix="/api/v1/social", tags=["Social"])
app.include_router(integrations_router, prefix="/api/v1/integrations", tags=["Integrations"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(deercamp_router, prefix="/api/v1/deercamp", tags=["Deer Camp"])
app.include_router(export_router, prefix="/api/v1/export", tags=["Export"])
app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["Notifications"])


@app.get("/")
async def root():
    return {
        "message": "Welcome to HuntPlan AI",
        "docs": "/docs",
        "disclaimer": (
            "HuntPlan AI is a planning tool. Always verify hunting regulations "
            "with your state Department of Natural Resources before hunting. "
            "This is not legal advice."
        ),
    }
