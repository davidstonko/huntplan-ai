# MDHuntFishOutdoors — Backend Deployment Guide

## Quick Start (Local Development)

```bash
# 1. Start PostgreSQL + Redis
docker compose up -d db redis

# 2. Install Python dependencies
cd backend
pip install -r requirements.txt

# 3. Run the API
uvicorn app.main:app --reload --port 8000

# 4. Verify
curl http://localhost:8000/health
# → {"status":"ok","app":"MDHuntFishOutdoors API","version":"3.0.0"}

# 5. View API docs
open http://localhost:8000/docs
```

## Deploy to Render (Recommended — Free Tier)

### Option A: Blueprint (Automatic)
1. Push code to GitHub
2. Go to https://render.com/deploy
3. Connect your repo — Render reads `render.yaml` automatically
4. Set environment variables in the dashboard:
   - `ANTHROPIC_API_KEY`: Your Claude API key
   - `MAPBOX_ACCESS_TOKEN`: Your Mapbox token

### Option B: Manual Setup
1. **Create a PostgreSQL database** on Render (Free: 256 MB)
2. **Create a Web Service**:
   - Source: Docker
   - Dockerfile path: `backend/Dockerfile`
   - Docker context: `backend`
   - Health check: `/health`
3. **Set environment variables**:
   - `DATABASE_URL`: Copy from Render's database dashboard (Internal URL)
   - `SECRET_KEY`: Generate a random string (64+ chars)
   - `ANTHROPIC_API_KEY`: Your key
   - `MAPBOX_ACCESS_TOKEN`: Your token
   - `DEBUG`: `false`

### After Deployment
1. The API auto-creates database tables on first startup
2. Verify: `curl https://your-app.onrender.com/health`
3. Update mobile `api.ts` production URL:
   ```typescript
   const API_BASE_URL = __DEV__
     ? 'http://localhost:8000'
     : 'https://your-app.onrender.com';
   ```

## Deploy to Railway (Alternative)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Deploy
railway up

# Get your URL
railway domain
```

Set the same environment variables in Railway's dashboard.

## API Endpoints

### Auth
- `POST /api/v1/auth/register` — Register device (anonymous)
- `POST /api/v1/auth/refresh` — Refresh JWT
- `GET /api/v1/auth/me` — Get profile
- `PATCH /api/v1/auth/me` — Update profile

### Deer Camp
- `POST /api/v1/deercamp/camps` — Create camp
- `GET /api/v1/deercamp/camps` — List my camps
- `GET /api/v1/deercamp/camps/{id}` — Get camp details
- `DELETE /api/v1/deercamp/camps/{id}` — Delete camp
- `POST /api/v1/deercamp/camps/join` — Join by invite code
- `POST /api/v1/deercamp/camps/{id}/leave` — Leave camp
- `DELETE /api/v1/deercamp/camps/{id}/members/{uid}` — Remove member
- `POST /api/v1/deercamp/camps/{id}/annotations` — Add annotation
- `DELETE /api/v1/deercamp/camps/{id}/annotations/{aid}` — Remove annotation
- `POST /api/v1/deercamp/camps/{id}/photos` — Add photo
- `DELETE /api/v1/deercamp/camps/{id}/photos/{pid}` — Remove photo
- `GET /api/v1/deercamp/camps/{id}/feed` — Activity feed
- `POST /api/v1/deercamp/camps/{id}/sync` — Offline sync

### Export
- `POST /api/v1/export/plan/gpx` — Export plan as GPX
- `POST /api/v1/export/plan/kml` — Export plan as KML
- `POST /api/v1/export/track/gpx` — Export track as GPX
- `POST /api/v1/export/track/kml` — Export track as KML

### Regulations
- `GET /api/v1/regulations/seasons` — Open seasons
- `GET /api/v1/regulations/can-i-hunt` — Legality check
- `GET /api/v1/regulations/bag-limits` — Harvest limits
- `GET /api/v1/regulations/species` — Species list
- `GET /api/v1/regulations/sunday-hunting` — Sunday rules

### Lands
- `GET /api/v1/lands/nearby` — Nearby lands (PostGIS)
- `GET /api/v1/lands/search` — Text search
- `GET /api/v1/lands/county/{name}` — By county
- `GET /api/v1/lands/stats/{state}` — Statistics
- `GET /api/v1/lands/{id}` — Land details

### Notifications
- `POST /api/v1/notifications/register` — Register push token
- `POST /api/v1/notifications/unregister` — Unregister
- `GET /api/v1/notifications/preferences` — Get prefs
- `PATCH /api/v1/notifications/preferences` — Update prefs

## Database Notes

- Tables auto-create via SQLAlchemy on startup
- PostGIS extension auto-enabled (for spatial queries)
- No migration tool yet — for schema changes, drop and recreate tables
- Future: Add Alembic migrations for production schema management

## Security Checklist

- [ ] Change `SECRET_KEY` to a random 64+ character string
- [ ] Set `DEBUG=false` in production
- [ ] Restrict CORS origins (currently allows `*`)
- [ ] Add rate limiting (e.g., slowapi)
- [ ] Add HTTPS (Render/Railway handle this automatically)
- [ ] Never commit `.env` to git
