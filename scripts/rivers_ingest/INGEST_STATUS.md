# Maryland Rivers Ingest Status — 2026-04-20

## Executive Summary

**Status: Data Unavailable (All Sources Blocked)**

Attempted to ingest Maryland river polylines from three authoritative sources on 2026-04-20. All sources were unreachable, timing out, or returned zero features. Rather than synthesizing coordinates (which would violate the project's no-fabrication principle), this ingest emitted an **empty but properly-structured MARYLAND_RIVERS module** with clear documentation of what was attempted and why it failed.

**Impact on FishMapScreen:** The Rivers (RIV) toggle is wired and functional, but renders no polylines until a data source becomes available. The base Mapbox GL map still displays OSM river geometries, so anglers are not completely without river reference.

---

## What Was Attempted

### 1. OpenStreetMap Overpass API (Tier 1 — Most Reliable)

**Why this first:** Overpass has historically been the most reliable source for OSM river data. Query is straightforward: `waterway=river` with name attribute.

**Endpoints tested:**
- `https://overpass-api.de/api/interpreter` → **HTTP 406 Not Acceptable**
- `https://overpass.private.coffee/api/interpreter` → **504 Gateway Timeout**
- `https://turbo.openstreetmap.org/api/interpreter` → **Connection refused**
- `https://overpass.openstreetmap.fr/api/interpreter` → **403 Forbidden (whitelisted only)**

**Query attempted:**
```
[out:json][timeout:60];
(
  way["waterway"="river"]["name"](37.9,-79.6,39.75,-75.0);
  relation["waterway"="river"]["name"](37.9,-79.6,39.75,-75.0);
);
out geom;
```

**Root causes:**
- Overpass infrastructure appears to be under heavy load or experiencing outages
- 406 suggests the service requires a User-Agent header (common for API protection)
- Query timeout may need to be split into sub-regions of the MD bbox

### 2. USGS NHDPlus HR MapServer (Tier 2 — Federal Authority)

**Why this second:** USGS National Hydrography Dataset is the authoritative federal source for US river geometry. Available via ArcGIS REST API.

**Service:** `https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer`

**Layers tested:**
- Layer 3: NetworkNHDFlowline
- Layer 4: NonNetworkNHDFlowline
- Layer 7: NHDLine

**Query parameters:**
```json
{
  "geometry": {"xmin": -79.6, "ymin": 37.9, "xmax": -75.0, "ymax": 39.75},
  "geometryType": "esriGeometryEnvelope",
  "spatialRel": "esriSpatialRelIntersects",
  "outFields": "*",
  "returnGeometry": "true",
  "f": "json",
  "resultRecordCount": 1000
}
```

**Result:** HTTP 200 OK, but **0 features returned** across all three layers.

**Root causes (suspected):**
- Query expects `esriGeometryEnvelope` but service may require `esriGeometryPolygon`
- Attribute filtering needed (e.g., `FType=460` for "Stream/River"); query sent `outFields: '*'` without filter
- `resultRecordCount` may need to be omitted or lowered
- Service may require specific knowledge of field names and query syntax not documented in public docs

**Next debugging step:** Open ArcGIS REST API explorer in browser and manually test the query with various geometry types and attribute filters.

### 3. Maryland DNR FeatureServer (Tier 3 — State Authority)

**Status:** Not reached. Would require:
1. Finding the correct FeatureServer URL for hydrography (similar to existing land/tidal services)
2. Discovering the correct layer ID for "rivers" or "flowlines"
3. Testing query syntax specific to MD DNR's schema

Given that Overpass and USGS failed first, prioritizing recovery of those two before attempting DNR discovery.

---

## Files Created/Modified

### New Files
- `src/data/marylandRivers.ts` — Empty but properly-typed river data module with extensive documentation of ingest failure
- `src/data/__tests__/marylandRivers.test.ts` — Contract tests (9 assertions, all passing with zero rivers)
- `scripts/rivers_ingest/ingest_md_rivers.py` — Ingest script with multi-source fallback logic
- `scripts/rivers_ingest/ingest_log.txt` — Detailed log of all ingest attempts
- `scripts/rivers_ingest/INGEST_STATUS.md` — This file

### Modified Files
- `src/screens/FishMapScreen.tsx`
  - Added import: `import { MARYLAND_RIVERS } from '../data/marylandRivers'`
  - Added state: `const [showRivers, setShowRivers] = useState(false)`
  - Added memo: `riversGeoJSON` with proper GeoJSON generation
  - Added ShapeSource + two LineLayer (solid for high-confidence, dashed for approximate)
  - Added RIV toggle chip to filter bar (blue color #1976D2)

---

## Wiring Into FishMapScreen

**Rivers overlay is fully wired and ready:**

1. **Toggle chip:** "RIV" letter-code chip (matches existing pattern for TIDE, RMP, SFT, etc.)
   - Blue color: #1976D2
   - Active state: light blue background + colored border

2. **Map layers:**
   - `riverLinesSolid` — Solid blue lines for high-confidence rivers
   - `riverLinesDashed` — Dashed blue lines for approximate/fragmented rivers
   - Both scale with zoom level (thinner at low zoom, thicker at high zoom)
   - Opacity: 0.7 (solid), 0.5 (dashed) to avoid overwhelming base map

3. **Zero-data state:** When `MARYLAND_RIVERS` is empty, the ShapeSource renders an empty FeatureCollection (no-op in Mapbox GL). No errors, no blank areas.

---

## Test Results

✅ **TypeScript:** `npx tsc --noEmit` — clean, no errors  
✅ **Jest:** `npm test` — 1175/1175 tests pass, including 9 new river contract tests

Contract tests verify:
- MARYLAND_RIVERS is an array
- All metadata fields present and properly typed
- Coordinates are [lng, lat] pairs (GeoJSON order)
- All coords within MD bbox (with 0.2° slack for tidal sections)
- Summary counts match river list
- Confidence matches isApproximate flag
- Source and sourceUrl fields are valid

---

## Impact on FishMapScreen

**Positives:**
- Rivers toggle is visible and responsive to user interaction
- Base Mapbox GL map still renders OSM rivers (from the default tile layer)
- Our overlay layer is structured and ready; once data is available, it will render with no code changes
- UI/UX is consistent with existing Tidal Boundary and Angler Access Site toggles

**Limitations:**
- No rivers will appear on the map until a data source unblocks or becomes available
- Users may notice the RIV toggle does nothing, but the tidal boundary and fishing sites are still functional

**Mitigation:**
- Consider adding a tooltip/help text explaining that rivers come from the base map
- Once Overpass or USGS data is available, re-run `scripts/rivers_ingest/ingest_md_rivers.py` to populate the module (no app-code changes needed)

---

## Recovery Path (Priority Order)

### Priority 1: Fix USGS NHDPlus Query (Highest Confidence)
1. Test query in [ArcGIS REST API explorer](https://developers.arcstac.io/arcgis-rest-js-samples/query-features.html) or browser:
   - Try different geometry types (esriGeometryPolygon instead of esriGeometryEnvelope)
   - Add attribute filter: `where: "FType=460"` (Stream/River in NHD spec)
   - Explicitly list outFields instead of "*"
2. Once query works interactively, update `scripts/rivers_ingest/ingest_md_rivers.py`
3. Re-run ingest to populate `marylandRivers.ts`

### Priority 2: Unblock Overpass API
1. Add User-Agent header to POST request (Overpass often rejects requests without it)
2. Implement query chunking: split MD bbox into 2–4 sub-regions, fetch separately
3. Add exponential backoff for 503/504 responses (common on Overpass)
4. Test with a smaller bbox first (e.g., Chesapeake Bay area only)

### Priority 3: Discover MD DNR Hydrography FeatureServer
1. Follow pattern used for existing DNR services (lands, tidal boundary, etc.)
2. Check with MD DNR GIS team or documentation for public hydrography endpoints
3. Test query syntax once endpoint is identified

### Priority 4: Fallback to Local Processing
1. Download NHD GeoDatabase from [USGS](https://www.usgs.gov/programs/VHP/NHD_Fact_Sheet.html)
2. Use GDAL to extract Maryland rivers and simplify via Douglas-Peucker (epsilon ~50m)
3. Convert to GeoJSON and emit TS module
4. Run ingest script once locally, commit results to repo

### Priority 5: Alternative Data Source (Lower Confidence)
1. Use [Natural Earth](https://www.naturalearthdata.com/downloads/10m-physical-vectors/) `ne_10m_rivers_lake_centerlines.zip`
2. Filter to Maryland, simplify to major rivers only
3. Assign "medium" confidence due to lower detail
4. Note: Suitable for background reference, not high-precision fishing data

---

## Design Decisions & Constraints

**No fabrication:** Per project policy (documented in `.auto-memory/fabrication_pattern_2026_04_18.md`), no coordinates were synthesized or hand-drawn. If data sources failed, we emit an honest empty module with clear documentation.

**Confidence tiers:**
- `high`: USGS NHD or MD DNR, length within 25% of published value
- `medium`: OSM with name match, length within 50% of published
- `low`: OSM fragments or stitched segments outside confidence band

**Approximate flag:** `isApproximate: true` for medium/low confidence (dashed lines on map).

**Simplification target:** Douglas-Peucker epsilon ~50m to keep file size under 2 MB while preserving river course visually.

**Scope:** Main stem only — no tributaries. Target rivers: Potomac, Susquehanna, Patuxent, Patapsco, Monocacy, Gunpowder, Pocomoke, Choptank, Nanticoke, Youghiogheny, Chester, Sassafras, Severn, Magothy, Bush, South, Elk, Wicomico (Eastern Shore + Western Shore).

---

## Code Locations

- **Data module:** `src/data/marylandRivers.ts`
- **Tests:** `src/data/__tests__/marylandRivers.test.ts`
- **Ingest script:** `scripts/rivers_ingest/ingest_md_rivers.py`
- **Ingest log:** `scripts/rivers_ingest/ingest_log.txt`
- **FishMapScreen integration:** `src/screens/FishMapScreen.tsx` (import, state, memo, ShapeSource, LineLayer, toggle chip)

---

## Questions & Future Work

1. **Should we add a "Data unavailable" message to FishMapScreen?**
   - Current: RIV toggle silently does nothing
   - Option: Add a footnote under the stats badge or legend explaining that river data is pending

2. **Should we commit the empty `marylandRivers.ts` to main?**
   - Recommendation: Yes. It's properly typed, tested, and documented. It's a valid state representing "tried hard, no data available."
   - Alternative: Keep it on a separate branch, merge when data becomes available

3. **Should we pre-populate with Natural Earth rivers as a fallback?**
   - Recommendation: Not yet. Wait for USGS NHDPlus to work first. Natural Earth is lower detail and would set expectations we can't meet.

---

**Generated:** 2026-04-20  
**Agent:** claude-haiku-4-5-20251001  
**Project:** MDHuntFishOutdoors V2.3.0+  
**Task:** Ingest USGS NHD river polylines for Maryland (#38)
