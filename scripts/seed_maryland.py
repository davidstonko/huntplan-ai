"""
HuntPlan AI — Seed Maryland Data

Loads the Maryland 2025-2026 regulation data into the database.
Run this after the database is initialized:

    cd backend
    python -m scripts.seed_maryland

Or via the API endpoint: POST /api/v1/regulations/seed?state=MD
"""

import asyncio
import sys
import os
from datetime import date as date_type

# Add backend to path — works both locally and inside Docker container
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
container_path = "/app"
if os.path.isdir(backend_path):
    sys.path.insert(0, os.path.abspath(backend_path))
elif container_path not in sys.path:
    sys.path.insert(0, container_path)

from sqlalchemy import select
from app.db.database import async_session, init_db
from app.models.regulation import (
    State, County, Species, Season, BagLimit, WeaponRestriction,
)
from app.modules.regulations.md_seed_data import (
    MARYLAND_STATE, MARYLAND_COUNTIES, MARYLAND_SPECIES,
    ALL_SEASONS, ALL_BAG_LIMITS, WEAPON_RESTRICTIONS,
)


async def seed_maryland():
    """Load all Maryland regulation data."""
    print("Initializing database...")
    await init_db()

    async with async_session() as db:
        # Check if already seeded
        existing = await db.execute(select(State).where(State.code == "MD"))
        if existing.scalar_one_or_none():
            print("Maryland data already exists. Use --force to re-seed.")
            return

        print("Seeding Maryland state...")

        # 1. Create state
        state = State(**MARYLAND_STATE)
        db.add(state)
        await db.flush()  # Get state.id

        # 2. Create counties
        print(f"  Adding {len(MARYLAND_COUNTIES)} counties...")
        for county_data in MARYLAND_COUNTIES:
            county = County(
                state_id=state.id,
                name=county_data["name"],
                sunday_hunting_allowed=county_data["sunday_hunting_allowed"],
                sunday_hunting_notes=county_data.get("sunday_notes"),
            )
            db.add(county)

        # 3. Create species
        print(f"  Adding {len(MARYLAND_SPECIES)} species...")
        species_map = {}
        for sp_data in MARYLAND_SPECIES:
            species = Species(
                state_id=state.id,
                name=sp_data["name"],
                category=sp_data["category"],
                description=sp_data.get("description"),
            )
            db.add(species)
            await db.flush()
            species_map[sp_data["name"]] = species.id

        # 4. Create seasons
        print(f"  Adding {len(ALL_SEASONS)} seasons...")
        for season_data in ALL_SEASONS:
            species_name = season_data.pop("species")
            species_id = species_map.get(species_name)
            if not species_id:
                print(f"    WARNING: Species '{species_name}' not found, skipping season.")
                continue

            # Remove keys that aren't in the model
            sunday_notes = season_data.pop("sunday_notes", None)

            # Convert date strings to date objects
            if isinstance(season_data.get("start_date"), str):
                season_data["start_date"] = date_type.fromisoformat(season_data["start_date"])
            if isinstance(season_data.get("end_date"), str):
                season_data["end_date"] = date_type.fromisoformat(season_data["end_date"])

            season = Season(
                state_id=state.id,
                species_id=species_id,
                **season_data,
            )
            db.add(season)

        # 5. Create bag limits
        print(f"  Adding {len(ALL_BAG_LIMITS)} bag limits...")
        for bl_data in ALL_BAG_LIMITS:
            species_name = bl_data.pop("species")
            species_id = species_map.get(species_name)
            if not species_id:
                print(f"    WARNING: Species '{species_name}' not found, skipping bag limit.")
                continue

            bag_limit = BagLimit(
                state_id=state.id,
                species_id=species_id,
                **bl_data,
            )
            db.add(bag_limit)

        # 6. Create weapon restrictions
        print(f"  Adding {len(WEAPON_RESTRICTIONS)} weapon restrictions...")
        for wr_data in WEAPON_RESTRICTIONS:
            wr = WeaponRestriction(state_id=state.id, **wr_data)
            db.add(wr)

        await db.commit()
        print("\nMaryland data seeded successfully!")
        print(f"  State: {state.name} ({state.code})")
        print(f"  Counties: {len(MARYLAND_COUNTIES)}")
        print(f"  Species: {len(MARYLAND_SPECIES)}")
        print(f"  Seasons: {len(ALL_SEASONS)}")
        print(f"  Bag limits: {len(ALL_BAG_LIMITS)}")
        print(f"  Weapon restrictions: {len(WEAPON_RESTRICTIONS)}")


if __name__ == "__main__":
    asyncio.run(seed_maryland())
