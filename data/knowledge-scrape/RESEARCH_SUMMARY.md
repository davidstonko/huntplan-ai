# Maryland Boating, Crabbing, Camping & Hiking Research Complete

**Date Completed:** April 11, 2026  
**Duration:** Comprehensive multi-topic web research mission  
**Scope:** Maryland DNR regulations, outdoor infrastructure, guide services, monetization

## What Was Research

### 1. Boating & Crabbing (boating-crabbing/)

**crabbing_regs.json**
- Recreational crabbing season (April 1 - December 15 Chesapeake Bay)
- Size limits: Males 5" minimum (5.25" after July 14), females prohibited
- Daily catch limits: 2-6 dozen depending on boat license status
- Legal gear: Trotlines, crab pots, handlines, dip nets
- Crab pot design specs: Turtle reduction devices, cull rings mandatory
- Operating hours vary by season (sunrise/sunset with 30-minute buffers)

**boating_safety.json**
- Boating license required (Certificate of Boating Safety Education) for born after July 1, 1972
- Vessel registration: 2-year validity, DNR registration mandatory
- PFD requirements: 1 per person minimum, Coast Guard approved
- Children under 13 in boats under 21' must wear PFD
- PWC operators: 16+ with license, all occupants wear PFDs always
- BUI (Boating Under Influence) illegal with fines up to $1,000 and 1-year jail

**bay_access.json**
- Maryland Water Access Guide with boat ramp locations by county
- Calvert County ramps: Hallowing Point, Kings Landing, Solomons
- Chesapeake Beach ramp with 70 parking spots
- Captain John Smith Trail: 3,000 miles, fee-free, permit-free
- Artificial Reef Program: 60+ partners, reef balls, Coble Reef (5 acres), 200 pyramid havens
- Boat registration fees increased (2-year from $24 to $70)

### 2. Camping & Hiking (camping-hiking/)

**state_park_campgrounds.json**
- Reservations: parkreservations.maryland.gov (365-day advance booking)
- Types: Traditional, primitive (first-come first-serve), cabins, RV
- Amenities: Electric, water, sewer, showers, fire rings, picnic tables
- Fees vary by park and season
- Primitive camping in state forests available year-round

**primitive_camping.json**
- Green Ridge State Forest: 49,000 acres, 100 primitive sites, $10/night
- Sites include fire pit, picnic table, space for 2+ tents (no water/plumbing)
- 6 group sites for 20+ people (reservations available)
- Backcountry camping with shelters allowed
- AT Maryland shelters: Pine Knob (1939), Raven Rock, Ed Garvey, Crampton Gap, Ensign Cowall, Rocky Run
- Campsites: Dahlgren (with shower), Pogo (most robust spring), Annapolis Rock (primitive with views)
- Frost-free spigots at Washington Monument, Dahlgren, Crampton Gap

**private_campgrounds.json**
- Jellystone Park Williamsport: 9 luxury cabin types, water park, March 27 - Nov 29
- Frontier Town Berlin: Wild West theme, 700 campsites, ropes course, water park
- Washington DC/Capitol KOA: Rolling countryside near DC/Baltimore/Annapolis
- Glamping options: Yurts, bell tents, Airstreams, treehouses
- Notable glamping: Wild Yough (Garrett County), Savage River Lodge (Western MD), Little Bennett (Clarksburg)

**other_trails.json**
- Billy Goat Trail: 1.7 miles, C&O Canal, challenging scramble, jagged cliffs
- Catoctin Mountain Park: Cunningham Falls (2.8 mi loop, 78-ft waterfall), Wolf Rock Loop
- Sugarloaf Mountain: 5.7 miles, quartzite cliffs, rewarding views
- Calvert Cliffs: 13 miles total, 3.8-mile Red Trail, moderate, landslide warnings at cliffs
- Soldiers Delight: 7 miles, muddy sections, waterproof boots recommended

**at_trail_data.json**
- Maryland AT: 40 miles, easy terrain, 1,650 ft elevation gain
- 6 shelters plus 3 designated campsites
- Water sources: Pogo most reliable, seasonal variations in dry season
- Trailheads: Route 40 (Greenbrier), Pen Mar, Harpers Ferry
- Popular day hikes: Greenbrier to Annapolis Rock, to Washington Monument, Gathland to Weverton

**trail_races.json**
- JFK 50 Mile: 64th annual November 21, 2026, oldest continuously held US ultramarathon
- Catoctin 50K: June 20, 2026, out-and-back format, rocky/demanding terrain

