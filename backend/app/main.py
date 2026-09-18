"""
HuntPlan AI — FastAPI Application Entry Point

Standalone AI-powered hunting planning app.
iPhone-first with offline GIS data. Maryland pilot state.
"""

import asyncio
import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from contextlib import asynccontextmanager

from app.config import settings
from app.db.database import init_db, db_status, mark_db_ok, mark_db_down
from app.modules.regulations.routes import router as regulations_router
from app.modules.lands.routes import router as lands_router
from app.modules.ai_planner.routes import router as ai_planner_router
from app.modules.social.routes import router as social_router
from app.modules.integrations.routes import router as integrations_router
from app.modules.auth.routes import router as auth_router
from app.modules.deercamp.routes import router as deercamp_router
from app.modules.export.routes import router as export_router
from app.modules.notifications.routes import router as notifications_router
from app.modules.harvest.routes import router as harvest_router
from app.modules.websocket.routes import router as websocket_router
from app.modules.photos.routes import router as photos_router
from app.modules.forum.routes import router as forum_router
from app.modules.feedback.routes import router as feedback_router
from app.modules.analytics.routes import router as analytics_router
# V2.3 modules (added from huntplan-ai fork merge 2026-04-26)
from app.modules.camping.routes import router as camping_router
from app.modules.hiking.routes import router as hiking_router
from app.modules.landowner_blinds.routes import router as landowner_blinds_router
from app.modules.push.routes import router as push_router
# 2026-04-27: runtime config (Mapbox token + future per-tier flags)
from app.modules.config.routes import router as config_router

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


# ── Startup resilience ──────────────────────────────────────────
# 2026-09 incident: Render deletes free-tier Postgres after 90 days. The
# old lifespan awaited init_db() unguarded, so an unreachable DB made
# uvicorn exit with status 3 and took the whole API down (including
# endpoints that don't need the DB). Now: log, flag, keep serving, and
# retry in the background so a DB that comes back is picked up without
# a redeploy.
DB_RETRY_INTERVAL_SECONDS = 60
DB_RETRY_MAX_ATTEMPTS = 30  # ~30 minutes, then give up until next deploy

_logger = logging.getLogger(__name__)


async def _try_init_db(app) -> bool:
    """Run init_db + auto-ingest; update flags. Returns True on success."""
    try:
        await init_db()
        mark_db_ok()
        app.state.db_ok = True
        app.state.db_error = None
        _logger.info("Database initialized")
        # auto_ingest_if_empty swallows its own errors; run it only once
        # the schema is known-good so a fresh DB gets seeded.
        await auto_ingest_if_empty()
        return True
    except Exception as e:  # asyncpg/OSError/timeout — anything
        mark_db_down(e)
        app.state.db_ok = False
        app.state.db_error = str(e)[:500]
        _logger.error("Database init failed — serving in degraded mode: %s", e)
        return False


async def _db_retry_loop(app):
    """Background task: re-attempt init_db every N seconds, bounded."""
    for attempt in range(1, DB_RETRY_MAX_ATTEMPTS + 1):
        await asyncio.sleep(DB_RETRY_INTERVAL_SECONDS)
        _logger.info("DB retry %d/%d", attempt, DB_RETRY_MAX_ATTEMPTS)
        if await _try_init_db(app):
            _logger.info("Database recovered on retry %d", attempt)
            return
    _logger.error("Database still unavailable after %d retries; giving up", DB_RETRY_MAX_ATTEMPTS)


@asynccontextmanager
async def lifespan(app):
    """Initialize database tables and seed data on startup.

    Never raises: a DB failure sets app.state.db_ok=False and starts a
    background retry loop instead of crashing the process.
    """
    app.state.db_ok = True
    app.state.db_error = None
    retry_task = None
    if not await _try_init_db(app):
        retry_task = asyncio.create_task(_db_retry_loop(app))
    yield
    if retry_task and not retry_task.done():
        retry_task.cancel()


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
    """Always 200 so Render's health check keeps the instance up; the body
    says whether the DB is reachable. Existing fields (status/app/version)
    are unchanged; "db" and "db_error" are additive."""
    db_ok = db_status["ok"]
    return {
        "status": "ok" if db_ok else "degraded",
        "db": "ok" if db_ok else "unavailable",
        "db_error": db_status["error"],
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
app.include_router(harvest_router, prefix="/api/v1/harvest", tags=["Harvest Log"])
app.include_router(photos_router, prefix="/api/v1/photos", tags=["Photos"])
app.include_router(forum_router, prefix="/api/v1/forum", tags=["Forum & Marketplace"])
app.include_router(feedback_router, prefix="/api/v1/feedback", tags=["Feedback"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
# V2.3 modules
app.include_router(camping_router, prefix="/api/v1/camping", tags=["Camping"])
app.include_router(hiking_router, prefix="/api/v1/hiking", tags=["Hiking"])
app.include_router(landowner_blinds_router, tags=["Landowner Blinds"])
app.include_router(push_router, prefix="/api/v1", tags=["Push Notifications"])
app.include_router(config_router, prefix="/api/v1/config", tags=["Runtime Config"])

# WebSocket routes (no prefix — mounted at /ws/camps/{camp_id})
app.include_router(websocket_router, tags=["WebSocket"])


@app.get("/")
async def root():
    return {
        "message": "Welcome to MDHuntFishOutdoors API",
        "docs": "/docs",
        "dashboard": "/dashboard",
        "disclaimer": (
            "MDHuntFishOutdoors is a planning tool. Always verify hunting regulations "
            "with your state Department of Natural Resources before hunting. "
            "This is not legal advice."
        ),
    }


# ── Analytics Dashboard ──────────────────────────────────────────
# Serves the single-file React dashboard at /dashboard

DASHBOARD_PATH = Path(__file__).parent.parent.parent / "dashboard" / "index.html"


@app.get("/dashboard", response_class=HTMLResponse)
async def serve_dashboard():
    """Serve the analytics dashboard HTML page."""
    if DASHBOARD_PATH.exists():
        return HTMLResponse(content=DASHBOARD_PATH.read_text(encoding="utf-8"))
    return HTMLResponse(
        content="<h1>Dashboard not found</h1><p>Place dashboard/index.html in the project root.</p>",
        status_code=404,
    )
