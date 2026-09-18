# Maryland 2026-2027 Hunting Regulation Sources

Audit date: 2026-09-18. Every value changed in this pass is listed here with the
authoritative MD DNR / eRegulations source it was taken from. Anything that could
not be verified from DNR was left unchanged and is listed under **OPEN** at the end.

## Sources used (all fetched 2026-09-18)

| Key | URL | Notes |
|---|---|---|
| CAL | https://dnr.maryland.gov/wildlife/Documents/Hunting-Seasons-Calendar.pdf | "Maryland Hunting Seasons Calendar for 2026-2027" (DNR PDF, incl. Sunday charts + footnotes) |
| SUN | https://dnr.maryland.gov/huntersguide/documents/sundaydeerhuntingcalendar.pdf | "2026-2027 Sunday Deer Hunting in Maryland" |
| DEER | https://www.eregulations.com/maryland/hunting/deer-seasons-bag-limits | eRegulations "Maryland Deer Seasons & Bag Limits" 2026-2027 (official Guide to Hunting and Trapping in Maryland) |
| TURK | https://www.eregulations.com/maryland/hunting/turkey-seasons-limits | eRegulations Turkey Seasons & Limits 2026-2027 |
| MGB | https://www.eregulations.com/maryland/hunting/migratory-game-bird-seasons-limits | eRegulations Migratory Game Bird Seasons & Limits 2026-2027 |
| SG | https://www.eregulations.com/maryland/hunting/small-game-seasons-limits | eRegulations Small Game Seasons & Limits 2026-2027 |
| BEAR | https://www.eregulations.com/maryland/hunting/black-bear-hunting | eRegulations Black Bear Hunting 2026 |
| BEAR2 | https://dnr.maryland.gov/huntersguide/Pages/BlackBearHunt.aspx | DNR "Guide to Hunting Black Bears in Maryland" |
| FEES | https://dnr.maryland.gov/pages/service_hunting_license.aspx | DNR "Maryland Hunting Licenses, Stamps and Permits" (price list) |
| FEES2 | https://www.eregulations.com/maryland/hunting/hunting-licenses | eRegulations Hunting Licenses 2026-2027 |
| RD | https://dnr.maryland.gov/fisheries/pages/regulations/changes.aspx | DNR Fisheries "Changes to Fishing Regulations" |
| FFD | https://dnr.maryland.gov/fisheries/pages/free-fishing.aspx | DNR Free Fishing Days |
| GUIDE | https://dnr.maryland.gov/huntersguide | DNR landing page: "Welcome to 2026-2027 Maryland Hunting" → links to eRegulations |

Note on fee conflict: https://dnr.maryland.gov/wildlife/pages/hunt_trap/huntinglicenses.aspx still
shows the old $24.50 / $130 prices. FEES (DNR service page) and FEES2 (2026-27 Guide) both show
$35 / $160; the app already carried $35/$160 and those values are retained.

Note on dead links: `https://dnr.maryland.gov/wildlife/Pages/hunt_trap/deerseasons.aspx`,
`.../mgbseasons.aspx`, `.../bbhunt.aspx` and
`https://dnr.maryland.gov/huntersguide/Documents/Hunting_Seasons_Calendar.pdf` all return 404
as of 2026-09-18 (the latter was the 2025-26 PDF path).

## Changed values

### src/data/marylandHuntingData.ts — REGULATIONS_META

| Field | Old | New | Source | Snippet |
|---|---|---|---|---|
| seasonLabel | 2025-2026 | 2026-2027 | CAL | "Maryland Hunting Seasons Calendar for 2026-2027" |
| publishedOn | 2025-07-15 | 2026-06-12 | eRegulations wild-turkey-hunting page footer | "Last Updated: June 12, 2026" |
| nextSeasonExpectedBy | 2026-07-01 | 2027-07-01 | task directive | (DNR publishes new license-year regs each July) |

### src/data/marylandHuntingData.ts — MD_SEASONS (deer)

