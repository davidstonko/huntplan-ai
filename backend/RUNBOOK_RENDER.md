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

Render's free Postgres is not a tier, it is a trial: suspended when the trial
ends, deleted 14 days later. That is what took production down in July, and a
free database would do it again. So the free Postgres was never an option; the
only question was whether to pay Render or move the database to a provider
whose free tier does not expire (Neon).

**Decision, 2026-09-27: all Render, $13/mo** (Starter web + Basic 256 MB
Postgres). Reasons, in the order that decided it:

- One vendor. One bill, one dashboard, one status page, one support contact,
  one place to look at 11pm when something is down. For a solo developer that
  is worth more than $6/mo.
- The database is reachable over Render's **internal** network. No public
  internet hop, no TLS parameters to get wrong, and `DATABASE_URL` is wired by
  the blueprint rather than pasted by hand — one fewer thing to mis-copy.
- Daily backups are included in the paid plan. The July incident destroyed
  user accounts and camps; nothing had a backup.
- No cold start. Starter does not spin down, so no reviewer or user waits
  ~31 s for a first request.

What was given up: Neon's free tier would have made the database $0 forever,
and Neon's branching is genuinely nicer for testing against real Postgres
(which this repo needs — see the test-suite note in `DEPENDENCIES.md`). If
that becomes the priority, `app/config.py` already handles an external libpq
connection string, so the move is an env-var change, not a code change.

Worth knowing either way: nothing in the app's offline behaviour — maps,
offline packs, GPS tracks, the regulations knowledge base, legal shooting
hours, solunar — touches the backend. The backend serves the AI planner's RAG
answers, the forum, and camp sync. The App Review walkthrough does not depend
on it.

## Dashboard steps (one-time)

0. **Add a payment method**: dashboard.render.com → Billing. Nothing paid can
   be created until this exists.
1. **Create the Postgres**: New → Postgres. Name `huntplan-db`, database
   `huntplan`, Postgres **16**, region the **same as the web service** (the
   internal network only works within a region), plan **Basic 256 MB**.
   Not Free — Free is a trial and will be deleted again.
2. **Point the API at it**: `huntplan-api` → Environment → `DATABASE_URL` →
   paste the new database's **Internal** Database URL (not the External one).
   `app/config.py` rewrites the scheme to `postgresql+asyncpg://` at startup.
   Save; Render redeploys.
3. **Instance type**: `huntplan-api` → Settings → Instance Type → **Starter**,
   so the service stops spinning down after 15 minutes idle.
4. **Build filter** (stops the noise): `huntplan-api` → Settings → Build
   Filters → Included Paths `backend/**` and `render.yaml`. Without this,
   every React Native commit rebuilds the API and mails a
   "deploy failed for huntplan-api" notice for a change the image never
   contained — which is what the 2026-09-18 and 2026-09-27 emails were.

If the services were created from the Blueprint, `render.yaml` already carries
steps 1, 3 and 4 and wires `DATABASE_URL` for step 2 — but a blueprint sync
still cannot provision a paid database without step 0. If they were created by
hand in the dashboard, `render.yaml` is documentation only and every step must
be done there.

Expect the first deploy after step 2 to seed the database automatically; see
"Re-seeding a new database" below, and confirm `/health` reports `"db":"ok"`.

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
