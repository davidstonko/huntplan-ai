# Runbook — Render outage recovery (September 2026)

## What happened

Render **deletes** free-tier Postgres databases 90 days after creation. Ours
(`huntplan-db`, plan `free`) hit that limit. On the next boot the API's
lifespan called `init_db()` against a host that no longer existed, the
exception propagated out of uvicorn, and Render logged
`Exited with status 3`. Because startup crashed, *every* endpoint went down —
including ones that never touch the database.

Code fix (this commit): the lifespan now catches DB failures, serves in a
"degraded" mode, retries `init_db()` every 60 s (up to 30 tries), and
`get_db` returns **503** (not a hang/500) while the DB is down. The AI
planner `/query` route still answers LLM-only with an explicit note.

The data in the old database is gone. Regulation chunks re-seed
automatically; user accounts/camps do not.

## What it costs, and what we chose

Verified against Render's pricing page, September 2026:

| | Free | Cheapest paid |
| --- | --- | --- |
| Web service | $0, 512 MB, **spins down after 15 min idle** (~31 s cold start, measured) | Starter **$7/mo**, 0.5 CPU / 512 MB, never spins down |
| Postgres | $0, 256 MB, **suspended when the trial ends, then deleted** | Basic 256 MB **$6/mo** |

Render's free Postgres is not a tier, it is a trial — that is what took
production down in July, and it would do it again. The database therefore
moved to **Neon**, whose free tier does not expire (it scales to zero after
about 5 minutes of inactivity and wakes in roughly a second). So:

- **$0** — Neon free + Render free web. Survivable now that the API boots in
  degraded mode instead of exiting, but a first request after 15 idle minutes
  waits ~31 s. An App Review reviewer would hit exactly that on the AI tab.
- **$7/mo** — Neon free + Render Starter. **This is the recommendation**: the
  only thing being bought is the elimination of the cold start, which is the
  one failure a reviewer sees.
- **$13/mo** — all Render (Starter web + Basic Postgres). Buys one vendor
  instead of two. It does not buy reliability Neon's free tier lacks.

Nothing in the app's offline behaviour — maps, offline packs, GPS tracks, the
regulations knowledge base, legal shooting hours, solunar — depends on the
backend at all. The backend serves the AI planner's RAG answers, the forum,
and camp sync. That is why $0 is a legitimate choice here and why the App
Review walkthrough does not depend on this decision.

## Dashboard steps (one-time)

1. **Create the database on Neon**: neon.tech → new project, Postgres 16,
   region US East (Ohio) to sit near Render's Virginia region. Copy the
   connection string it offers.
2. **Point the API at it**: `huntplan-api` → Environment → `DATABASE_URL` →
   paste the Neon string **verbatim**, including
   `?sslmode=require&channel_binding=require`. `app/config.py` rewrites the
   scheme to `postgresql+asyncpg://` and translates those two parameters
   (asyncpg rejects both by name — it wants `ssl=require` — while Alembic's
   sync URL keeps the libpq spelling). Save; Render redeploys.
   Covered by `backend/tests/test_database_url_normalization.py`.
3. **Instance type**: `huntplan-api` → Settings → Instance Type → **Starter**
   for the $7 option, or leave it on Free for the $0 option.
4. **Build filter** (stops the noise): `huntplan-api` → Settings → Build
   Filters → Included Paths `backend/**` and `render.yaml`. Without this,
   every React Native commit rebuilds the API and mails a
   "deploy failed for huntplan-api" notice for a change the image never
   contained — which is what the 2026-09-18 and 2026-09-27 emails were.

If the services were created from the Blueprint, `render.yaml` already carries
steps 3 and 4 and leaves `DATABASE_URL` as `sync: false` for step 2. If they
were created by hand in the dashboard, `render.yaml` is documentation only and
all four steps must be done there.

## Verify

```
curl -s https://<service>.onrender.com/health
```

Healthy:
```json
{"status":"ok","db":"ok","db_error":null,"app":"MDHuntFishOutdoors API","version":"3.0.0"}
```
Degraded (DB unreachable — the API is up but data routes return 503):
```json
{"status":"degraded","db":"unavailable","db_error":"[Errno ...] Connect call failed ...","app":"...","version":"3.0.0"}
```

`/health` always returns HTTP 200 so Render's health check does not
restart-loop the instance; read the `db` field. After fixing `DATABASE_URL`
the background retry flips `db` to `"ok"` within ~60 s without a redeploy
(a redeploy also works). Check Render logs for
`Database initialized` / `Database recovered on retry N`.

## Re-seeding a new database

- **Automatic**: on the first successful `init_db()`, `auto_ingest_if_empty()`
  (in `app/main.py`) creates the tables via `create_all` and seeds
  `regulation_chunks` if the table is empty. Watch for
  `Auto-ingestion complete: N chunks loaded` in the logs.
- **Manual / re-run**: `POST /api/v1/planner/ai/ingest` (note the `/ai`
  prefix from `app/modules/ai_planner/routes.py`) wipes and reloads all MD
  chunks and rebuilds `search_vector`:
  ```
  curl -X POST https://<service>.onrender.com/api/v1/planner/ai/ingest
  ```
  Expected: `{"status":"ok","chunks_ingested":N,...}`. This endpoint is
  currently unauthenticated — fine for a recovery, but worth guarding with
  `INTERNAL_API_KEY` later.
- Confirm RAG works: `POST /api/v1/planner/ai/query` with
  `{"query":"When does deer archery season start?"}` should return
  `chunks_used > 0` and an answer *without* the "regulation retrieval was
  unavailable" note.

## Schema drift reminder

`init_db()` uses `create_all` plus `_self_heal_schema_drift()` (idempotent
`ADD COLUMN IF NOT EXISTS`). `create_all` never ALTERs existing tables, so
any new model column must also be added to `drift_fixes` in
`app/db/database.py` or it will 500 on the deployed DB (the April incident).
