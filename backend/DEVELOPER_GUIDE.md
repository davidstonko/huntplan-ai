# Backend Developer Guide

**Version:** 3.0.0  
**Last Updated:** 2026-04-11  
**Status:** Production-Ready

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Adding Features](#adding-features)
4. [Database Changes](#database-changes)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Deployment](#deployment)
8. [Common Tasks](#common-tasks)

---

## Quick Start

### Prerequisites
- Python 3.10+ (3.12 recommended)
- PostgreSQL 12+ with PostGIS extension
- Redis (for Celery, optional for Phase 2)
- pip or uv package manager

### Local Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/davidstonko/huntmaryland-build.git
cd huntmaryland-build/backend

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy example env file and configure
cp .env.example .env
# Edit .env with your local settings (see below)

# 5. Verify imports and config
python verify_backend.py

# 6. Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 7. Open browser
# - API docs: http://localhost:8000/docs
# - ReDoc: http://localhost:8000/redoc
# - Health: http://localhost:8000/health
```

### Local `.env` Setup

```bash
# Database
DATABASE_URL=postgresql+asyncpg://huntplan:huntplan@localhost:5432/huntplan
DATABASE_URL_SYNC=postgresql://huntplan:huntplan@localhost:5432/huntplan

# Auth
SECRET_KEY=dev-super-secret-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days

# LLM
GEMINI_API_KEY=xxx_paste_your_key_xxx
ANTHROPIC_API_KEY=xxx_optional_fallback_xxx

# Storage (optional for dev)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_PUBLIC_URL=https://cdn.huntplan.local

# External APIs (optional, will fallback if missing)
MAPBOX_ACCESS_TOKEN=pk.xxx
OPENWEATHER_API_KEY=xxx

# Redis (optional if not using Celery)
REDIS_URL=redis://localhost:6379/0

# Debugging
DEBUG=true
LOG_LEVEL=DEBUG
```

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Configuration (Pydantic settings)
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   └── database.py         # SQLAlchemy async setup
│   │
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── __init__.py         # Import all models (triggers Base registration)
│   │   ├── user.py             # User model
│   │   ├── deercamp.py         # Deer Camp models (camp, member, annotation, photo, activity, message)
│   │   ├── land.py             # Public hunting lands
│   │   ├── regulation.py       # Regulation chunks (for RAG)
│   │   ├── harvest.py          # Harvest entries
│   │   ├── social.py           # Community reports
│   │   ├── forum.py            # Forum posts & replies
│   │   ├── feedback.py         # User feedback
│   │   ├── rag.py              # RAG/embeddings
│   │   └── plan.py             # Hunt plans (optional, for future)
│   │
│   ├── modules/                # Feature modules (routers + services)
│   │   ├── auth/
│   │   │   ├── routes.py       # POST /register, /refresh, GET /me, PATCH /me
│   │   │   ├── service.py      # JWT, device token, handle generation
│   │   │   └── dependencies.py # get_current_user, get_optional_user, require_admin
│   │   │
│   │   ├── deercamp/
│   │   │   ├── routes.py       # Camp CRUD, sync, intelligence, annotations, photos
│   │   │   └── intelligence_service.py  # AI analysis of camp data
│   │   │
│   │   ├── websocket/
│   │   │   ├── routes.py       # ws://host/ws/camps/{camp_id}
│   │   │   └── manager.py      # Connection registry & broadcast
│   │   │
│   │   ├── notifications/
│   │   │   ├── routes.py       # Token registration, preferences
│   │   │   └── apns_service.py # Apple Push Notification Service
│   │   │
│   │   ├── photos/
│   │   │   ├── routes.py       # Upload, retrieve, rotate, delete
│   │   │   └── s3_service.py   # Cloudflare R2 integration
│   │   │
│   │   ├── regulations/
│   │   │   ├── routes.py       # Seasons, bag limits, search, special areas
│   │   │   └── service.py      # Full-text search, RAG retrieval
│   │   │
│   │   ├── lands/
│   │   │   ├── routes.py       # Search, filter, nearby, details
│   │   │   └── service.py      # GIS queries, spatial filtering
│   │   │
│   │   ├── harvest/
│   │   │   ├── routes.py       # Log, list, stats
│   │   │   └── service.py      # Aggregation for "Learn Your Camp"
│   │   │
│   │   ├── social/
│   │   │   ├── routes.py       # Reports, comments
│   │   │   └── service.py      # Anonymization, threading
│   │   │
│   │   ├── ai_planner/
│   │   │   ├── routes.py       # Chat, photo analysis, suggestions
│   │   │   └── service.py      # LLM integration, RAG retrieval
│   │   │
│   │   ├── export/
│   │   │   ├── routes.py       # GPX, KML export
│   │   │   └── service.py      # Format generation
│   │   │
│   │   ├── forum/
│   │   │   ├── routes.py       # Posts, replies, search
│   │   │   └── service.py      # Threading, upvotes
│   │   │
│   │   ├── feedback/
│   │   │   ├── routes.py       # Submit, list, respond
│   │   │   └── email_service.py # Gmail SMTP notifications
│   │   │
│   │   └── integrations/
│   │       ├── routes.py       # Weather, geocoding, etc.
│   │       └── service.py      # External API adapters
│   │
│   └── utils/                  # Shared utilities
│       ├── validators.py       # Input validation functions
│       └── serializers.py      # JSON/response formatting
│
├── requirements.txt            # Python dependencies
├── .env.example                # Example environment vars
├── verify_backend.py           # Verification script
├── BACKEND_STATUS.md           # Status & module inventory (this file)
├── DEVELOPER_GUIDE.md          # Development guide (this file)
└── README.md                   # Project overview
```

---

## Adding Features

### Example: Add a New Endpoint to Deer Camp Module

**Goal:** Add `POST /camps/{camp_id}/rename` to allow camp name updates.

#### Step 1: Update the Route (in `app/modules/deercamp/routes.py`)

```python
from pydantic import BaseModel

class RenameCampRequest(BaseModel):
    name: str

@router.patch("/camps/{camp_id}/name")
async def rename_camp(
    camp_id: str,
    request: RenameCampRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a deer camp. Only admin can rename."""
    cid = _parse_uuid(camp_id, "camp_id")
    
    membership = await _get_membership(db, cid, user.id)
    if not membership or membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can rename camps")
    
    result = await db.execute(select(DeerCamp).where(DeerCamp.id == cid))
    camp = result.scalar_one_or_none()
    if not camp:
        raise HTTPException(status_code=404, detail="Camp not found")
    
    camp.name = request.name
    db.add(camp)
    await db.flush()
    
    await _log_activity(db, cid, user, "renamed_camp")
    
    return {
        "id": str(camp.id),
        "name": camp.name,
        "updated_at": camp.updated_at.isoformat(),
    }
```

#### Step 2: Test the Endpoint

```bash
# Using curl
curl -X PATCH http://localhost:8000/api/v1/deercamp/camps/{camp_id}/name \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Camp Name"}'
```

Or in the Swagger UI at `/docs`, find the endpoint and try it there.

#### Step 3: Update Activity Feed

The endpoint already calls `_log_activity(db, cid, user, "renamed_camp")`, which will:
1. Create a `CampActivity` entry
2. Broadcast via WebSocket to all connected members
3. Show up in the activity feed

---

### Example: Add a New Model

**Goal:** Add a `CampWeatherLog` table to track weather observations.

#### Step 1: Create Model (in `app/models/deercamp.py`)

```python
class CampWeatherLog(Base):
    """Weather observation logged by a camp member."""
    __tablename__ = "camp_weather_logs"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camp_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deer_camps.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    # Weather data
    temperature: Mapped[float] = mapped_column(Float, nullable=False)  # Fahrenheit
    wind_speed: Mapped[float] = mapped_column(Float, nullable=False)   # mph
    wind_direction: Mapped[str] = mapped_column(String(3))             # N, NE, E, etc.
    conditions: Mapped[str] = mapped_column(String(64))                # Clear, Cloudy, Rainy
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index("ix_weather_camp_time", "camp_id", "logged_at"),
    )
```

#### Step 2: Auto-Load the Model

The model is automatically registered when you import `app.models` in `app/main.py` (via the lifespan hook that calls `init_db()`).

#### Step 3: Create Migration (Optional, if using Alembic)

```bash
cd backend
alembic revision --autogenerate -m "Add CampWeatherLog table"
alembic upgrade head
```

(Alembic setup is deferred to Phase 3; for now, the app auto-creates tables from models.)

---

### Example: Add a New Module (Feature)

**Goal:** Add a Fishing module alongside Hunting.

#### Step 1: Create Module Directory

```bash
mkdir -p app/modules/fishing
touch app/modules/fishing/{__init__.py,routes.py,service.py}
```

#### Step 2: Create Routes (`app/modules/fishing/routes.py`)

```python
from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/spots")
async def list_fishing_spots(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List fishing spots."""
    # Implementation
    return {"spots": []}
```

#### Step 3: Register in Main App (`app/main.py`)

```python
from app.modules.fishing.routes import router as fishing_router

# In the router registration section:
app.include_router(fishing_router, prefix="/api/v1/fishing", tags=["Fishing"])
```

#### Step 4: Add Models (if needed)

Create `app/models/fishing.py` with FishingSpot, FishingTrip, etc., then import in `app/models/__init__.py`.

---

## Database Changes

### Without Alembic (Current Approach — Phase 2)

The app auto-creates all tables from models on startup (via `init_db()` in `main.py`).

**For local development:**
1. Update the model in `app/models/*.py`
2. Restart the app
3. Tables are created/updated automatically ✓

**For production (Phase 3+):**
1. Use Alembic migrations (one-way versioning)
2. Test migrations locally first
3. Deploy migration, then deploy code

### Adding a Column

```python
# In models/deercamp.py
class DeerCamp(Base):
    __tablename__ = "deer_camps"
    
    # ... existing columns ...
    
    # NEW COLUMN:
    description: Mapped[Optional[str]] = mapped_column(Text)  # Add description
```

Restart app → column created.

### Adding an Index

```python
# In models/deercamp.py
class DeerCamp(Base):
    __tablename__ = "deer_camps"
    
    # ...
    
    __table_args__ = (
        Index("ix_camp_created_by", "created_by"),
        Index("ix_camp_invite", "invite_code"),
        Index("ix_camp_name", "name"),  # NEW INDEX
    )
```

### Removing a Column (Advanced)

For production, use Alembic:

```bash
alembic revision --autogenerate -m "Remove deprecated_field from camps"
# Edit the migration file to customize if needed
alembic upgrade head
```

---

## Testing

### Test Structure (To Be Implemented)

```
backend/
├── tests/
│   ├── conftest.py              # Pytest fixtures
│   ├── test_auth.py
│   ├── test_deercamp.py
│   ├── test_websocket.py
│   └── test_regulations.py
```

### Running Tests

```bash
# Install test dependencies
pip install -r requirements.txt  # Includes pytest, pytest-asyncio

# Run all tests
pytest

# Run specific test
pytest tests/test_auth.py::test_register

# With coverage
pytest --cov=app tests/
```

### Example Test

```python
# tests/test_auth.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_register():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={"device_token": "test123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user_id" in data
```

---

## Debugging

### Enable Debug Logging

Set in `.env`:
```bash
DEBUG=true
LOG_LEVEL=DEBUG
```

Or pass to uvicorn:
```bash
uvicorn app.main:app --reload --log-level debug
```

### Common Issues

#### Issue: "ImportError: No module named 'app'"
**Solution:** Make sure you're running from the `backend/` directory:
```bash
cd /path/to/backend
python -m uvicorn app.main:app --reload
# OR
uvicorn app.main:app --reload
```

#### Issue: "DATABASE_URL is not a valid PostgreSQL URL"
**Solution:** Verify in `.env`:
```bash
# ✓ Correct
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/huntplan

# ✗ Wrong
DATABASE_URL=postgres://user:pass@localhost:5432/huntplan  # config.py auto-fixes this

# ✗ Wrong
DATABASE_URL=postgresql://user:pass@localhost:5432/huntplan  # Must have +asyncpg
```

#### Issue: "FATAL: role 'huntplan' does not exist"
**Solution:** Create the PostgreSQL user and database:
```bash
psql -U postgres
CREATE ROLE huntplan WITH LOGIN PASSWORD 'huntplan';
CREATE DATABASE huntplan OWNER huntplan;
\c huntplan
CREATE EXTENSION IF NOT EXISTS postgis;
```

#### Issue: WebSocket connection fails
**Solution:** Verify:
1. JWT token is valid: `GET /api/v1/auth/me` should return 200
2. Camp ID is valid: User is a member of the camp
3. WebSocket URL is correct: `ws://host/ws/camps/{camp_id}?token={jwt}`

#### Issue: S3/R2 upload fails
**Solution:** Verify R2 credentials in `.env`:
```bash
R2_ACCOUNT_ID=xxx     # From Cloudflare dashboard
R2_ACCESS_KEY_ID=xxx  # API token
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET=huntplan-photos
```

---

## Deployment

### Development → Production Checklist

```
PRE-DEPLOY:
  [ ] All tests pass locally: pytest
  [ ] No TypeScript errors: python verify_backend.py
  [ ] All imports resolve
  [ ] Environment variables set (Render dashboard)
  [ ] Database is migrated (if using Alembic)
  [ ] CORS origins configured for production domain

RENDER DEPLOYMENT:
  [ ] GitHub repo connected
  [ ] Auto-deploy enabled on main branch
  [ ] Environment variables in Render settings:
      - DATABASE_URL
      - SECRET_KEY (strong random)
      - GEMINI_API_KEY
      - APNS credentials
      - R2 credentials
      - etc.

POST-DEPLOY:
  [ ] Health check passes: curl https://huntplan-api.onrender.com/health
  [ ] Logs show "auto-ingestion complete" or "knowledge base already has X chunks"
  [ ] Swagger docs available: /docs
  [ ] Test auth: POST /api/v1/auth/register
  [ ] Test camps: POST /api/v1/deercamp/camps (should return camp)

MONITORING:
  [ ] Sentry errors: Check error tracking
  [ ] Database slowlog: Render console
  [ ] WebSocket connections: Monitor in-memory usage
```

### Render Deployment Steps

1. **Connect GitHub:**
   - Sign up on Render.com
   - New → Web Service
   - Select GitHub repo: huntmaryland-build
   - Select branch: main (auto-redeploy on push)

2. **Configure Build:**
   - Build command: (auto-detected) `pip install -r requirements.txt`
   - Start command: (auto-detected) `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **Set Environment:**
   - Render dashboard → Settings → Environment
   - Add all variables from `.env`

4. **Deploy:**
   - Click "Deploy"
   - Watch logs: `Listening on 0.0.0.0:10000` (Render's PORT)

5. **Verify:**
   - curl https://API_URL/health
   - Should return: `{"status": "ok", "app": "...", "version": "..."}`

---

## Common Tasks

### Seed Regulation Data

The backend auto-ingests regulations on first startup if the knowledge base is empty:

```python
# app/main.py auto-ingest block
if count == 0:
    logger.info("Empty knowledge base — running auto-ingestion...")
    # Imports scripts/ingest_regulations.py
    # Inserts all chunks into regulation_chunks table
```

To manually re-ingest:
```bash
# (Not yet exposed as CLI, would add later)
# For now, delete regulation_chunks table and restart app
```

### Add a New Regulation Category

**File:** `scripts/ingest_regulations.py` (not in current repo, to be created Phase 3)

```python
def build_waterfowl_chunks():
    """Generate regulation chunks for waterfowl hunting."""
    chunks = []
    chunks.append({
        "title": "Waterfowl Season 2025-2026",
        "content": "Maryland waterfowl season...",
        "category": "Waterfowl",
        "species": "Waterfowl",
        "county": None,
        "source": "eRegulations MD 2025",
        "extra_data": {"season_year": "2025-2026"},
    })
    return chunks
```

### Rotate APNS Certificate

APNS certificates expire yearly. To rotate:

1. Generate new `.p8` key from Apple Developer Portal
2. Update `APNS_KEY_ID`, `APNS_TEAM_ID`, and `APNS_KEY_PATH` in Render env
3. Restart app: Render dashboard → redeploy

### Export Camp Data (GDPR)

**Endpoint (to be added Phase 3):**
```python
@router.post("/camps/{camp_id}/export")
async def export_camp_data(camp_id: str, format: str = "json"):
    """Export all camp data (annotations, photos, activity) as JSON or CSV."""
    # Implementation
```

### Clear Cache (if Redis added)

```bash
# Connect to Redis
redis-cli

# Clear all
> FLUSHALL

# Or specific pattern
> DEL huntplan:regulations:*
```

---

## Resources

- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **SQLAlchemy Async:** https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- **PostgreSQL PostGIS:** https://postgis.net/
- **Render Docs:** https://render.com/docs
- **APNS Guide:** https://developer.apple.com/documentation/usernotifications

---

## Support

**Issues or Questions?**
- Check logs: `uvicorn app.main:app --reload`
- Verify config: `python verify_backend.py`
- Browse Swagger UI: http://localhost:8000/docs
- Check GitHub issues or ask in Discord

**Owner:** David Stonko  
**Last Updated:** 2026-04-11