| Entry | Old | New | Source | Snippet |
|---|---|---|---|---|
| White-tailed deer, Archery | 2025-09-06 → 2026-01-31 (single span) | 5 statewide segments: 2026-09-11→10-21, 10-25→11-27, 12-14→12-18, 2027-01-03→01-07, 01-11→01-31; plus 2027-01-08→01-10 Region A only | CAL, DEER | CAL: "9/11--------- 10/21 10/25-------- 11/27 12/14-12/18 1/3-1/7 *Archery also open 1/8-1/10 in Region A only 1/11-1/31"; DEER: "Archery: Sept. 11–Oct. 21, Oct. 25–Nov. 27, Dec. 14–18, Jan. 3–7, Jan. 8–10 (Region A only), Jan. 11–31" |
| White-tailed deer, Firearms | 2025-11-29 → 2025-12-13 | 2026-11-28 → 2026-12-12; plus 2027-01-08 → 01-10 Region B only | CAL, DEER | CAL: "11/28-12/12 *Firearms open 1/8-1/10 in Region B only"; DEER: "Firearms: Nov. 28–Dec. 12, Jan. 8–10 (Region B only)" |
| White-tailed deer, Muzzleloader (early) | 2025-10-18 → 10-25 | 2026-10-22 → 10-24 | CAL, DEER | CAL: "10/22 - 10/24"; DEER: "Muzzleloader: Oct. 22–24" |
| White-tailed deer, Muzzleloader antlerless-only Region B (new) | — | 2026-10-26 → 10-31 | CAL, DEER | CAL: "White-tailed Deer, Antlerless, Muzzleloader, Region B ... 10/26-10/31"; DEER: "Muzzleloader: Oct. 22–24, Oct. 26–31" (Region B antlerless) |
| White-tailed deer, Muzzleloader (late) | 2025-12-20 → 2026-01-03 | 2026-12-19 → 2027-01-02 (Region A antlerless only 12/26–1/2) | CAL, DEER | CAL: "12/19- 1/2"; Region A antlerless "12/26- 1/2"; DEER: "Muzzleloader: Oct. 22–24, Dec. 26–Jan. 2" (Region A antlerless) |
| Junior Deer Hunt Days (new) | — | 2026-11-14 → 11-15 | CAL, DEER | CAL: "Junior Deer Hunt Days 11/14-11/15"; DEER: "November 14 (statewide), November 15 (select counties)" |
| Primitive Deer Hunt Days (new) | — | 2027-02-01 → 02-03 | CAL, DEER | CAL: "Primitive Deer Hunt Days 2/1-2/3"; footnote 6: "Hunters may only use long bows, recurve bows or flintlock and sidelock percussion muzzleloading rifles or handguns during these days." |
| Sika deer (new, all seasons) | — | Archery 2026-09-11→10-21, 10-25→11-27, 12-14→12-18, 2027-01-03→01-07, 01-11→01-31; Muzzleloader 10-22→10-24, 12-19→2027-01-02, antlerless-only Region B 10-26→10-31; Firearms 11-28→12-12, 2027-01-08→01-10 | CAL, DEER | DEER: "Sika Deer — All seasons allow '3 deer, no more than 1 antlered' — Archery: Sept. 11–Oct. 21, Oct. 25–Nov. 27, Dec. 14–18, Jan. 3–7, Jan. 11–31; Muzzleloader: Oct. 22–24, Dec. 19–Jan. 2 (Oct. 26–31 antlerless only in Region B); Firearms: Nov. 28–Dec. 12, Jan. 8–10"; CAL footnote 5: "Sika deer may be hunted statewide where they are found." |

### MD_SEASONS (turkey)

