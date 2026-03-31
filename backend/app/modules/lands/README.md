# Land & Geography Module (Module 2)

Complete GIS data import pipeline for public hunting lands with PostGIS spatial queries and offline data pack generation.

## Overview

The Land & Geography module handles:
- **GIS Data Import**: Downloads public hunting land boundaries from Maryland iMap and USFWS
- **Spatial Queries**: Finds nearby lands, lands open for species, and text search
- **Offline Data Packs**: Builds downloadable bundles (regulations + lands + metadata) for the mobile app

## Architecture

### Components

1. **gis_loader.py** — GIS Data Downloader
   - Downloads from Maryland iMap ArcGIS REST API
   - Downloads from USFWS federal refuge boundaries
   - Parses GeoJSON and loads into PostGIS
   - Async HTTP with `httpx`, geometry parsing with `shapely`

2. **queries.py** — PostGIS Spatial Queries
   - `find_nearby_public_lands()` — radius search
   - `find_lands_open_for_species()` — combines regulations + lands
   - `get_land_details()` — full parcel data with geometry
   - `search_lands()` — text search by name, county, region
   - `get_lands_by_county()` — county-scoped queries
   - `get_stats()` — aggregate statistics

3. **data_packs.py** — State Data Pack Builder
   - `DataPackBuilder` class builds offline bundles
   - Outputs: `regulations.json`, `lands.geojson`, `manifest.json`
   - Version tracking and file size metadata
   - Used by mobile app for offline maps

4. **routes.py** — FastAPI Endpoints
   - `/lands/nearby` — find nearby lands
   - `/lands/open-for-species` — lands open for hunting
   - `/lands/{land_id}` — land details with geometry
   - `/lands/search` — text search
   - `/lands/county/{county_name}` — county query
   - `/lands/stats/{state}` — aggregate statistics

### Data Model

**PublicLand** (app/models/land.py):
- `geometry` — PostGIS MULTIPOLYGON (SRID 4326 = WGS84)
- `centroid_lat/lon` — Point geometry for fast distance queries
- `acreage` — Calculated from geometry
- `huntable_species` — JSONB array (e.g., `["deer", "turkey"]`)
- `land_type` — "wma", "state_forest", "federal_refuge", "corps_land"
- `managing_agency` — "MD DNR", "USFWS", etc.

PostGIS Indexes:
- GIST index on `geometry` for spatial queries
- B-tree index on `state_id`, `land_type`

## Data Sources

### Maryland iMap ArcGIS REST API
- **Base URL**: `https://data.imap.maryland.gov/arcgis/rest/services`
- **WMA Service**: `Natural_Resources/MD_Wildlife_Management_Areas/MapServer`
- **State Forest Service**: `Natural_Resources/MD_State_Forests/MapServer`
- Provides GeoJSON output (SRID 4326)
- Updated regularly by Maryland Department of Natural Resources

### USFWS OpenData
- **Base URL**: `https://gis-fws.opendata.arcgis.com/arcgis/rest/services`
- **Refuge Service**: `public_services/National_Wildlife_Refuge_System/FeatureServer`
- Federal wildlife refuges with hunting regulations
- Public domain data

## Usage

### 1. Import GIS Data

**Command line:**
```bash
cd backend
python -m scripts.import_gis --state MD
```

**Python:**
```python
import asyncio
from app.db.database import async_session, init_db
from app.modules.lands.gis_loader import load_gis_data

async def main():
    await init_db()
    async with async_session() as db:
        counts = await load_gis_data(db, "MD")
        print(f"Loaded: {counts}")

asyncio.run(main())
```

### 2. Query Public Lands

**FastAPI endpoint:**
```bash
curl "http://localhost:8000/api/v1/lands/nearby?latitude=39.5&longitude=-76.5&radius_km=25&state=MD"
```

**Python:**
```python
from app.modules.lands.queries import find_nearby_public_lands

async with async_session() as db:
    lands = await find_nearby_public_lands(
        db,
        lat=39.5,
        lon=-76.5,
        radius_miles=15.5,
        state_code="MD",
        species="deer"
    )
    for land in lands:
        print(f"{land['name']}: {land['distance_miles']} miles away")
```

### 3. Find Lands Open for Species

```python
from app.modules.lands.queries import find_lands_open_for_species
from datetime import date

async with async_session() as db:
    lands = await find_lands_open_for_species(
        db,
        species="White-tailed Deer",
        query_date=date(2026, 3, 28),
        lat=39.5,
        lon=-76.5,
        radius_miles=25
    )
```

### 4. Build Offline Data Pack

```bash
python -m scripts.import_gis --state MD --build-pack
```

This creates:
- `data/packs/maryland/regulations.json` — all hunting seasons/bag limits
- `data/packs/maryland/lands.geojson` — all public lands as GeoJSON features
- `data/packs/maryland/manifest.json` — version, record counts, file sizes

**Python:**
```python
from app.modules.lands.data_packs import build_state_pack

async with async_session() as db:
    files = await build_state_pack(db, "MD")
    print(f"Regulations: {files['regulations']}")
    print(f"Lands: {files['lands']}")
    print(f"Manifest: {files['manifest']}")
```

### 5. Export Lands to GeoJSON

```bash
python -m scripts.import_gis --state MD --export-geojson ./maryland_lands.geojson
```

## PostGIS Spatial Queries