**four_states_challenge.json**
- 43.5-45 miles (varies by endpoints) in 24 hours
- Route: VA/WV border → 3.5 mi WV descent → Potomac River crossing → 2 mi MD C&O Canal flat → PA border
- Popular among thru-hikers, FKT tracking available

### 3. Monetization (monetization/)

**guide_services.json**
- **Fishing Charters (10+ services):**
  - Griffin's Guide Service (redfish, spring-fall)
  - Hookset Guide Service (light tackle)
  - Chesapeake Coastal Charters (fly and light tackle)
  - Chesapeake Bay Sport Fishing (voted Top 10 Fishing Charter 2025)
  - Bay Hunters (Western Shore, April-December)
  - Capt. Phil Gootee, Maryland Fishing & Hunting LLC, others
  
- **Hunting Guides (9+ services):**
  - B & J Guide Service (40+ years, Eastern Shore)
  - DOA Outfitters (sika and whitetail, multiple hunt types)
  - Nanticoke Outfitters (sika, ducks, whitetail)
  - Talbot County Outfitters (quality whitetail/sika)
  - Harrison's Outfitter Service (guiding since 1974)
  - Winter Farms Hunting (3+ generations)
  - Branded Outdoors, Muddy Bottom Outfitters, Duck Hunting MD

**outfitters_gear_shops.json**
- Bass Pro Shops Hanover: Archery lane, climbing wall, aquarium, leader in MD retail
- Cabela's (Bass Pro subsidiary): Fly fishing, camping, hunting gear, online + retail
- Savage River Outfitters: Western MD Blue Ribbon tailwater fly shop
- License sales at all major retailers

**affiliate_opportunities.json**
- **Quick Wins:**
  - Amazon Associates (active, mdoutdoors-20 tag)
  - Campnab ($3 per scan, $7 per membership referral)
  - ReserveAmerica partnership exploration
  
- **Tier 2 Expansion:**
  - Bass Pro/Cabela's affiliate arrangements
  - Guide service booking commissions
  - Local glamping operators
  
- **Tier 3 Premium:**
  - REI membership co-promotion
  - Trip insurance partnerships
  - Camping/lodging affiliate networks (Airbnb, Booking.com, KOA, Jellystone)

## File Organization

```
knowledge-scrape/
├── INDEX.json (master index with all categories and integration opportunities)
├── RESEARCH_SUMMARY.md (this file)
├── boating-crabbing/
│   ├── crabbing_regs.json
│   ├── boating_safety.json
│   └── bay_access.json
├── camping-hiking/
│   ├── state_park_campgrounds.json
│   ├── primitive_camping.json
│   ├── private_campgrounds.json
│   ├── other_trails.json
│   ├── at_trail_data.json
│   ├── trail_races.json
│   └── four_states_challenge.json
└── monetization/
    ├── guide_services.json
    ├── outfitters_gear_shops.json
    └── affiliate_opportunities.json
```

## Key Integration Opportunities

### Immediate (Ready for Phase 4-5B)
1. Add crabbing regulations to Fish Mode regulations screen
2. Link Campnab for camping reservation commissions
3. Feature Four States Challenge in Hike Mode Trail Guide
4. Embed guide service directories with booking links
5. Integrate artificial reef locations into Fish Map

### Short-Term (Next 30 days)
1. Expand Amazon Associates gear recommendations for boating equipment
2. Create guide service booking API integration with featured partners
3. Build glamping content section with Airbnb/booking partnership links
4. Add private campground gallery with Jellystone/Frontier Town highlights

### Medium-Term (Phase 6)
1. Develop revenue tracking dashboard for all affiliate streams
2. Create loyalty program incentivizing booking through app
3. Establish sponsorship relationships with Bass Pro/Cabela's
4. Build guide service ratings/reviews community feature

## Revenue Potential

- **Camping:** $3-7 per Campnab referral (scalable with user base)
- **Gear:** Amazon Associates 3-10% commissions + potential Bass Pro partnerships
- **Services:** Guide booking commissions (negotiate 10-20% per booking)
- **Lodging:** Glamping/KOA affiliate networks (5-15% per booking)

## Data Quality Notes

- All regulations current as of April 2026
- Source verification from official Maryland DNR and government websites
- Multiple source confirmation for critical data (fees, regulations, locations)
- Ready for immediate integration into app development pipeline

---

**Next Steps:** Review INDEX.json for specific integration points. Each JSON file includes source URLs for verification and further research.