| Entry | Old | New | Source | Snippet |
|---|---|---|---|---|
| Spring turkey | 2026-04-14 → 05-23, bag "1 bearded turkey" | 2027-04-19 → 05-24, bag "1 bearded turkey per day, 2 per season" | CAL, TURK | CAL: "Wild Turkey, Spring Season 4/19-------5/24"; TURK: "April 19–May 24 (Statewide) — Bag Limit: '1 bearded turkey per day, 2 bearded turkeys per season'" |
| Junior turkey hunt days (new) | — | 2027-04-17 → 04-18 | CAL, TURK | CAL footnote 7: "Junior Turkey Hunt Season is open statewide on Saturday, April 17, 2027 ... and Sunday, April 18, 2027 in certain counties" |
| Fall turkey (archery) 2025-10-04→11-01 and Fall turkey (firearms) 2025-10-18→10-25 | two statewide entries, bag 2 | one entry 2026-10-31 → 11-08, Allegany/Garrett/Washington only, bag 1 either sex (fall+winter combined) | CAL, TURK | CAL: "Wild Turkey, Fall Season 10/31-11/8"; footnote 7: "The Fall Season hunting area includes Allegany, Garrett and Washington counties only."; TURK: "Bag Limit: '1 turkey of either sex' (combined Fall/Winter); Weapons: airguns, crossbows, handguns, shotguns, rifles or vertical bows" |
| Winter turkey (new) | — | 2027-01-21 → 01-23 statewide | CAL, TURK | CAL: "Wild Turkey, Winter Season 1/21-1/23"; TURK: "January 21–23 (Statewide)" |

### MD_SEASONS (migratory birds)

| Entry | Old | New | Source | Snippet |
|---|---|---|---|---|
| September teal | 2025-09-01 → 09-15, 4/day, statewide | 2026-09-17 → 09-26, 6/day, September Teal Hunt Zone counties | CAL, MGB | MGB: "Sept. 17, 2026–Sept. 26, 2026 — 6 teal per day, possession limit of 18"; CAL footnote 13 lists the zone counties |
| Ducks split 1/2 (statewide, 2025-10-25→11-15, 11-29→12-14) | 2 entries | Eastern Zone 2026-10-10→10-17, 11-14→11-27; Western Zone 2026-10-03→10-17, 11-21→11-27; both zones 2026-12-15→2027-01-30 | CAL, MGB | MGB: Eastern "Oct. 10, 2026–Oct. 17, 2026 / Nov. 14, 2026–Nov. 27, 2026 / Dec. 15, 2026–Jan. 30, 2027"; Western "Oct. 3, 2026–Oct. 17, 2026 / Nov. 21, 2026–Nov. 27, 2026 / Dec. 15, 2026–Jan. 30, 2027"; CAL footnote 14 defines the zones |
| Geese "Regular" 2025-10-25→12-14, 5/day | 1 entry | AP Canada goose 2026-11-24→11-27 and 12-15→2027-01-30, 2/day (AP zone counties); Early resident Canada goose Eastern 2026-09-01→09-15 and Western 09-01→09-25, 8/day; Late resident Western MD 11-21→11-27, 12-15→2027-03-10 (5/day); Late resident Southern MD 11-21→11-23 (5), 11-24→11-27 (2), 12-15→01-30 (2), 02-01→03-10 (5); Light geese 11-07→11-27, 11-30→2027-02-06 statewide and 02-08→03-10 Eastern, 25/day; Brant 12-28→2027-01-30, 1/day | CAL, MGB | MGB: "Atlantic Population Canada Goose — Nov. 24, 2026–Nov. 27, 2026 / Dec. 15, 2026–Jan. 30, 2027 — 2 per day, possession limit of 6"; "Early Resident Canada Goose — Eastern Zone Sept. 1–Sept. 15, 2026 / Western Zone Sept. 1–Sept. 25, 2026 — 8 per day, possession limit of 24"; late resident tables reproduced in CAL ("LATE SOUTHERN MARYLAND RESIDENT CANADA GOOSE ZONE SEASON AND BAG LIMITS 2026–2027", "LATE WESTERN MARYLAND ..."); "Light Geese — Nov. 7, 2026–Nov. 27, 2026 / Nov. 30, 2026–Feb. 6, 2027; Eastern Zone extended Feb. 8, 2027–March 10, 2027 — 25 per day, no possession limit"; "Brant — Dec. 28, 2026–Jan. 30, 2027 — 1 per day, possession limit of 3" |
| Mourning dove (new) | — | 2026-09-01→10-17, 10-24→11-27, 12-19→2027-01-09; 15/day | CAL, MGB | MGB: "Sept. 1, 2026–Oct. 17, 2026 / Oct. 24, 2026–Nov. 27, 2026 / Dec. 19, 2026–Jan. 9, 2027 — 15 per day, possession limit of 45" |
| Woodcock (new) | — | 2026-10-24→11-27, 2027-01-11→01-27; 3/day | CAL, MGB | MGB: "Oct. 24, 2026–Nov. 27, 2026 / Jan. 11, 2027–Jan. 27, 2027 — 3 per day, possession limit of 9" |

