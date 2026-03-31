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

@asynccontextmanager
async def lifespan(app):
    """Initialize database tables on startup."""
    await init_db()
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
