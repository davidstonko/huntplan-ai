# Gap Trail Polyline Closure Attempt — 2026-04-20

## Executive Summary

Attempted to upgrade 6 remaining pin-only hiking trails to polylines using real data sources (USGS National Map Layer 37, Overpass API, USGS Layer 11). **Result: 0 of 6 upgraded; all 6 remain gaps.**

No viable polylines found that pass sanity gates (length 0.25x-4.0x published; midpoint within 5 km of trailhead; matching name keywords).

## The 6 Gap Trails

| Trail ID | Park | Published (mi) | Trailhead | Reason for Gap |
|----------|------|---|---|---|
| `md-cunningham-falls-loop` | Cunningham Falls SP | 0.8 | 39.5701, -77.4645 | No name-matching polyline in USGS/Overpass within 3 km |
| `md-deep-creek-lake-discovery` | Deep Creek Lake SP | 1.2 | 39.521, -79.3017 | No name-matching polyline in USGS/Overpass within 3 km |
| `md-gambrill-lake` | Gambrill SP | 1.7 | 39.478, -77.492 | No name-matching polyline in USGS/Overpass within 3 km |
| `md-patapsco-orangeville` | Patapsco Valley SP | 1.9 | 39.231, -76.7487 | No name-matching polyline in USGS/Overpass within 3 km |
| `md-rock-creek-valley` | Rock Creek Valley (County) | 3.4 | 39.1063, -77.1144 | No name-matching polyline in USGS/Overpass within 3 km |
| `md-rocky-gap-ridge` | Rocky Gap SP | 4.8 | 39.705, -78.66 | No name-matching polyline in USGS/Overpass within 3 km |

## Investigation Results

### Source 1: USGS National Map Transportation Layer 37 (Trails)

Queried each trail's 0.025-degree bbox (approximately 2 km radius) using the official USGS REST API endpoint at `https://carto.nationalmap.gov/arcgis/rest/services/transportation/MapServer/37/query`.

**Finding:** USGS returned polyline candidates in each bbox, but **none matched the trail name keywords** required by the ingest logic. For example:
- `md-cunningham-falls-loop`: 74 USGS polylines found in bbox; after keyword filtering (must contain a token from ["cunningham", "falls", "cascade"]), zero candidates remained.
- Similar pattern for all 6 trails.

**Conclusion:** These small state-park trails either:
- Are not surveyed in the USGS National Map dataset
- Have been given different names in USGS (e.g., park-internal names, connector names) that don't match the published trail names
- Are too small/informal to be in USGS

### Source 2: OpenStreetMap via Overpass API

Queried Overpass with `highway~(path|footway|track)` filter in same bboxes.

**Finding:** Overpass returned 30-116 path/footway/track ways per trail, including named trails (e.g., "Catoctin National Recreation Trail", "Yellow Poplar Trail", "Salamander"). However, **none matched the target trail names** in the keyword gate.

**Example** (Cunningham Falls):
```
Found ~61 ways with names in bbox (39.5701 ± 0.025, -77.4645 ± 0.025):
  11539831: Catoctin National Recreation Trail (path)
  91766210: Not Blue (path)
  91777708: Skink (path)
  92066162: Salamander Trail (path)
  (... 57 more ...)
  
Target keywords: ["cunningham", "falls", "cascade"]
Zero ways matched target keyword tokens.
```

**Conclusion:** OSM in these areas contains hiking trails, but they represent the local network (e.g., Catoctin yellow/blue blaze system) rather than the specific state-park trails in our dataset. No dedicated "Cunningham Falls Loop" or "Lake Trail" entries exist in OSM.

### Source 3: M-NCPPC (Montgomery County Parks) for `md-rock-creek-valley`

Attempted to locate M-NCPPC ArcGIS service for Rock Creek Regional Park. **No public FeatureServer found** with hiking trail layers at documented endpoints (mcatlas.org, arcgis.com).

**Conclusion:** Rock Creek Valley trail geometry not available from M-NCPPC open data.

## Sanity Gate Details

The ingestion process enforces three mandatory gates:

1. **Name Match (Tier 1):** Candidate polyline name must contain ≥1 non-stopword token from the target keyword set. Example: for `md-cunningham-falls-loop` with keywords `["cunningham", "falls"]`, the polyline name must include "cunningham" OR "falls" (case-insensitive, punctuation-normalized).

2. **Length Sanity (Tier 2):** Polyline length must be within 0.1x–5.0x published distance for hard reject, or 0.25x–4.0x for final gate. For example, `md-cunningham-falls-loop` is 0.8 mi published; any candidate <0.2 mi or >3.2 mi is rejected.

3. **Proximity (Tier 3):** Polyline center-of-mass must be ≤3 km from trailhead. Prevents false matches from same-named trails in other parks.

All 6 gap trails failed **Tier 1 (name match)** — no polyline in any source had a name containing the target keywords.

## Data Quality Notes

- This result is consistent with prior ingestion (2026-04-19) which also concluded these 6 trails have "none" confidence.
- The audit trail in `ingested_trails.json` documents "no candidate with matching name within 3km of trailhead" for each.
- Prior work (osm_nps_polyline_upgrade_2026_04_19.md) successfully upgraded 15 trails and downgraded 2 (Three Notch, Woodrow Wilson Bridge) for inflated polylines. That work benefited from either:
  - Exact OSM relation matches (e.g., "Three Notch Trail" as an OSM relation), or
  - USGS trails with accurate published names
- The 6 remaining gaps are distinctive: they appear to be smaller, newer, or more locally-named trails without dedicated OSM/USGS coverage.

## Recommendation

**Keep all 6 trails in HIKING_TRACE_GAPS.** No authoritative source provides polyline geometry for these trails. Shipping a pin-only representation (with dashed-amber banner) is correct; inventing polylines would violate the no-fabrication constraint.

### Future Options (Deferred)

If high-quality geometry becomes critical:
1. **Request data from park agencies:** MDNR, MDOP, M-NCPPC may have GIS datasets (KML, shapefiles) not published to public APIs.
2. **User-sourced traces:** Allow community members to contribute GPX/polyline traces for validation.
3. **Field survey:** Walk each trail with GPS; typical 5-minute segments yield reliable traces.

## Files Modified

- `src/data/marylandHikingTraces.ts`: No updates (all 6 remain in HIKING_TRACE_GAPS)
- Contract tests: No updates needed (counts unchanged)
- `tsc --noEmit`: Clean (no new code)
- `npm test -- --runInBand --watch=false`: 1166/1166 tests pass (no changes)

## Verification Steps Completed

1. ✅ Queried USGS Layer 37 for each trail's bbox — found candidates but none matched keywords.
2. ✅ Queried Overpass API for each trail's bbox — found OSM ways but none matched keywords.
3. ✅ Attempted M-NCPPC lookup for Rock Creek Valley — no public trail layer found.
4. ✅ Enforced all three sanity gates (name, length, proximity).
5. ✅ No polylines added to marylandHikingTraces.ts (no changes to compile).
6. ✅ No test updates required (counts remain: withGeometry=79, withoutGeometry=6).

## Conclusion

Gap trail polyline closure attempt complete. **0 of 6 trails upgraded.** All 6 remain as pin-only placeholders. No data sources provide authoritative polyline geometry for these trails. Compliance with no-fabrication constraint maintained.
