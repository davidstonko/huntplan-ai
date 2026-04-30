#!/usr/bin/env python3
"""
Backend Verification Script — Validates all modules load correctly.

Usage:
    python verify_backend.py

Checks:
- All imports resolve
- Database connection (attempts to connect, may fail if DB down)
- Required config keys present
- All models registered
- All routers registered
"""

import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(levelname)-8s %(message)s')
logger = logging.getLogger(__name__)


def check_imports():
    """Verify all critical imports resolve."""
    logger.info("Checking imports...")

    checks = [
        ("FastAPI", "from fastapi import FastAPI"),
        ("SQLAlchemy async", "from sqlalchemy.ext.asyncio import AsyncSession"),
        ("Pydantic", "from pydantic import BaseModel"),
        ("Config", "from app.config import settings"),
        ("Database", "from app.db.database import engine, async_session, Base"),
        ("Auth models", "from app.models.user import User"),
        ("Deer Camp models", "from app.models.deercamp import DeerCamp, CampMember"),
        ("Auth service", "from app.modules.auth.service import generate_device_token"),
        ("Auth routes", "from app.modules.auth.routes import router"),
        ("Deer Camp routes", "from app.modules.deercamp.routes import router"),
        ("WebSocket manager", "from app.modules.websocket.manager import manager"),
    ]

    failed = []
    for name, import_stmt in checks:
        try:
            exec(import_stmt)
            logger.info(f"✓ {name}")
        except Exception as e:
            logger.error(f"✗ {name}: {e}")
            failed.append((name, str(e)))

    return len(failed) == 0, failed


def check_config():
    """Verify config loads and critical keys are set."""
    logger.info("Checking configuration...")

    try:
        from app.config import settings

        checks = [
            ("app_name", settings.app_name),
            ("app_version", settings.app_version),
            ("DATABASE_URL", settings.database_url),
            ("SECRET_KEY", settings.secret_key != "CHANGE-ME-IN-PRODUCTION"),
            ("access_token_expire_minutes", settings.access_token_expire_minutes > 0),
        ]

        failed = []
        for key, value in checks:
            if isinstance(value, bool):
                status = "✓" if value else "✗"
                logger.info(f"{status} {key}: {'set' if value else 'not set'}")
                if not value:
                    failed.append(key)
            else:
                logger.info(f"✓ {key}: {value}")

        return len(failed) == 0, failed
    except Exception as e:
        logger.error(f"Config load failed: {e}")
        return False, [str(e)]


def check_models():
    """Verify all models are registered with Base."""
    logger.info("Checking models...")

    try:
        from app.db.database import Base
        from app.models import (  # Triggers imports
            user, deercamp, harvest, forum, feedback, land, plan,
            regulation, rag, social
        )

        table_count = len(Base.metadata.tables)
        logger.info(f"✓ {table_count} tables registered")

        expected_tables = [
            "users", "deer_camps", "camp_members", "shared_annotations",
            "camp_photos", "camp_activity", "camp_messages", "camp_message_reactions",
        ]

        missing = [t for t in expected_tables if t not in Base.metadata.tables]
        if missing:
            logger.warning(f"⚠ Missing tables: {missing}")
            return False, missing

        logger.info(f"✓ All {len(expected_tables)} core tables present")
        return True, []
    except Exception as e:
        logger.error(f"Model check failed: {e}")
        return False, [str(e)]


def check_routers():
    """Verify all routers import and have endpoints."""
    logger.info("Checking routers...")

    routers = [
        ("Auth", "from app.modules.auth.routes import router"),
        ("Deer Camp", "from app.modules.deercamp.routes import router"),
        ("Notifications", "from app.modules.notifications.routes import router"),
        ("Photos", "from app.modules.photos.routes import router"),
        ("Regulations", "from app.modules.regulations.routes import router"),
        ("Lands", "from app.modules.lands.routes import router"),
        ("Social", "from app.modules.social.routes import router"),
        ("Harvest", "from app.modules.harvest.routes import router"),
        ("Forum", "from app.modules.forum.routes import router"),
        ("Export", "from app.modules.export.routes import router"),
        ("AI Planner", "from app.modules.ai_planner.routes import router"),
        ("Integrations", "from app.modules.integrations.routes import router"),
        ("Feedback", "from app.modules.feedback.routes import router"),
    ]

    failed = []
    for name, import_stmt in routers:
        try:
            namespace = {}
            exec(import_stmt, namespace)
            router = namespace["router"]
            routes = getattr(router, "routes", [])
            logger.info(f"✓ {name} ({len(routes)} routes)")
        except Exception as e:
            logger.error(f"✗ {name}: {e}")
            failed.append((name, str(e)))

    return len(failed) == 0, failed


async def check_database():
    """Attempt to connect to database and run a simple query."""
    logger.info("Checking database connection...")

    try:
        from app.db.database import async_session, engine
        from sqlalchemy import text

        async with async_session() as session:
            result = await session.execute(text("SELECT 1"))
            _ = result.scalar()

        logger.info("✓ Database connection successful")
        return True, []
    except Exception as e:
        logger.warning(f"⚠ Database connection failed (may not be running): {e}")
        return False, [str(e)]


def check_app_startup():
    """Verify the FastAPI app initializes without errors."""
    logger.info("Checking app startup...")

    try:
        from app.main import app

        # Check that routers are registered
        routes = app.routes
        api_routes = [r for r in routes if hasattr(r, 'path') and '/api/v1' in r.path]

        logger.info(f"✓ FastAPI app initialized ({len(api_routes)} API routes)")
        return True, []
    except Exception as e:
        logger.error(f"✗ App startup failed: {e}")
        return False, [str(e)]


async def main():
    """Run all checks."""
    logger.info("=" * 60)
    logger.info("MDHuntFishOutdoors Backend Verification")
    logger.info("=" * 60)

    results = []

    # Synchronous checks
    results.append(("Imports", check_imports()))
    results.append(("Configuration", check_config()))
    results.append(("Models", check_models()))
    results.append(("Routers", check_routers()))
    results.append(("App Startup", check_app_startup()))

    # Async checks
    db_ok, db_errors = await check_database()
    results.append(("Database", (db_ok, db_errors)))

    # Summary
    logger.info("=" * 60)
    logger.info("SUMMARY")
    logger.info("=" * 60)

    all_ok = True
    for check_name, (passed, errors) in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        logger.info(f"{status}: {check_name}")
        if errors:
            for error in errors:
                logger.info(f"       - {error}")
            all_ok = False

    logger.info("=" * 60)

    if all_ok:
        logger.info("✓ All checks passed! Backend is ready.")
        return 0
    else:
        logger.warning("✗ Some checks failed. Review above.")
        return 1


if __name__ == "__main__":
    import asyncio
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