### MD_SEASONS (small game / bear)

| Entry | Old | New | Source | Snippet |
|---|---|---|---|---|
| Rabbit | 2025-10-01 → 2026-02-28 | 2026-11-07 → 2027-02-28 | CAL, SG | SG: "Eastern Cottontail Rabbit — Season: 'Nov. 7–Feb. 28' — 4 per day / 8" |
| Squirrel | 2025-09-06 → 2026-02-01 | 2026-09-05 → 2027-02-28 | CAL, SG | SG: "Squirrel — Season: 'Sept. 5–Feb. 28' — 6 per day / 12" |
| Pheasant | 2025-11-01 → 12-31 | 2026-11-07 → 2027-02-28 | CAL, SG | SG: "Pheasant — Season: 'Nov. 7–Feb. 28' — '2 per day- either sex' / 4" |
| Ruffed grouse | 2025-10-04 → 11-22, 3/day 6 poss., Garrett+Allegany only | 2026-10-03 → 12-31, 2/day 4 poss., statewide | CAL, SG | SG: "Ruffed Grouse — Season: 'Oct. 3–Dec. 31' — Bag Limit: '2 per day' — Possession Limit: '4' — County Restrictions: All counties" |
| Quail (new) | — | 2026-11-07 → 2027-01-15, 6/day; closed Allegany & Garrett and DNR lands east of the Susquehanna | CAL, SG | SG: "Quail — Season: 'Nov. 7–Jan. 15' ... Closed in Allegany and Garrett counties and on DNR-managed lands east of Susquehanna River — 6 per day / 12" |
| Black bear | 2025-10-20 → 10-25, weapon "Rifle" | 2026-10-26 → 10-31; weapons per BEAR | CAL, BEAR, BEAR2 | CAL: "Black Bear 10/26 - 10/31"; BEAR2: "The 2026 bear hunting season will be open for six days (October 26-31, 2026)"; BEAR: "Rifles ... shotguns ... handguns ... muzzleloaders ... vertical bows ... crossbows ... air guns"; BEAR2: "Maryland's black bear hunting season is not a quota hunt" |

### MD_BAG_LIMITS

| Field | Old | New | Source | Snippet |
|---|---|---|---|---|
| Deer antlerless Region A note | "maximum 1 per day and 2 total for the year" | "up to two antlerless deer per weapon season, no more than two total for all seasons combined" | DEER | "Up to two antlerless deer may be harvested during a weapon season but no more than two total for all seasons combined" |
| Turkey spring | 1 per spring season | 2 per season (1 per day) | TURK | "1 bearded turkey per day, 2 bearded turkeys per season" |
| Turkey fall/winter | 2 combined | 1 combined | TURK | "Bag Limit: '1 turkey of either sex' (combined Fall/Winter)" |
| Teal | 4/day | 6/day | MGB | "6 teal per day possession limit of 18" |
| Geese (Canada, Snow) 5/day | one rule | AP Canada goose 2/day; resident Canada goose 8/day (early) and 5 or 2/day (late, by zone/date); light geese 25/day; brant 1/day | MGB | quoted above |
| Ruffed grouse | 3/day, 6 poss. | 2/day, 4 poss. | SG | "'2 per day' — Possession Limit: '4'" |
| Bear weaponType | "Rifle or Shotgun Slug" | "Rifle, Shotgun, Handgun, Muzzleloader, Bow, Crossbow, or Air Gun" | BEAR | legal weapons list quoted above |