### Distance Query (ST_DWithin)
```sql
SELECT id, name, ST_Distance(geometry, ST_MakePoint(-76.5, 39.5)) / 1609.34 as distance_miles
FROM public_lands
WHERE ST_DWithin(geometry, ST_MakePoint(-76.5, 39.5), 40234)  -- 25 miles in meters
ORDER BY distance_miles
LIMIT 20;
```

### Bounds/Contains Query
```sql
SELECT id, name
FROM public_lands
WHERE ST_Intersects(
    geometry,
    ST_MakeBox2D(
        ST_MakePoint(-76.0, 39.0),
        ST_MakePoint(-75.5, 39.5)
    )
);
```

### Land Statistics
```sql
SELECT
    land_type,
    COUNT(*) as count,
    SUM(acreage) as total_acreage,
    AVG(acreage) as avg_acreage
FROM public_lands
WHERE state_id = 'md-state-uuid'
GROUP BY land_type;
```

## Maryland Data: Expected Counts

Based on official MD DNR sources:

| Type | Expected Count | Est. Total Acres |
|------|----------------|------------------|
| Wildlife Management Areas (WMA) | ~25 | 150,000+ |
| State Forests | ~15 | 250,000+ |
| Federal Refuges | ~5-8 | 100,000+ |
| **Total** | **~45-48** | **~500,000+** |

Note: Exact counts may vary based on API availability and query completeness.

## Integration with Other Modules

### Regulations Engine (Module 1)
- Land records reference huntable species
- Queries combine land availability with season dates
- `find_lands_open_for_species()` bridges both modules

### AI Planning Engine (Module 3)
- Provides land/location context for hunt planning
- Supplies geometry for map overlay
- Acreage data for feasibility scoring

### Mobile App (React Native)
- Offline lands: `lands.geojson` imported to WatermelonDB + Mapbox offline
- Regulation data: `regulations.json` imported to offline cache
- API queries used when online for real-time updates

## Testing

```python
# Test nearby lands query
async with async_session() as db:
    # Baltimore area (39.2904° N, 76.6122° W)
    lands = await find_nearby_public_lands(
        db, 39.2904, -76.6122, radius_miles=25, state_code="MD"
    )
    assert len(lands) > 0
    assert all("distance_miles" in l for l in lands)
    assert lands[0]["distance_miles"] <= 25

# Test text search
lands = await search_lands(db, "Green Ridge", "MD")
assert any("green ridge" in l["name"].lower() for l in lands)

# Test county query
lands = await get_lands_by_county(db, "Garrett County", "MD")
assert all(l["county"].lower() == "garrett county" for l in lands)
```

## Performance Considerations

### Indexing
- GIS index on `geometry` column (GIST) for spatial queries
- B-tree indexes on `state_id`, `land_type` for filtering
- Distance calculations use indexed `ST_DWithin` function

### Query Optimization
- Distance radius converted to meters once (Mercator projection not needed for small radii)
- Centroid lat/lon cached for UI without full geometry fetch
- Geometry extracted as GeoJSON only when needed (land details endpoint)

### Data Pack Size (Estimated)
- `regulations.json`: ~100-200 KB
- `lands.geojson`: ~5-10 MB (geometry included)
- Total download for Maryland: ~6-11 MB

## Future Enhancements

1. **Multi-state Support**
   - Virginia (VA), Pennsylvania (PA) data sources identified
   - Extend `gis_loader.py` with state-specific loaders
   - Update CLI to support `--state VA`, etc.

2. **Private Parcel Integration** (Phase 2)
   - Load private land parcels from county assessor records
   - `PrivateParcel` model ready in models/land.py
   - For landowner outreach workflows

3. **Terrain Data** (Future)
   - Elevation, land cover, slope statistics
   - `TerrainData` model ready in models/land.py
   - Mapbox raster tiles for offline mobile use

4. **Advanced Spatial Queries**
   - Isochrone queries (30-min drive time from coordinate)
   - Habitat suitability overlays
   - Access difficulty scoring (road density, parking proximity)

5. **Real-time Updates**
   - Scheduled GIS data refresh (weekly/monthly)
   - Incremental update mechanism
   - Version management for data packs

## Troubleshooting

### Issue: "Maryland state record not found"
**Solution**: Run the regulations seeder first:
```bash
python -m scripts.seed_maryland
```

### Issue: GIS API timeout
**Solution**: Increase timeout in `gis_loader.py`:
```python
TIMEOUT = 120.0  # 2 minutes
```

### Issue: Large geometry causing slow queries
**Solution**: Use simplified geometries for map display, full geometry only for editing.

### Issue: Distance calculations inaccurate over large areas
**Solution**: For regional queries (>100 miles), consider projecting to UTM zone first.
Current calculation adequate for Maryland (<150 miles max extent).

## Files

- `gis_loader.py` — GIS data download and import
- `queries.py` — PostGIS spatial queries
- `data_packs.py` — Offline data pack builder
- `routes.py` — FastAPI endpoints
- `README.md` — This file
- `../../scripts/import_gis.py` — CLI import script
- `../../data/packs/maryland/manifest.json` — Sample manifest

## References

- [PostGIS Documentation](https://postgis.net/documentation/)
- [Maryland iMap ArcGIS REST API](https://data.imap.maryland.gov/arcgis/rest/services)
- [USFWS OpenData Portal](https://gis-fws.opendata.arcgis.com/)
- [Shapely Geometry Library](https://shapely.readthedocs.io/)
- [SQLAlchemy GeoAlchemy2](https://geoalchemy-2.readthedocs.io/)
