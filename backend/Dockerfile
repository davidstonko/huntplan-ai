FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for geospatial libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgeos-dev \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install the LOCKFILE, not requirements.txt. requirements.txt carries ranges,
# so building from it resolves whatever PyPI happens to be serving that day —
# which is how the 2026-09-27 deploys broke without a single repo change (see
# the note at the top of requirements.txt). The lockfile makes the deployed
# dependency set identical to the tested one. backend/DEPENDENCIES.md explains
# how to regenerate it.
COPY requirements.txt requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock

# Fail the BUILD, not the health check, if the app cannot be imported. Without
# this the image builds green, uvicorn dies on boot, and Render reports a
# health-check timeout that says nothing about the real ImportError.
COPY app ./app
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    SECRET_KEY="build-time-import-check" \
    python -c "import app.main; print('import check passed')"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