### MD_WATERFOWL_REGULATIONS / MD_BLIND_DRAW_CALENDAR

| Field | Old | New | Source | Snippet |
|---|---|---|---|---|
| Federal duck stamp price | $25 | $29 (DNR) / $27 (post office, duckstamp.com) | FEES | "Federal Migratory Bird Hunting and Conservation Stamp - $29.00" and "At U.S. Post Offices and at duckstamp.com - $27.00" |
| MD migratory game bird stamp | (no price) | $15 | FEES | "Maryland Migratory Game Bird Stamp: '$15.00'" |
| Duck species sub-limits | Canvasback 1, Pintail 1, Scaup "1 early / 2 late" | 4 mallards (2 hens), 3 wood ducks, 2 black ducks, 2 canvasbacks, 3 pintails, 2 redheads, 1 scaup (2/day Jan 8–30), 1 fulvous tree duck, 1 mottled duck, 4 sea ducks | MGB | "6 ducks, no more than: 4 mallards (only 2 can be hens) 3 wood ducks 2 black ducks (Black Duck Season only) 2 canvasbacks 3 pintails 2 redheads 1 scaup per day (2 per day from Jan. 8 – Jan. 30) 1 fulvous tree duck 1 mottled duck 4 sea ducks: no more than 3 scoters, 3 long-tailed ducks, or 3 eiders (only 1 eider hen)" |
| Goose species limits | "Canada 5/day regular, 15/day late; snow 25/day conservation" | AP zone 2/day; resident zones 8/day early, 5 (or 2) late; light geese 25/day regular | MGB | quoted above |
| Blind calendar: early teal | "September 1 - September 15" | "September 17 - 26, 2026" | MGB | "Sept. 17, 2026–Sept. 26, 2026" |
| Blind calendar: regular opens | "Late October" | "October 3 (Western) / October 10 (Eastern), 2026" | MGB | quoted above |
| Blind calendar: late goose | "January - February ... 15 per day" | "Through March 10, 2027 in the late-resident zones (5/day)" | CAL | "LATE WESTERN MARYLAND ... Dec. 15, 2026–Mar. 10, 2027 5 per day" |
| Blind calendar: snow goose | "January - April ... no daily bag limit" | Regular light-goose 25/day; Conservation Order dates "TBD" | CAL, MGB | CAL: "Light Goose Conservation Order Season TBD TBD TBD"; MGB: "25 per day, no possession limit" |

### src/data/chatKnowledge.ts

| Field | Old | New | Source | Snippet |
|---|---|---|---|---|
| Season/bag/fee/trapping labels (4 places) | literal '2025-2026' | `REGULATIONS_META.seasonLabel` | — | single source of truth |
| formatDateShort year | 2025 | 2026 | — | code hygiene |
| Waterfowl handler MD stamp | $9 | $15 | FEES | "Maryland Migratory Game Bird Stamp: '$15.00'" |
| Waterfowl handler federal stamp | $25 | $29 | FEES | quoted above |
| Bear handler lottery period | "July 12 – August 31" | "July 15 – August 31, 2026"; season Oct 26–31, 2026 added | BEAR, BEAR2 | BEAR: "Permit Lottery Application Period: July 15 through August 31, 2026"; BEAR2: "(October 26-31, 2026)" |
| Rabbit season line | "September 1 – February 28" | "November 7, 2026 – February 28, 2027" | SG | quoted above |
| Squirrel season line | "September 6 – February 28" | "September 5, 2026 – February 28, 2027" | SG | quoted above |
| Dove season line | "September 1 – January 31" | "Sept 1–Oct 17, Oct 24–Nov 27, Dec 19, 2026–Jan 9, 2027" | MGB | quoted above |
| Quail season/limit | "November – February; 4 per day" | "November 7, 2026 – January 15, 2027; 6 per day" | SG | quoted above |
| Nonresident trapping license | $250 | $50 | FEES, FEES2 | FEES: "Nonresident Trapping License $50.00"; FEES2: "Trapping License: $50" |
| Sika handler | no dates/limits | 2026-27 dates + "3 deer, no more than 1 antlered" | DEER | quoted above |
| Non-lead ammo wording | "NEW Sept 1, 2026" | "Effective Sept 1, 2026" | — | wording only; date unchanged |

