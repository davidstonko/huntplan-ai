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

## Dashboard steps (one-time)

1. **Create a paid Postgres**: Render dashboard → New → PostgreSQL.
   Name `huntplan-db`, database `huntplan`, Postgres 16, plan **Basic 256 MB**
   (matches `render.yaml`). Free plan will expire again in 90 days.
2. **Point the API at it**: `huntplan-api` → Environment → `DATABASE_URL`.
   Paste the new DB's *Internal Database URL*. Either
   `postgres://...` or `postgresql+asyncpg://...` works — `app/config.py`
   rewrites the scheme to `postgresql+asyncpg://` at startup. Save; Render
   redeploys.
3. **Upgrade the web service plan** to **Starter** (`huntplan-api` →
   Settings → Instance Type) so it stops spinning down after 15 min idle.

If you deploy via Blueprint instead, `render.yaml` already reflects steps
1 and 3 and wires `DATABASE_URL` from the database.

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
