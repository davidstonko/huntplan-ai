"""
HuntPlan AI — GIS Data Import

Downloads and imports Maryland public hunting lands (WMAs, state forests, federal refuges)
into the PostGIS database.

Usage (inside Docker):
    python scripts/import_gis.py
"""

import asyncio
import sys
import os
import logging

# Add backend to path — works both locally and inside Docker container
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
container_path = "/app"
if os.path.isdir(backend_path):
    sys.path.insert(0, os.path.abspath(backend_path))
elif container_path not in sys.path:
    sys.path.insert(0, container_path)

from app.db.database import async_session, init_db
from app.modules.lands.gis_loader import load_gis_data

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    """Import Maryland GIS data."""
    state_code = "MD"

    logger.info("Initializing database...")
    await init_db()

    logger.info(f"Importing GIS data for {state_code}...")
    async with async_session() as db:
        counts = await load_gis_data(db, state_code)
        await db.commit()

    logger.info("GIS data import complete!")
    logger.info(f"  WMAs: {counts.get('wma', 0)}")
    logger.info(f"  State Forests: {counts.get('state_forest', 0)}")
    logger.info(f"  Federal Refuges: {counts.get('federal_refuge', 0)}")
    logger.info(f"  Total: {sum(counts.values())}")


if __name__ == "__main__":
    asyncio.run(main())