### src/data/marylandFishingRegs.ts

| Field | Old | New | Source | Snippet |
|---|---|---|---|---|
| Red drum | 1/day, 18–27", "Proposed Sept 1, 2026" | 3/day, 18–26", adopted effective Aug 3, 2026 | RD | "Status: Adopted as Proposed – Effective August 3, 2026 ... catch and possession limit increased from 1 to 3 per person per day ... maximum size limit decreased from 27 inches to 26 inches total length" |
| checkFreeFishingDay | non-June months labeled "July" | only June/July compared | — | bug fix |
| MD_FREE_FISHING_DAYS | unchanged | unchanged | FFD | page lists only "the first two Saturdays in June and July 4" with no 2027 dates |

### src/services/pushNotifications.ts

MD_SEASON_OPENINGS is now derived from MD_SEASONS (dove, deer archery, deer muzzleloader,
deer firearms, spring turkey openers) — no hard-coded dates.

### src/screens/HarvestLogScreen.tsx

The four literal `'2025-2026'` strings now read `REGULATIONS_META.seasonLabel`.

## OPEN (not verified from DNR — left unchanged)

- chatKnowledge.ts Special Hunts: Chesapeake Forest lottery deadline "August 21"; Deal Island WMA
  impoundment dates "September 1–15 / November 1–February 7".
- chatKnowledge.ts Managed Hunts: Anne Arundel deadline "October 17"; Seneca Creek window
  "September 3 – December 5"; hunter counts.
- chatKnowledge.ts Small Game: pheasant stocking dates "November 22–23, 2025" (2026 stocking
  dates not yet published on a DNR page I could fetch).
- chatKnowledge.ts Trapping: resident Furtaker license "$30.50" (not on FEES/FEES2 pages).
- chatKnowledge.ts License handler: "Hunter Safety Course required if born after 1-1-1976",
  disabled-veteran free license, junior free one-time license wording.
- marylandHuntingData.ts MD_BAG_LIMITS Region B note: county list for the "Suburban Deer
  Management Zone" (eRegulations only says "Unlimited antlerless in the Suburban Deer
  Management Zone" without listing counties).
- MD_BLIND_DRAW_CALENDAR: lottery application window "July 1 - August 15" and results
  "September 1 - 15" (blind-lottery page not fetched).
- MD_SEASONS: Light Goose Conservation Order dates (DNR calendar shows "TBD"). Rails and snipe
  seasons (in MGB) were not added to MD_SEASONS.
- Waterfowl Youth/Veteran/Military days (Nov 7, 2026 and Feb 6, 2027) not modelled.
- src/screens/PlanScreen.tsx carries its own private, stale 2025 `MD_SEASONS` copy; it is not
  wired into AppNavigator (wiringIntegrity.test.ts lists it as "possibly superseded") and was
  out of scope for this pass.
- src/data/README.md, QUICK_REFERENCE.md, INTEGRATION_GUIDE.md still describe 2025-2026 in
  prose (documentation only).
- MD_FREE_FISHING_DAYS_2026: DNR lists no 2027 dates yet.
