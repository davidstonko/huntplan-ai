# Backend dependencies — why there are two files

`requirements.txt` is the human-edited list, with version *ranges*.
`requirements.lock` is what Docker actually installs, with exact *pins*.

Never let the image build from `requirements.txt`.

## The incident this exists to prevent

On 2026-09-27 two Render deploys failed in a row. Neither had a backend change
in it — one was a React Native commit, the other was a comment edit. Nothing in
the repository was broken.

`requirements.txt` asked for `sqlalchemy>=2.0.35` with no upper bound and no
extras. SQLAlchemy 2.0.x declared `greenlet` as a genuine dependency on x86_64.
SQLAlchemy **2.1.0 moved `greenlet` behind the `asyncio` extra**. So the morning
2.1.0 published, a fresh `pip install` stopped installing greenlet, and

```
app/db/database.py:7
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, ...
ImportError: The SQLAlchemy asyncio module requires that the Python 'greenlet'
library is installed.
```

fired at *import* time. uvicorn never reached the point of binding a port, the
health check timed out, and Render reported a deploy failure that named the
health check rather than the ImportError. The previously built container kept
serving, which is why production looked fine while every new deploy failed.

Three defences came out of it, and all three matter:

1. **The `asyncio` extra is explicit** — `sqlalchemy[asyncio]` — so greenlet is
   requested by name rather than inherited by luck.
2. **Every direct dependency has an upper bound**, so a new major or minor
   release cannot enter a build unreviewed.
3. **The image installs the lockfile**, so what deploys is what was tested.
   A build can no longer differ from yesterday's build because of the calendar.

There is also a build-time `python -c "import app.main"` in the Dockerfile. An
import error now fails the *build*, where the traceback is visible, instead of
the health check, where it is not.

## Changing a dependency

```sh
cd backend
# 1. Edit requirements.txt (keep the upper bounds).
# 2. Re-resolve into a throwaway virtualenv.
python3 -m venv /tmp/lockenv
/tmp/lockenv/bin/pip install -U pip
/tmp/lockenv/bin/pip install -r requirements.txt

# 3. Prove the app still imports under the new set.
DATABASE_URL="postgresql://u:p@localhost:5432/db" SECRET_KEY=x \
  /tmp/lockenv/bin/python -c "import app.main; print('ok')"

# 4. Freeze. Do not hand-edit the lockfile.
/tmp/lockenv/bin/pip freeze --exclude-editable | sort > requirements.lock

# 5. Commit requirements.txt and requirements.lock together, never one alone.
```

Raising an upper bound is a deliberate act. Read that project's changelog for
moved extras and dropped defaults first — that is the exact class of change
that caused this incident, and it does not announce itself as a breaking one.

## Known state of the test suite

`tests/conftest.py` builds an in-memory SQLite engine, but the models use
Postgres-only types (`JSONB`, `Vector`, PostGIS `Geometry`). Every test that
touches the database therefore errors at table-create with
`CompileError: ... can't render element of type JSONB` — 57 of them as of this
writing. That is pre-existing, and it is why nothing in CI caught the greenlet
break. Anything that needs real coverage of a database path needs a real
Postgres (a service container, or Neon branch) rather than SQLite; the
substitution was never going to work with these column types.

`tests/test_api_endpoints.py` is a smoke test against a **live deployed URL**,
not a unit test. It passes when the API answers, including in degraded mode.
