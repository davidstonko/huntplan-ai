# Maryland Fishing Data Knowledge Scrape

**Date Scraped:** 2026-04-11
**Data Source:** Maryland DNR (dnr.maryland.gov), MDE, eRegulations, and community fishing reports

## Files Overview

### 1. **stocking_schedule.json**
Comprehensive trout stocking information for 2026.
- Spring 2026 stocking schedule and dates
- 240,000+ trout annual stocking
- Hotline for updates: 800-688-3467
- Put-and-take vs delayed harvest areas
- Youth-only fishing day (March 21)
- Opening day (March 28)

### 2. **striped_bass_regs.json**
Complete striped bass (rockfish) regulations for 2026 - CRITICAL UPDATE.
- April C&R season (new for 2026, first time since 2019)
- May-July and Sept-Feb harvest: 1 fish, 19-24" slot (Chesapeake Bay)
- August full closure
- Spawning river closures: March 1 - May 31 (7 rivers + Upper Bay)
- Atlantic coast: 28-31" slot year-round
- Charter boat FACTS program details
- Stock status and water temperature notes

### 3. **fish_advisories.json**
Maryland Department of Environment fish consumption advisories.
- Legacy contaminants: Mercury, PCBs, pesticides
- Emerging contaminants: PFAS (15 fish species advisory)
- Interactive map on MDE website
- Species monitored: bass, striped bass, white perch, catfish, eel, carp
- Technical support documentation available

### 4. **creel_surveys.json**
Maryland DNR fishery management and monitoring programs.
- Volunteer muskie creel survey (Potomac River)
- Nighttime electrofishing surveys (catfish, walleye, saugeye)
- Monthly freshwater fisheries reports
- Deep Creek Lake saugeye/walleye studies
- Data used for adaptive management decisions

### 5. **license_fees.json**
Complete 2026 fishing license fee schedule.
**Nontidal (Freshwater):**
- Resident annual: $32
- Nonresident annual: $55
- Trout stamp: $20 (resident), $30 (nonresident)

**Chesapeake Bay & Coastal:**
- Resident annual: $15
- Senior consolidated: Available (trout stamp now separate, $20)

**Special:**
- Recreational crabbing: $2 add-on
- Youth under 16: FREE (no license required)
- Disabled veterans 100%: Free lifetime
- Free fishing days: June 6, June 13, July 4

### 6. **tidal_regulations.json**
Chesapeake Bay and tidal water fishing regulations.
- Tidal/nontidal boundary definitions and example locations
- Striped bass tidal regulations (same as in striped_bass_regs.json)
- Blue crab regulations: April 1 - Dec 15 season, 24 male crabs limit
- Crab pot requirements (cull rings, turtle devices)
- Yellow perch: 5 per day (new limit for 2026)
- Catfish, eel, red drum limits

### 7. **freshwater_regulations.json**
Nontidal (freshwater) fishing species regulations.
- **Trout:** Brook/brown 2 combined, other trout 5 daily (put-and-take)
- **Bass:** 12" minimum, 5 per day (largemouth + smallmouth)
- **Catfish:** No limits, year-round
- **Walleye:** 15" minimum, 5 daily (special Deep Creek slot: 18-21")
- **Saugeye:** 15" minimum, 5 daily (Deep Creek Lake)
- **Muskie:** 40" minimum, 1 per day
- **Panfish:** No size limits, 15 daily for crappie/bluegill
- Youth under 16: FREE license, 2 trout daily in youth areas

### 8. **boat_ramps_access.json**
Public water access and boat launch information.
- Maryland Online Water Access Guide: https://dnr.maryland.gov/boating/pages/water-access/boatramps.aspx
- Fishing Access Map: http://gisapps.dnr.state.md.us/PublicFishingAccess/index.html
- Categories: Boat ramps, soft access (kayaks/canoes), transient docking, fishing piers
- Example locations: Elkneck Rogues Harbor (4 ramps), Fishing Bay area
- Important: Fees/permits vary by local jurisdiction

