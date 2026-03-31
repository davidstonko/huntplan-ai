"""
HuntPlan AI — Seed Data Validation Tests

Tests that the Maryland seed data is well-formed and internally consistent.
These tests run without a database.
"""

import sys
import os
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.modules.regulations.md_seed_data import (
    MARYLAND_STATE,
    MARYLAND_COUNTIES,
    MARYLAND_SPECIES,
    DEER_SEASONS,
    TURKEY_SEASONS,
    DEER_BAG_LIMITS,
    TURKEY_BAG_LIMITS,
    ALL_SEASONS,
    ALL_BAG_LIMITS,
    WEAPON_RESTRICTIONS,
    REGIONS,
)


def test_state_data():
    """State record is complete."""
    assert MARYLAND_STATE["code"] == "MD"
    assert MARYLAND_STATE["name"] == "Maryland"
    assert "2025-2026" in MARYLAND_STATE["regulation_year"]


def test_counties_complete():
    """All 24 Maryland jurisdictions are present."""
    assert len(MARYLAND_COUNTIES) == 24  # 23 counties + Baltimore City
    names = [c["name"] for c in MARYLAND_COUNTIES]
    assert "Frederick" in names
    assert "Garrett" in names
    assert "Baltimore City" in names
    # Every county has sunday hunting fields
    for c in MARYLAND_COUNTIES:
        assert "sunday_hunting_allowed" in c
        assert isinstance(c["sunday_hunting_allowed"], bool)


def test_species_have_categories():
    """Every species has a valid category."""
    valid_categories = {"big_game", "turkey", "waterfowl", "small_game", "furbearer"}
    for sp in MARYLAND_SPECIES:
        assert sp["category"] in valid_categories, f"{sp['name']} has invalid category: {sp['category']}"


def test_season_dates_valid():
    """All season dates are parseable and end >= start."""
    for season in ALL_SEASONS:
        start = date.fromisoformat(season["start_date"])
        end = date.fromisoformat(season["end_date"])
        assert end >= start, f"{season['name']}: end ({end}) before start ({start})"


def test_season_species_exist():
    """Every season references a species that's in the species list."""
    species_names = {sp["name"] for sp in MARYLAND_SPECIES}
    for season in ALL_SEASONS:
        assert season["species"] in species_names, (
            f"Season '{season['name']}' references unknown species: {season['species']}"
        )


def test_bag_limit_species_exist():
    """Every bag limit references a known species."""
    species_names = {sp["name"] for sp in MARYLAND_SPECIES}
    for bl in ALL_BAG_LIMITS:
        assert bl["species"] in species_names, (
            f"Bag limit references unknown species: {bl['species']}"
        )


def test_deer_seasons_cover_key_dates():
    """Deer seasons exist for archery, firearms, and muzzleloader."""
    weapon_types = {s["weapon_type"] for s in DEER_SEASONS}
    assert "bow" in weapon_types
    assert "firearm" in weapon_types
    assert "muzzleloader" in weapon_types


def test_turkey_seasons_exist():
    """Turkey has spring and fall/winter seasons."""
    names = [s["name"] for s in TURKEY_SEASONS]
    assert any("Spring" in n for n in names)
    assert any("Fall" in n for n in names)
    assert any("Winter" in n for n in names)


def test_weapon_restrictions_have_types():
    """Every weapon restriction has a weapon_type."""
    for wr in WEAPON_RESTRICTIONS:
        assert wr["weapon_type"], "Weapon restriction missing weapon_type"
        assert wr["restriction"], "Weapon restriction missing restriction text"


def test_regions_defined():
    """Regions A and B are defined with counties."""
    assert "A" in REGIONS
    assert "B" in REGIONS
    assert "Garrett" in REGIONS["A"]["counties"]
    assert len(REGIONS["B"]["counties"]) > 15


def test_all_seasons_combined():
    """ALL_SEASONS contains both deer and turkey."""
    assert len(ALL_SEASONS) == len(DEER_SEASONS) + len(TURKEY_SEASONS)


def test_source_urls_present():
    """Seasons have source URLs for legal citations."""
    for season in ALL_SEASONS:
        assert season.get("source_url"), f"Season '{season['name']}' missing source_url"


if __name__ == "__main__":
    # Run all tests
    test_functions = [v for k, v in globals().items() if k.startswith("test_")]
    passed = 0
    failed = 0
    for test_fn in test_functions:
        try:
            test_fn()
            print(f"  PASS: {test_fn.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"  FAIL: {test_fn.__name__} — {e}")
            failed += 1

    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")
    if failed:
        sys.exit(1)
    print("All seed data validation tests passed!")
