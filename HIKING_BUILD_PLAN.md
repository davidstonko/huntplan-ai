# Phase 5: Hiking Module Build Plan — MD Hike

**Created:** 2026-04-05
**Target:** Comprehensive Maryland hiking map with all public lands, parks, and protected areas
**Status:** Planning — build after fishing module is complete

---

## 1. Core Feature: Comprehensive Hiking Map

The hiking map should be the definitive single-source map for ALL publicly accessible outdoor areas in Maryland. Users can toggle categories on/off to show exactly what they want.

### Map Layer Categories (toggleable filters)

| Category | Source | Approx Count | Notes |
|----------|--------|-------------|-------|
| **State Parks** | MD DNR / iMap | ~75 | Full trail systems, camping, facilities |
| **State Forests** | MD DNR | ~8 | Large tracts — Green Ridge, Savage River, Pocomoke, etc. |
| **National Parks** | NPS Data | ~5 | Assateague Island NS, C&O Canal NHP, Fort McHenry, Catoctin Mountain, Chesapeake Bay GWNM |
| **National Battlefields** | NPS Data | ~3+ | Antietam, Monocacy, Fort Washington |
| **National Wildlife Refuges** | USFWS | ~10+ | Blackwater NWR, Eastern Neck NWR, Patuxent Research Refuge, etc. |
| **National Environmental Areas** | Various | Multiple | Chesapeake Bay NERR, other protected zones |
| **National Forests** | USFS | Nearby: GW National Forest (VA border access) |
| **State Natural Resource Management Areas (NRMA)** | MD DNR | ~20+ | Dan's Mountain, Warrior Mountain, etc. |
| **State Natural Environment Areas (NEA)** | MD DNR | Multiple | Conservation-focused lands |
| **County Parks** | County GIS data | 100+ | Each county has its own park system |
| **Rails-to-Trails / Multi-Use Paths** | Rails-to-Trails Conservancy | ~30+ | B&A Trail, NCR Trail, C&O Towpath, etc. |
| **Scenic Byways / Overlooks** | MDOT / DNR | Various | Catoctin, Appalachian, Chesapeake |

### Data Sources

1. **Maryland iMap** (data.imap.maryland.gov)
   - State Parks boundaries and facilities
   - State Forests boundaries
   - DNR lands (NRMA, NEA, WMA — overlap with hunting module)
   - Trail GIS data if available

2. **National Park Service API** (developer.nps.gov/api)
   - All NPS units in Maryland
   - Park boundaries, trail data, alerts, hours
   - Campground availability

3. **USFWS Open Data** (gis-fws.opendata.arcgis.com)
   - National Wildlife Refuge boundaries
   - Public access points

4. **AllTrails / Hiking Project API**
   - Trail GPS tracks, difficulty ratings, reviews
   - (Check API availability and terms)

5. **OpenStreetMap / Overpass API**
   - Trail data as fallback
   - Parking areas, trailheads

6. **USGS / USFS**
   - National Forest boundaries near MD (George Washington NF)
   - Topographic data

### Filter System Design

Same collapsible filter panel pattern as hunting map:

- **Park Type**: State Parks, State Forests, National Parks, National Battlefields, NWR, County Parks, Rails-to-Trails
- **Activities**: Hiking, Camping, Fishing, Swimming, Rock Climbing, Mountain Biking, Horseback Riding
- **Amenities**: Restrooms, Parking, Visitor Center, Picnic Area, Playground, ADA Accessible
- **Difficulty**: Easy, Moderate, Hard, Expert
- **Distance**: < 2 mi, 2–5 mi, 5–10 mi, 10+ mi

Filters combine with AND logic — show areas matching ALL active filters.

### Tab Structure — Hike Mode

```
Hike Map | Trails | AI | Trail Log | Resources
```

- **Hike Map**: Full Mapbox with all park types, trail overlays, toggleable by category
- **Trails**: Browse/search trails by region, difficulty, distance, type
- **AI**: Hiking-focused AI assistant — trail recommendations, weather, conditions
- **Trail Log**: Personal hiking log (distance, elevation, photos)
- **Resources**: Regulations, links, camping reservations, seasonal alerts

---

## 2. Unique Features for Hiking

### Trail Conditions / Recent Reports
- User-submitted trail condition reports (muddy, clear, icy, flooded)
- Integration with NPS alerts for closures
- Seasonal recommendations (fall foliage, wildflower season)

### Camping Integration
- Campground locations on map
- Link to reservation systems (ReserveAmerica / recreation.gov)
- Backcountry camping rules per park

### Water Access Points
- Streams, lakes, waterfalls on trails
- Overlap with fishing module data

### Scenic Overlooks & Points of Interest
- Curated list of best viewpoints
- Historical markers on battlefield sites
- Interpretation centers

---

## 3. Key Maryland Hiking Destinations (Seed Data)

### Must-Have Parks
- Catoctin Mountain Park (presidential retreat area)
- Cunningham Falls State Park (waterfall)
- Assateague Island National Seashore (beach hiking, wild horses)
- C&O Canal National Historical Park (184.5 miles of towpath)
- Antietam National Battlefield (historic trails)
- Monocacy National Battlefield
- Patapsco Valley State Park (closest major park to Baltimore)
- Gunpowder Falls State Park (multi-section, river trails)
- Sugarloaf Mountain (iconic day hike)
- Annapolis Rocks / Black Rock (AT section)
- Dan's Mountain State Park
- Deep Creek Lake State Park
- Calvert Cliffs State Park (fossil hunting beach)
- Soldiers Delight NEA (unique serpentine grasslands)
- North Point State Park / Fort Howard
- Susquehanna State Park
- Rocks State Park (King and Queen Seat)
- Greenbrier State Park
- Swallow Falls State Park (Muddy Creek Falls — tallest waterfall in MD)
- Herring Run Park / Gwynns Falls Trail (urban hiking)

### Appalachian Trail in Maryland
- ~40 miles through MD (South Mountain)
- Key access points and shelters
- Elevation profile data

---

## 4. Sprint Breakdown (estimated)

- **Sprint H-A**: Data pipeline — scrape/download all GIS boundaries for parks, forests, NPS, NWR
- **Sprint H-B**: Build Hike Map screen with Mapbox layers and category toggles
- **Sprint H-C**: Trail browser screen — search, filter, sort
- **Sprint H-D**: AI knowledge base for hiking — trail data, regulations, camping rules
- **Sprint H-E**: Trail Log — GPS tracking, personal hiking history
- **Sprint H-F**: Resources tab — park links, camping reservations, alerts
- **Sprint H-G**: Polish, TypeScript 0 errors, integration testing

---

## 5. Dependencies

- Mapbox offline tiles (already in place from hunting module)
- NPS API key (free, register at developer.nps.gov)
- Maryland iMap access (already used for hunting data)
- USFWS open data (no key needed)
- AllTrails API access (check terms — may need partnership or scraping alternative)

---

*This build plan will be refined as Phase 4 (Fishing) completes and Phase 5 begins.*