### 9. **community_reports.json**
Fishing report sources and current conditions.
- **Official Reports:** Maryland DNR weekly reports (Fridays during season)
- **Online Sources:** The Fisherman Magazine, On The Water, The BayNet, FishTalk Magazine
- **Current March 2026 Conditions:**
  - Water temps: 50s-60s (2-4° below normal)
  - Striped bass: Catch-and-release active, upper bay
  - White perch: Spawning runs in tidal rivers
  - Blue catfish: Highly available in Potomac/Patuxent/Nanticoke
- **Local Bait Shops:** Clyde's Sport Shop (Halethorpe) since 1957

## Data Quality Notes

1. **Official Sources:** All data from Maryland DNR, MDE, eRegulations (official regulatory sites)
2. **2026 Current:** All regulations effective 2026-04-11 or later
3. **License Fees:** Effective June 1, 2025 through 2026
4. **Striped Bass Regs:** Major 2026 changes - April C&R (new), August closure (new), slot limits verified
5. **Community Reports:** March-April 2026 reports with real conditions
6. **Completeness:** 
   - Stocking: Comprehensive schedule for spring 2026
   - Regulations: All major species and water types covered
   - Advisories: Current MDE consumption advisories with methodology
   - Access: Online tools available for boat ramp database

## Integration with App

### Fish Mode Tab Structure
```
Fish Map | Spots | AI | Honey Hole | Resources
```

### Data Usage Opportunities

1. **Fish Map Layer:** Can overlay stocking schedules, advisory zones
2. **Spots Tab:** Users can track stocking locations, plan trips
3. **AI Chat:** Can reference regs by species, water type, season
4. **Honey Hole (Camps):** Can share fishing reports, recent conditions
5. **Resources Tab:**
   - Regulations section: Link to eRegulations, display key limits
   - Stocking schedule: Display 2026 stocking by county
   - Fish advisories: Interactive map embed or link
   - Boat ramps: List of access points with DNR link
   - Licenses: Fee schedule with purchase link (compass.dnr.maryland.gov)

### Monetization Opportunities

1. **Premium features:** Early notification of stocking schedules
2. **Affiliate:** Links to fishing license purchases
3. **Ads:** Local bait shops (partnership model)
4. **Community:** User-submitted fishing reports (like DNR weekly reports)

## Sources Summary

| Data Category | Primary Source | Secondary Sources |
|---|---|---|
| Stocking | dnr.maryland.gov/fisheries/pages/trout/stocking.aspx | 800-688-3467 hotline |
| Striped Bass | news.maryland.gov/dnr (2026 press) | eRegulations, DNR regulations maps |
| Fish Advisories | mde.maryland.gov/fish-consumption-advisory | MDE interactive map |
| Creel Surveys | dnr.maryland.gov/fisheries reports | Monthly FW reports PDF |
| Licenses | dnr.maryland.gov/pages/service_fishing_license.aspx | eRegulations licenses-fees |
| Tidal Regs | eRegulations.com/maryland/fishing | COMAR 08.02.01, PRFC |
| Freshwater | eRegulations.com/maryland/fishing | DNR species pages |
| Boat Ramps | dnr.maryland.gov/boating/water-access | GIS app, local agencies |
| Reports | news.maryland.gov/dnr/tag/weekly-fishing-report/ | The Fisherman, On The Water |

## Future Enhancements

1. **GIS Integration:** Embed fishing access map directly in app
2. **Stocking Schedule API:** Real-time stocking updates (800-688-3467 automation)
3. **Consumption Advisories Widget:** Pull MDE interactive map data
4. **Community Reports:** Scrape weekly DNR reports for in-app display
5. **Multi-state:** Repeat for Virginia, Pennsylvania when available
6. **Notifications:** Push alerts for:
   - Trout stocking at favorite locations
   - Spawning river closure dates
   - Consumption advisory updates
   - Free fishing days

## Compliance Notes

- All data publicly available from Maryland DNR/MDE
- No private/commercial data scraped
- Regulations current as of 2026-04-11
- Recommend checking dnr.maryland.gov weekly for updates during active seasons
- Always display "Verify with Maryland DNR" disclaimer in app

---

**Last Updated:** 2026-04-11
**Next Refresh:** Recommended when 2026 seasons close or DNR posts major updates
