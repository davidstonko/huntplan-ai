/**
 * Maryland Local Services — outfitters, guides, shops, charters, lodges
 *
 * 2026-04-26: First pass on the "Local Pros" join layer that ties
 * services to specific waters / regions / species.
 *
 * Why this exists vs. `guideServicesData.ts`:
 *   - `guideServicesData.ts` (61 entries) is a flat directory grouped by
 *     business type. Great for the "Resources → Guide Directory" screen.
 *   - This file ADDS the join keys — `waters[]`, `regions[]`, `species[]`
 *     — so that Fish hotspot detail cards can show "Local pros for
 *     Loch Raven Dam Pool" pulling from the same dataset, and so the AI
 *     chat can answer "who guides on the Savage River?".
 *   - We do NOT duplicate the existing flat directory; we layer the
 *     join keys on a focused subset of services (fly shops, river guides,
 *     and the highest-priority charter / outfitter entries).
 *
 * Provenance discipline (per fabrication_pattern memory, 2026-04-18):
 *   Every entry MUST cite the URL where the contact info / waters served
 *   were verified. We do NOT hand-add phone numbers or addresses without
 *   a citation. If we cannot verify a business is operating in 2025/2026,
 *   we mark `verifiedAt` and skip rather than hand-place.
 *
 * Initial ship count: 24 services
 *   • 11 fishing services (fly shops, river guides, charter operators)
 *   • 13 hunting services (waterfowl outfitters, sika guides, taxidermists)
 *
 * Future passes (deferred — see FISHING_OVERHAUL_PLAN.md and the
 * cross_cutting_audit memory):
 *   - Bay charter fleet expansion (~30 more captains across Solomons,
 *     Rock Hall, Tilghman, Kent Narrows, Crisfield)
 *   - Eastern Shore waterfowl lodge expansion (~10 more)
 *   - Western MD bear-hunt outfitters (DNR-coordinator referral pipeline)
 *   - Affiliate / commission terms negotiated per business
 *
 * Last updated: 2026-04-26
 */

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type ServiceCategory =
  // Fishing categories
  | 'fly-shop'
  | 'tackle-shop'
  | 'river-guide'        // walk/wade or drift-boat trout/smallmouth
  | 'bay-charter'        // Bay striped bass / saltwater
  | 'offshore-charter'   // OC tuna/marlin canyon trips
  | 'fly-charter'        // light-tackle + fly Bay specialists
  | 'fishing-lodge'
  | 'marina-rental'
  // Hunting categories
  | 'waterfowl-outfitter'
  | 'big-game-guide'
  | 'sika-outfitter'
  | 'hunting-lodge'
  | 'archery-pro-shop'
  | 'taxidermist'
  | 'game-processor'
  | 'call-decoy-maker'
  | 'shooting-complex'   // 2026-04-26: indoor gun + archery range combos (Guntry, etc.)
  // Hiking / biking / trail-running (added 2026-04-26)
  | 'hiking-shop'        // outdoor specialty (REI etc.)
  | 'bike-shop'
  | 'shoe-store'         // running / trail-running specialty
  | 'hiking-club'
  | 'biking-club'
  | 'trail-shuttle'      // AT through-hiker shuttles
  | 'hostel'             // trail-magic hostels
  // Cross-mode
  | 'big-box'
  | 'club';

export type ServiceTrust =
  | 'verified-2026' // we web-verified contact info this year
  | 'directory'     // listed in DNR / VisitMD / similar directory
  | 'tip-only';     // user-submitted, awaiting verification (future tier)

export interface LocalService {
  id: string;
  name: string;
  category: ServiceCategory;

  /** What waters/regions/species this service explicitly says it serves.
   *  Used to join into hotspot detail cards + AI knowledge. */
  waters?: string[];     // for fishing services
  regions?: string[];    // for hunting services (county / region names)
  species?: string[];    // for hunting services (deer, sika, geese, etc.)

  /** Contact info — only included when verified from the business's own
   *  current website. Never hand-typed. */
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city: string;
  state: 'MD' | 'VA' | 'PA' | 'WV' | 'DE';

  /** Short description from the shop's own website / About page. */
  description: string;

  /** Offerings — comma-separated short tags, mirrored from the website. */
  offerings: string;

  /** Provenance — URL where we verified the data. Required. */
  source: string;

  /** Trust tier — see ServiceTrust. */
  trust: ServiceTrust;

  /** Date we last verified the data, ISO YYYY-MM-DD. */
  verifiedAt: string;

  /** Optional flag for the UI to surface a featured card style. */
  featured?: boolean;

  /** Optional GPS coordinates so the service can render as a map pin
   *  (Hunt mode for shooting-complex/archery-pro-shop, Hike mode for
   *  hiking-shop/bike-shop). When omitted the service only appears in
   *  list views, not on a map. */
  lat?: number;
  lng?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// FISHING SERVICES
// ════════════════════════════════════════════════════════════════════════════

const FISHING_SERVICES: LocalService[] = [
  // ── Fly shops ──────────────────────────────────────────────────────
  {
    id: 'great-feathers',
    name: 'Great Feathers',
    category: 'fly-shop',
    waters: ['Gunpowder Falls', 'Big Hunting Creek', 'Beaver Creek', 'Loch Raven Reservoir'],
    phone: '410-472-6799',
    website: 'https://www.greatfeathers.com/',
    address: '14824 York Rd, Sparks Glencoe, MD 21152',
    city: 'Sparks Glencoe',
    state: 'MD',
    description: 'Fly fishing specialty shop established 1993, located steps from Gunpowder Falls State Park.',
    offerings: 'Fly gear, tying materials, guided trips, lessons, Gunpowder Fly Co house brand',
    source: 'https://www.greatfeathers.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    featured: true,
  },
  {
    id: 'backwater-angler',
    name: 'Backwater Angler',
    category: 'fly-shop',
    waters: ['Gunpowder Falls', 'Big Gunpowder', 'Little Gunpowder Falls'],
    phone: '410-357-9557',
    website: 'https://backwaterangler.com/',
    address: '16829 York Rd, Monkton, MD 21111',
    city: 'Monkton',
    state: 'MD',
    description: 'Full-service fly shop steps from the Gunpowder River, 35 minutes from downtown Baltimore.',
    offerings: 'Fly gear, guided trips, instruction, expert local Gunpowder advice',
    source: 'https://backwaterangler.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    featured: true,
  },
  {
    id: 'tochtermans',
    name: "Tochterman's Fishing Tackle",
    category: 'tackle-shop',
    waters: ['Chesapeake Bay', 'Susquehanna River', 'Loch Raven Reservoir', 'Gunpowder Falls'],
    phone: '410-327-6942',
    email: 'tochtermans@hotmail.com',
    website: 'https://www.tochtermansfishingtackle.com/',
    address: '1925 Eastern Ave, Baltimore, MD 21231',
    city: 'Baltimore',
    state: 'MD',
    description: 'Family-owned-since-1916 Baltimore fishing tackle institution — saltwater, freshwater, fly fishing room on the second floor.',
    offerings: 'Saltwater + freshwater + fly tackle, gear, dedicated fly fishing department',
    source: 'https://www.tochtermansfishingtackle.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    featured: true,
  },
  {
    id: 'savage-river-outfitters',
    name: 'Savage River Outfitters',
    category: 'fly-shop',
    waters: ['Savage River', 'North Branch Potomac River', 'Casselman River', 'Deep Creek Lake'],
    phone: '703-517-1040',
    website: 'https://www.savageriveroutfitters.com/',
    address: '2721 Savage River Rd, Swanton, MD 21561',
    city: 'Swanton',
    state: 'MD',
    description: 'Full-service fly shop on the Blue Ribbon Savage River tailwater in Western MD; 3 riverfront lodging homes.',
    offerings: 'Orvis + TFO gear, guided wade + float trips, riverfront cabin rentals, instruction',
    source: 'https://www.savageriveroutfitters.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    featured: true,
  },

  // ── River guides ────────────────────────────────────────────────────
  {
    id: 'heavy-water-anglers',
    name: 'Heavy Water Anglers',
    category: 'river-guide',
    waters: ['Savage River', 'North Branch Potomac River', 'Beaver Creek'],
    website: 'https://www.heavywateranglers.com/',
    city: 'Western Maryland',
    state: 'MD',
    description: 'Captain Tom Martin guide service — Savage, North Branch Potomac, Beaver Creek primary waters.',
    offerings: 'Float trips for trout/smallmouth/musky, walk-and-wade trout, Sage rods provided, full-day with lunch',
    source: 'https://www.heavywateranglers.com/services-pricing/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    featured: true,
  },

  // ── Tackle / bait shops ─────────────────────────────────────────────
  {
    id: 'anglers-sport-center',
    name: 'Anglers Sport Center',
    category: 'tackle-shop',
    waters: ['Chesapeake Bay', 'Severn River', 'Magothy River', 'South River'],
    phone: '410-757-3442',
    website: 'https://www.anglerssportcenter.com/',
    address: '1456 Whitehall Rd, Annapolis, MD 21409',
    city: 'Annapolis',
    state: 'MD',
    description: 'Annapolis bait & tackle shop with 60+ years of MD fishing experience — open 6am most days.',
    offerings: 'Live + frozen bait, rods, reels, lures, fly backing, hunting gear, firearms',
    source: 'https://www.anglerssportcenter.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },

  // ── Bay / offshore charter operators ────────────────────────────────
  {
    id: 'oc-fishing-center',
    name: 'Ocean City Fishing Center & Marina',
    category: 'offshore-charter',
    waters: ['Atlantic Ocean', 'Ocean City Inlet', 'Canyons (Norfolk, Poor Mans, Washington)'],
    phone: '800-322-3065',
    website: 'https://ocfishing.com/',
    city: 'Ocean City',
    state: 'MD',
    description: 'Hub marina for the OC offshore charter fleet — multiple boats targeting tuna, marlin, mahi, wahoo.',
    offerings: 'Offshore canyon trips, inshore charters, multi-boat marina',
    source: 'https://ocfishing.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },
  {
    id: 'finatic-sportfishing',
    name: 'FINATIC Sportfishing',
    category: 'offshore-charter',
    waters: ['Atlantic Ocean', 'Mid-Atlantic Canyons'],
    website: 'https://www.finaticsportfishing.com/',
    city: 'West Ocean City',
    state: 'MD',
    description: 'Captain Mark Malamphy — 43-foot Viking Convertible offshore. Targets white marlin, blue marlin, tuna, wahoo.',
    offerings: 'Offshore canyon trips, big-game tournaments',
    source: 'https://www.finaticsportfishing.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },
  {
    id: 'overboard-sportfishing',
    name: 'Over-Board Sportfishing',
    category: 'offshore-charter',
    waters: ['Atlantic Ocean', 'OC Canyons'],
    website: 'https://www.overboardsportfishing.com/',
    city: 'Ocean City',
    state: 'MD',
    description: '32-foot Topaz Express offshore — competitively priced offshore tuna and mahi.',
    offerings: 'Offshore tuna + mahi trips, $860 / 5-hour, $1,675 / canyon',
    source: 'https://www.overboardsportfishing.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },

  // ── Bay charter fleet (Phase 2 — 2026-04-27) ───────────────────────
  // Solomons hub
  {
    id: 'lucky-strike-charters',
    name: 'Lucky Strike Fishing Charters',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Patuxent River'],
    website: 'https://www.luckystrikefishingcharters.com/',
    city: 'Solomons',
    state: 'MD',
    description: 'Solomons-based charter — striped bass, bluefish, spot, croaker, perch, redfish, flounder, Spanish mackerel.',
    offerings: 'Half / full / multi-day Bay trips, scenic cruises',
    source: 'https://www.luckystrikefishingcharters.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'strike-zone-charters',
    name: 'Strike Zone Charter Fishing',
    category: 'bay-charter',
    waters: ['Chesapeake Bay'],
    website: 'https://www.fishstrikezone.com/',
    city: 'Solomons',
    state: 'MD',
    description: '42-foot enclosed-cabin charter out of Solomons — fall rockfish + spring trophy season specialty.',
    offerings: '5-hour rockfish trips, full-day Bay charters, restroom on board',
    source: 'https://www.fishstrikezone.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'bunkys-charter-boats',
    name: "Bunky's Charter Boats",
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Patuxent River'],
    website: 'http://www.bunkyscharterboats.com/',
    city: 'Solomons',
    state: 'MD',
    description: 'Solomons charter fleet — multi-boat operation. Stripers, rockfish, croaker, spot, bluefish, flounder, trout.',
    offerings: 'Sportfishing, private cruises, dinner cruises',
    source: 'http://www.bunkyscharterboats.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  // Rock Hall hub
  {
    id: 'miss-carolyn-ii',
    name: 'Miss Carolyn II Charters',
    category: 'bay-charter',
    waters: ['Chesapeake Bay'],
    website: 'https://misscarolyncharters.com/',
    city: 'Rock Hall',
    state: 'MD',
    description: 'Captain Wayne Fletcher — 50+ years fishing the Chesapeake. Fishes 5-10 miles from Rock Hall Harbor.',
    offerings: 'Bay charters, departures from Rock Hall or Kent Island',
    source: 'https://misscarolyncharters.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'rockaholic-fishing',
    name: 'Rockaholic Fishing Charters',
    category: 'bay-charter',
    waters: ['Chesapeake Bay'],
    website: 'http://www.rockaholicfishing.com/',
    city: 'Rock Hall',
    state: 'MD',
    description: '42-foot charter operating out of Rock Hall — convenient to MD, DE, PA, NJ anglers.',
    offerings: 'Rockfish + multi-species Bay charters',
    source: 'http://www.rockaholicfishing.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  // Tilghman hub
  {
    id: 'knapps-narrows-charters',
    name: "Knapp's Narrows Marina & Charters",
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Eastern Bay'],
    website: 'https://knappsnarrowsmarina.com/fishing-charters/',
    city: 'Tilghman Island',
    state: 'MD',
    description: 'Tilghman Island marina hosting 3 charter captains — each with experienced Bay-running boats.',
    offerings: 'Multi-captain charter fleet, marina + inn',
    source: 'https://knappsnarrowsmarina.com/fishing-charters/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },

  // Chesapeake Beach hub
  {
    id: 'rod-n-reel-charters',
    name: "Rod 'N' Reel Charter Fishing",
    category: 'bay-charter',
    waters: ['Chesapeake Bay'],
    phone: '866-312-5596',
    website: 'https://www.rnrresortmd.com/marina/charterfishing',
    address: '4165 Mears Ave, Chesapeake Beach, MD 20732',
    city: 'Chesapeake Beach',
    state: 'MD',
    description: 'Largest fishing fleet on the Chesapeake — operating since 1946 ("charter fishing capital of MD"). Trophy stripers, blues, Spanish mackerel.',
    offerings: '6 + 8-hour Bay trips, multi-boat fleet, marina + resort',
    source: 'https://www.rnrresortmd.com/marina/charterfishing',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
    featured: true,
  },
  {
    id: 'capt-marty-simounet',
    name: 'Captain Marty Simounet — Charter Fishin',
    category: 'bay-charter',
    waters: ['Chesapeake Bay'],
    phone: '410-474-4105',
    email: 'charterfishing@aol.com',
    website: 'https://www.charterfishin.com/',
    city: 'Chesapeake Beach',
    state: 'MD',
    description: 'Independent Rod-N-Reel-fleet captain — light tackle + trolling for stripers, blues, mackerel.',
    offerings: 'Half + full-day Bay charters',
    source: 'https://www.charterfishin.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },

  // Annapolis hub
  {
    id: 'mega-bite-charters',
    name: 'Mega Bite Fishing Charters',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Severn River'],
    website: 'https://megabitefishing.com/',
    city: 'Annapolis',
    state: 'MD',
    description: 'Captain Billy Williams — Severn River area + Bay specialist for striped bass.',
    offerings: 'Striped bass charters out of Annapolis',
    source: 'https://megabitefishing.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'annapolis-fishing-charters',
    name: 'Annapolis Fishing Charters',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Severn River'],
    phone: '410-858-2944',
    website: 'https://annapolisfishingcharters.com/',
    city: 'Annapolis',
    state: 'MD',
    description: 'Captain with 45 years on the Bay out of Annapolis. Striped bass + multi-species.',
    offerings: 'Full Bay charters',
    source: 'https://annapolisfishingcharters.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'koon-dog-charters',
    name: 'Koon Dog Charters',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Magothy River'],
    phone: '410-255-0609',
    city: 'Magothy River',
    state: 'MD',
    description: 'Captain Kevin Kuhne on the Magothy — striped bass charter out of an underused hub.',
    offerings: 'Bay charters from the Magothy',
    source: 'https://captainexperiences.com/locations/maryland/annapolis',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },

  // Kent Narrows hub — added 2026-04-27 (round 9)
  {
    id: 'badfish-charter',
    name: 'Badfish Sportfishing Charters',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Eastern Bay'],
    phone: '410-708-6754',
    website: 'https://badfishcharterfishing.com/',
    city: 'Stevensville',
    state: 'MD',
    description: 'Captain Michael Kent at the foot of the Kent Narrows bridge — Eastern Bay striped bass specialist.',
    offerings: 'Bay striper charters, Eastern Bay light-tackle',
    source: 'https://badfishcharterfishing.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'kodiak-charters',
    name: 'Kodiak Charters',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Eastern Bay'],
    phone: '443-496-2418',
    website: 'https://kodiakchartersmd.com/',
    city: 'Grasonville',
    state: 'MD',
    description: "Captain Mike Middleton — Angler's Marina next to The Big Owl in Grasonville. Bay + Eastern Bay species variety.",
    offerings: 'Bay charters, multi-species',
    source: 'https://kodiakchartersmd.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'shirley-b-iii',
    name: 'Shirley B III (Capt. Montro Wright)',
    category: 'bay-charter',
    waters: ['Chesapeake Bay'],
    phone: '410-490-2580',
    address: 'Wells Cove Public Landing',
    city: 'Kent Narrows',
    state: 'MD',
    description: '50x15 ft fiberglass head boat licensed for 49 passengers — multi-party charters out of Wells Cove.',
    offerings: 'Head-boat charters, multi-party trips',
    source: 'https://www.kentnarrowsmd.com/fishing-charters',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'island-queen',
    name: 'Island Queen (Capt. Tyrone Meredith)',
    category: 'bay-charter',
    waters: ['Chesapeake Bay'],
    phone: '410-490-0091',
    city: 'Kent Narrows',
    state: 'MD',
    description: '5th-generation fisherman with 40+ years experience — the longest head boat (55 ft) in the Kent Narrows fleet.',
    offerings: 'Head-boat fishing trips',
    source: 'https://www.kentnarrowsmd.com/fishing-charters',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'capt-mark-galasso',
    name: 'Capt. Mark Galasso',
    category: 'bay-charter',
    waters: ['Chesapeake Bay'],
    phone: '410-310-1200',
    city: 'Kent Narrows',
    state: 'MD',
    description: '30+ years experience — fishing + cruising + ecotourism out of Kent Narrows.',
    offerings: 'Bay charters, ecotourism cruises',
    source: 'https://www.kentnarrowsmd.com/fishing-charters',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'allie-bye-charters',
    name: 'Allie Bye Charters (Capt. Danny Harris)',
    category: 'bay-charter',
    waters: ['Chesapeake Bay'],
    phone: '410-758-1837',
    city: 'Kent Narrows',
    state: 'MD',
    description: '46x16 ft Baybuilt — USCG certified for 37 passengers. Long-time Kent Narrows operator.',
    offerings: 'Multi-party Bay charters',
    source: 'https://www.kentnarrowsmd.com/fishing-charters',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  // Bay fly-fishing specialist
  {
    id: 'fly-fish-chesapeake',
    name: 'Fish Hawk Guide Service (Capt. Gary Neitzey)',
    category: 'fly-charter',
    waters: ['Chesapeake Bay', 'Susquehanna Flats'],
    website: 'https://www.flyfishthechesapeake.com/',
    city: 'Maryland',
    state: 'MD',
    description: 'Year-round saltwater fly + light-tackle on the Chesapeake. Spring Susquehanna Flats specialist for trophy-striper C&R.',
    offerings: 'Fly + light-tackle Bay charters, Susquehanna Flats trophy striper',
    source: 'https://www.flyfishthechesapeake.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
    featured: true,
  },

  // Saint Marys / Patuxent hub — added 2026-04-27 (round 9)
  {
    id: 'marica-ii',
    name: 'Marica II (Capt. Gary Sacks)',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Patuxent River'],
    phone: '301-872-5506',
    city: 'Solomons',
    state: 'MD',
    description: 'Long-running St. Marys County charter on the Patuxent + lower Bay.',
    offerings: 'Bay + Patuxent charters',
    source: 'https://www.visitstmarysmd.com/explore/outdoor-recreation/water/fishing/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'eva-marie',
    name: 'Eva Marie (Capt. Greg Drury)',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Patuxent River'],
    phone: '301-872-4455',
    city: 'Solomons',
    state: 'MD',
    description: 'St. Marys County charter — Patuxent specialist.',
    offerings: 'Bay + Patuxent charters',
    source: 'https://www.visitstmarysmd.com/explore/outdoor-recreation/water/fishing/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'capt-pete-ide',
    name: 'Capt. Pete Ide',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Patuxent River'],
    phone: '301-481-1889',
    city: 'Solomons',
    state: 'MD',
    description: 'St. Marys County independent captain — Patuxent + lower Bay.',
    offerings: 'Bay + Patuxent charters',
    source: 'https://www.visitstmarysmd.com/explore/outdoor-recreation/water/fishing/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'reel-attitude-357',
    name: 'Reel Attitude Fishing 357 (Capt. Michael McQueen)',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Patuxent River'],
    phone: '202-957-4721',
    website: 'https://booking.page/en/company/page/reelattitudefishing357',
    city: 'Solomons',
    state: 'MD',
    description: 'Online booking with Reel Attitude Fishing 357 — Bay + Patuxent.',
    offerings: 'Bay + Patuxent charters, online booking',
    source: 'https://booking.page/en/company/page/reelattitudefishing357',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'katherine-charter',
    name: 'Katherine Charter Fishing',
    category: 'bay-charter',
    waters: ['Chesapeake Bay', 'Patuxent River'],
    phone: '301-904-0935',
    city: 'Solomons',
    state: 'MD',
    description: 'St. Marys County charter — Bay + Patuxent.',
    offerings: 'Bay + Patuxent charters',
    source: 'https://www.visitstmarysmd.com/explore/outdoor-recreation/water/fishing/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },

  // Crisfield / Tangier Sound hub (lower-Bay) — added 2026-04-27 ─────
  {
    id: 'crisfield-charters',
    name: 'Crisfield Charters',
    category: 'bay-charter',
    waters: ['Tangier Sound', 'Pocomoke Sound', 'Chesapeake Bay'],
    website: 'https://www.crisfieldcharters.com/',
    city: 'Crisfield',
    state: 'MD',
    description: 'Captain Ray Johns — licensed Master Coast Guard Captain. 25+ years light-tackle on Tangier Sound. Specked trout, redfish, stripers.',
    offerings: 'Light-tackle Tangier Sound trips, Smith Island runs',
    source: 'https://www.crisfieldcharters.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
    featured: true,
  },
  {
    id: 'last-cast-charters',
    name: 'Last Cast Charters',
    category: 'bay-charter',
    waters: ['Tangier Sound', 'Pocomoke Sound', 'Chesapeake Bay'],
    website: 'https://www.lastcastcharters.com/',
    city: 'Crisfield',
    state: 'MD',
    description: 'Tangier + Pocomoke Sound charter — also runs near Chincoteague.',
    offerings: 'Multi-species inshore charters',
    source: 'https://www.lastcastcharters.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'rollin-stone-charters',
    name: "Rollin' Stone Fishing Charters",
    category: 'bay-charter',
    waters: ['Tangier Sound', 'Chesapeake Bay'],
    website: 'https://www.dastone.com/',
    address: 'Somers Cove Marina, Crisfield, MD',
    city: 'Crisfield',
    state: 'MD',
    description: 'Captain Da Stone — departs from Somers Cove Marina. Bay + Tangier Sound species variety.',
    offerings: 'Bay + Tangier Sound charters',
    source: 'https://www.dastone.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'tangier-island-cruises',
    name: 'Tangier Island Cruises',
    category: 'bay-charter',
    waters: ['Tangier Sound', 'Chesapeake Bay'],
    phone: '410-968-2338',
    address: '1001 W Main St, Crisfield, MD 21817',
    city: 'Crisfield',
    state: 'MD',
    description: 'Crisfield-based fishing charters + ferry to Tangier Island. Multi-purpose charter operation.',
    offerings: 'Fishing charters, Tangier Island ferry, sightseeing cruises',
    source: 'https://www.yelp.com/biz/tangier-island-cruises-crisfield-3',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },

  // ── Marina + rental ─────────────────────────────────────────────────
  {
    id: 'bills-marine-service',
    name: "Bill's Marine Service",
    category: 'marina-rental',
    waters: ['Deep Creek Lake'],
    website: 'https://www.billsmarineservice.com/',
    address: '1867 Deep Creek Dr, McHenry, MD 21541',
    city: 'McHenry',
    state: 'MD',
    description: '60+ years on Deep Creek Lake — five locations across Garrett County. Fishing-specific boat rentals.',
    offerings: '40HP fishing boats, 75HP pontoons, free temp boater license, gear included',
    source: 'https://www.billsmarineservice.com/check-out-our--fishing-boat-rentals-on-deep-creek-lake-md',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// HUNTING SERVICES
//
// Sourced from agent web research 2026-04-26. Each entry's `source` URL
// was verified during that research pass.
// ════════════════════════════════════════════════════════════════════════════

const HUNTING_SERVICES: LocalService[] = [
  // ── Eastern Shore waterfowl outfitters ──────────────────────────────
  {
    id: 'winter-farms-hunting',
    name: 'Winter Farms Hunting',
    category: 'waterfowl-outfitter',
    regions: ['Kent County', "Queen Anne's County", 'Eastern Shore'],
    species: ['Canada Goose', 'Duck'],
    phone: '410-708-7133',
    website: 'https://winterfarmshunting.com/',
    city: 'Chestertown',
    state: 'MD',
    description: 'Family-run Eastern Shore waterfowl outfitter — 3+ generations of MD goose-pit experience.',
    offerings: 'Fully licensed guides, goose + duck combos, blind / pit hunts',
    source: 'https://winterfarmshunting.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    featured: true,
  },
  {
    id: 'maryland-waterfowl',
    name: 'Maryland Waterfowl Hunting',
    category: 'waterfowl-outfitter',
    regions: ['Chesapeake Bay', 'Atlantic Ocean'],
    species: ['Sea Duck', 'Brant'],
    website: 'https://marylandwaterfowl.com/',
    city: 'Eastern Shore',
    state: 'MD',
    description: 'Captain Marc Spagnola — sea duck and brant specialist on the Bay and Atlantic. Big-water 28-foot Blue Water boat.',
    offerings: 'Sea duck hunts, brant hunts, offshore big-water hunting',
    source: 'https://marylandwaterfowl.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },
  {
    id: 'harrisons-outfitter',
    name: "Harrison's Outfitter Service",
    category: 'waterfowl-outfitter',
    regions: ['Talbot County', 'Eastern Shore'],
    species: ['Duck', 'Goose', 'Dove', 'Turkey', 'Whitetail'],
    phone: '410-714-2200',
    website: 'https://harrisonsoutfitterservice.com/',
    address: '1204 Jefferson Avenue, St. Michaels, MD 21663',
    city: 'St. Michaels',
    state: 'MD',
    description: 'Licensed guide service since 1974 — multi-species Eastern Shore.',
    offerings: 'Guided hunts (waterfowl/dove/turkey/deer), full equipment fleet',
    source: 'https://harrisonsoutfitterservice.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },

  // ── Sika outfitters ─────────────────────────────────────────────────
  {
    id: 'muddy-marsh',
    name: 'Muddy Marsh Outfitters',
    category: 'sika-outfitter',
    regions: ['Dorchester County', 'Fishing Bay area'],
    species: ['Sika Deer'],
    phone: '410-228-2770',
    website: 'https://www.muddymarsh.com/',
    city: 'Cambridge',
    state: 'MD',
    description: 'Archery-only sika outfitter on 1,500-2,000 acres Dorchester private property — operating since 1992.',
    offerings: 'Archery sika hunts, baited stands, mature stags',
    source: 'https://www.muddymarsh.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    featured: true,
  },
  {
    id: 'tundratour',
    name: 'TUNDRATOUR Hunting & Fishing Adventures',
    category: 'sika-outfitter',
    regions: ['Dorchester County'],
    species: ['Sika Deer'],
    website: 'https://www.tundratour.com/maryland-sika.html',
    city: 'Eastern Shore',
    state: 'MD',
    description: 'Fair-chase 5-day archery sika hunts with 60+ years guide experience.',
    offerings: '5-day fair-chase sika archery, meals + lodging + guides',
    source: 'https://www.tundratour.com/maryland-sika.html',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },
  {
    id: 'nanticoke-outfitters',
    name: 'Nanticoke Outfitters',
    category: 'hunting-lodge',
    regions: ['Dorchester County'],
    species: ['Sika Deer', 'Whitetail', 'Duck', 'Sea Duck', 'Diver Duck', 'Turkey'],
    website: 'https://nanticokeoutfitters.com/',
    city: 'Wingate',
    state: 'MD',
    description: 'Lodge-based outfitter (8 guests, 3 bedrooms) offering sika + waterfowl combo packages.',
    offerings: 'Multi-day combo hunts (sika + duck), lodge accommodations',
    source: 'https://nanticokeoutfitters.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },

  // ── Lodges / multi-species ──────────────────────────────────────────
  {
    id: 'pintail-point-pintail',
    name: 'The Point at Pintail',
    category: 'hunting-lodge',
    regions: ["Queen Anne's County", 'Eastern Shore'],
    species: ['Duck', 'Goose', 'Pheasant', 'Quail', 'Chukar'],
    website: 'https://pointatpintail.com/',
    address: 'Wye River, Queenstown, MD',
    city: 'Queenstown',
    state: 'MD',
    description: 'Wye-River-side lodge on the Eastern Shore — wild waterfowl + released-bird preserve hunts, fine-dining lodge.',
    offerings: 'Wild + preserve waterfowl, sporting clays, lodge dining',
    source: 'https://pointatpintail.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'schraders-outdoors',
    name: "Schrader's Outdoors",
    category: 'hunting-lodge',
    regions: ['Caroline County', 'Eastern Shore'],
    species: ['Duck', 'Goose', 'Whitetail', 'Turkey', 'Upland Bird'],
    website: 'https://schradersoutdoors.com/',
    city: 'Henderson',
    state: 'MD',
    description: 'Henderson, MD — waterfowl/whitetail/turkey/upland multi-species. Field pits, A-frames, river blinds, layout blinds. Bridgetown Manor lodge.',
    offerings: 'Multi-species guided hunts, lodge, sporting clays',
    source: 'https://schradersoutdoors.com/hunting/waterfowl/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
    featured: true,
  },
  {
    id: 'hopkins-game-farm',
    name: 'Hopkins Game Farm',
    category: 'hunting-lodge',
    regions: ['Kent County', 'Eastern Shore'],
    species: ['Goose', 'Duck', 'Whitetail', 'Pheasant', 'Quail', 'Chukar'],
    website: 'https://www.visitmaryland.org/listing/outdoor-recreation/hopkins-game-farm',
    city: 'Kennedyville',
    state: 'MD',
    description: 'Kennedyville Eastern Shore — sporting clays + NSCA 5-Stand + deer + goose hunting on the same property.',
    offerings: 'Hunting + sporting clays + 5-Stand',
    source: 'https://www.visitmaryland.org/listing/outdoor-recreation/hopkins-game-farm',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'wild-wings-maryland',
    name: 'Wild Wings Maryland',
    category: 'hunting-lodge',
    regions: ['Eastern Shore'],
    species: ['Duck', 'Goose', 'Sea Duck'],
    website: 'https://www.wildwingsmaryland.com/',
    city: 'Eastern Shore',
    state: 'MD',
    description: 'Eastern-Shore lodge pairing waterfowl hunts with full accommodations — strategically located near Bay marshes.',
    offerings: 'Waterfowl hunts + lodge package',
    source: 'https://www.wildwingsmaryland.com/lodging',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'fowl-play-guide',
    name: 'Fowl Play Guide Service',
    category: 'waterfowl-outfitter',
    regions: ['Eastern Shore'],
    species: ['Duck', 'Goose'],
    website: 'https://www.fowlplayguideservice.com/marylandduckhunt.htm',
    city: 'Eastern Shore',
    state: 'MD',
    description: 'Eastern Shore duck-hunt guide service — field + water blinds, full guided experience.',
    offerings: 'Guided duck + goose hunts',
    source: 'https://www.fowlplayguideservice.com/marylandduckhunt.htm',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },
  {
    id: 'riverside-lodge-md',
    name: 'Riverside Lodge',
    category: 'hunting-lodge',
    regions: ['Eastern Shore'],
    species: ['Duck', 'Goose', 'Sea Duck'],
    website: 'https://riversidelodgemd.com/waterfowl/',
    city: 'Eastern Shore',
    state: 'MD',
    description: 'Premier Eastern Shore waterfowl lodge — shore blinds, pond blinds, sea-duck rigs.',
    offerings: 'Lodge accommodations, blind hunts, sea-duck rig trips',
    source: 'https://riversidelodgemd.com/waterfowl/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },

  // ── Call / decoy makers ─────────────────────────────────────────────
  {
    id: 'sean-mann',
    name: 'Sean Mann Outdoors',
    category: 'call-decoy-maker',
    regions: ['Eastern Shore'],
    species: ['Canada Goose', 'Snow Goose', 'Specklebelly Goose', 'Duck'],
    website: 'https://seanmann.com/',
    city: 'Trappe',
    state: 'MD',
    description: 'Master goose caller — 35+ World/International calling titles, retired World Goose Champion. Hand-turned wood + molded calls.',
    offerings: 'The Eastern Shoreman + Shorty + Sweet Talker + White Out goose calls; duck calls; heirloom decoys',
    source: 'https://seanmann.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    featured: true,
  },

  // ── Taxidermy / processing ──────────────────────────────────────────
  {
    id: 'precision-taxidermy-md',
    name: 'Precision Taxidermy',
    category: 'taxidermist',
    regions: ['Maryland', 'Virginia', 'Delaware'],
    species: ['Duck', 'Goose', 'Sea Duck'],
    phone: '443-833-5511',
    website: 'https://www.precisiontaxidermymd.com/',
    city: 'Maryland',
    state: 'MD',
    description: 'Waterfowl taxidermy specialist serving MD/VA/DE.',
    offerings: 'Waterfowl mounts, full reproductions',
    source: 'https://www.precisiontaxidermymd.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },
  {
    id: 'natalies-taxidermy',
    name: "Natalie's Taxidermy",
    category: 'taxidermist',
    regions: ['Western Maryland', 'Frederick County'],
    species: ['Whitetail', 'Bear', 'Turkey'],
    phone: '240-315-3471',
    website: 'https://www.nataliestaxidermy.com/',
    address: '1725 Monument Rd, Myersville, MD 21773',
    city: 'Myersville',
    state: 'MD',
    description: 'Full-service taxidermy in Western MD — convenient to Catoctin Mtn / Frederick deer + bear hunts.',
    offerings: 'Big-game shoulder mounts, Euro mounts, turkey fans',
    source: 'https://www.nataliestaxidermy.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },

  // ── Archery / pro shops ─────────────────────────────────────────────
  {
    id: 'autumn-sky-outfitters',
    name: 'Autumn Sky Outfitters',
    category: 'archery-pro-shop',
    regions: ['Harford County', 'Conowingo area'],
    species: ['Whitetail', 'Bear', 'Turkey'],
    website: 'https://www.autumnskyoutfitters.com/',
    city: 'Bel Air',
    state: 'MD',
    description: 'Top-brand archery pro shop on the Conowingo Dam corridor.',
    offerings: 'Bows, arrows, tuning, ranges, gear',
    source: 'https://www.autumnskyoutfitters.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },
  {
    id: 'bowhunters-den',
    name: 'Bowhunters Den Outdoors',
    category: 'archery-pro-shop',
    regions: ['Carroll County', 'Northern Maryland'],
    species: ['Whitetail', 'Bear'],
    website: 'https://www.bowhuntersdenmaryland.com/',
    city: 'Taneytown',
    state: 'MD',
    description: 'Full-service archery pro shop in northern MD.',
    offerings: 'Equipment sales, servicing, tune-ups, expert advice',
    source: 'https://www.bowhuntersdenmaryland.com/location/main-location/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },

  // ── DNR Bear Hunt Coordinator (Western MD) ──────────────────────────
  // 2026-04-27: There is no significant private bear-outfitter scene in
  // MD because hunts are lottery-only and largely on public land
  // (Green Ridge SF, Savage River SF, Dan's Mountain WMA, etc.). The
  // best "service" we can surface is the DNR contact for the lottery +
  // public-land map resources.
  {
    id: 'dnr-bear-hunt-program',
    name: 'MD DNR Black Bear Hunt Program',
    category: 'club',  // closest fit — coordinator/program, not a guide
    regions: ['Garrett County', 'Allegany County', 'Frederick County', 'Washington County', 'Western Maryland'],
    species: ['Bear'],
    phone: '410-260-8540',
    website: 'https://fishandhuntmaryland.com/species/bear',
    city: 'Annapolis',
    state: 'MD',
    description: 'Maryland is a lottery-only bear-hunt state — limited 6-day season (Oct 20-25 in 2025). Apply mid-July through August via COMPASS. Public land includes Green Ridge SF (45,000 ac), Savage River SF (54,000 ac), Dans Mountain WMA, Warrior Mountain WMA.',
    offerings: 'Lottery permits, public-land maps, Wildlife Division biologist contact for habitat questions',
    source: 'https://news.maryland.gov/dnr/2025/07/14/hunters-can-now-apply-for-the-2025-maryland-black-bear-hunt-lottery/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-27',
  },

  // ── Big-box ─────────────────────────────────────────────────────────
  {
    id: 'bass-pro-hanover',
    name: 'Bass Pro Shops Hanover',
    category: 'big-box',
    regions: ['Anne Arundel County', 'Baltimore Metro'],
    species: ['Whitetail', 'Turkey', 'Duck', 'Goose', 'Bear'],
    waters: ['Chesapeake Bay', 'Loch Raven Reservoir', 'Liberty Reservoir'],
    website: 'https://stores.basspro.com/us/md/hanover/7000-arundel-mills-circle.html',
    address: '7000 Arundel Mills Circle, Hanover, MD 21076',
    city: 'Hanover',
    state: 'MD',
    description: 'Full-line big-box outdoor retailer — hunting, fishing, archery range, MD licenses on site.',
    offerings: 'Hunting + fishing gear, archery, MD licenses, indoor archery lane',
    source: 'https://stores.basspro.com/us/md/hanover/7000-arundel-mills-circle.html',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    lat: 39.1556,
    lng: -76.7242,
  },

  // ── Shooting + archery complex (David's recommendation) ─────────────
  {
    id: 'guntry-club',
    name: 'GUNTRY (The Guntry Club of Maryland)',
    category: 'shooting-complex',
    regions: ['Baltimore County', 'Owings Mills', 'Baltimore Metro'],
    species: ['Whitetail', 'Turkey', 'Duck', 'Bear', 'Sika Deer'],
    phone: '443-973-4867',
    website: 'https://www.guntry.com/',
    address: '10705 Red Run Blvd, Owings Mills, MD 21117',
    city: 'Owings Mills',
    state: 'MD',
    description: '64,000 sq ft indoor sporting complex — 34 indoor gun ranges, 40-yard indoor archery range with elevated shooting stations + 3D targets, full archery pro shop with bow tuning, BigShot archery simulator, café, gunsmithing.',
    offerings: 'Conventional + saddle hunting gear (sells Tethrd), archery pro shop, 2 archery ranges (3D + flat), 34 gun ranges, simulator, instruction',
    source: 'https://www.guntry.com/archery',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    featured: true,
    lat: 39.41296,
    lng: -76.79868,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// HIKING / BIKING / TRAIL-RUNNING SERVICES (added 2026-04-26)
//
// Same provenance discipline as fishing + hunting. Sourced from public
// websites + Yelp for verified-2026 contact info. Per David's directive:
// search both directions — top-down per activity type, bottom-up per
// business — to capture which trails / regions each business serves.
// ════════════════════════════════════════════════════════════════════════════

const HIKING_BIKING_SERVICES: LocalService[] = [
  // ── REI Co-op (outdoor specialty big-box, MD locations) ─────────────
  {
    id: 'rei-columbia',
    name: 'REI Columbia',
    category: 'hiking-shop',
    regions: ['Howard County', 'Central Maryland'],
    phone: '410-872-1742',
    website: 'https://www.rei.com/stores/columbia',
    address: '6100 Dobbin Road, Columbia, MD 21045',
    city: 'Columbia',
    state: 'MD',
    description: 'Full-line outdoor specialty co-op — hiking, camping, climbing, cycling, paddling. In-store bike shop + repair, MD licenses NOT sold here (use Bass Pro for that).',
    offerings: 'Hiking boots, packs, tents, sleeping bags, climbing gear, bikes + repair, classes',
    source: 'https://www.rei.com/stores/columbia',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    lat: 39.18950,
    lng: -76.81833,
  },
  {
    id: 'rei-rockville',
    name: 'REI Rockville',
    category: 'hiking-shop',
    regions: ['Montgomery County', 'DC Metro'],
    phone: '301-770-1751',
    website: 'https://www.rei.com/stores/rockville',
    address: '901 Rose Avenue, North Bethesda, MD 20852',
    city: 'North Bethesda',
    state: 'MD',
    description: 'REI flagship for the DC suburbs at Pike & Rose development. In-store bike shop, classes.',
    offerings: 'Full hiking + camping + climbing + cycling, bike shop, classes, rentals',
    source: 'https://www.rei.com/stores/rockville',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    lat: 39.05197,
    lng: -77.11953,
  },
  {
    id: 'rei-timonium',
    name: 'REI Timonium',
    category: 'hiking-shop',
    regions: ['Baltimore County', 'Baltimore Metro'],
    phone: '410-252-5920',
    website: 'https://www.rei.com/stores/timonium',
    address: '63 W Aylesbury Rd, Timonium, MD 21093',
    city: 'Timonium',
    state: 'MD',
    description: 'Northern Baltimore-area REI — serving the Baltimore area since 1999. Close to Loch Raven, Prettyboy, Gunpowder Falls trails. In-store bike shop + ski/snowboard shop.',
    offerings: 'Full hiking + camping + cycling, bike shop, ski/snowboard service',
    source: 'https://www.rei.com/stores/timonium',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    lat: 39.43480,
    lng: -76.63250,
  },

  // ── Trail-running / running shoe specialty ──────────────────────────
  {
    id: 'charm-city-run-fells-point',
    name: 'Charm City Run — Fells Point',
    category: 'shoe-store',
    regions: ['Baltimore'],
    phone: '410-601-3761',
    website: 'https://www.charmcityrun.com/',
    address: '1500 Thames St, Baltimore, MD 21231',
    city: 'Baltimore',
    state: 'MD',
    description: 'Independent running specialty — gait analysis, treadmill fitting, training groups. 7 MD/DE locations.',
    offerings: 'Running + trail-running shoes, gait analysis, group runs, race series',
    source: 'https://www.charmcityrun.com/venue/baltimore-md/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    lat: 39.28150,
    lng: -76.59216,
  },
  {
    id: 'charm-city-run-timonium',
    name: 'Charm City Run — Timonium',
    category: 'shoe-store',
    regions: ['Baltimore County'],
    phone: '410-561-3570',
    website: 'https://www.charmcityrun.com/',
    address: '1313 York Rd, Lutherville, MD 21093',
    city: 'Lutherville',
    state: 'MD',
    description: 'Same Charm City Run treatment for north Baltimore — convenient for Loch Raven / Gunpowder runners.',
    offerings: 'Running + trail-running shoes, gait analysis, training groups',
    source: 'https://www.charmcityrun.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    lat: 39.43560,
    lng: -76.62660,
  },
  {
    id: 'charm-city-run-columbia',
    name: 'Charm City Run — Columbia',
    category: 'shoe-store',
    regions: ['Howard County'],
    phone: '410-531-6846',
    website: 'https://www.charmcityrun.com/',
    address: '7090 Deepage Drive, Columbia, MD 21045',
    city: 'Columbia',
    state: 'MD',
    description: 'Howard County Charm City Run — Patapsco Valley + Centennial Park trail-running access.',
    offerings: 'Running + trail-running shoes, training groups',
    source: 'https://www.charmcityrun.com/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },

  // ── Bike shops ──────────────────────────────────────────────────────
  {
    id: 'bike-doctor-frederick',
    name: 'Bike Doctor — Frederick',
    category: 'bike-shop',
    regions: ['Frederick County', 'Western Maryland'],
    phone: '301-620-8868',
    website: 'https://www.bikedoctor.com/',
    address: '5732 Buckeystown Pike, Ste 10, Frederick, MD 21704',
    city: 'Frederick',
    state: 'MD',
    description: 'Mid-Atlantic regional bike-shop chain (HQ Arnold MD since 1988) — 7 locations across MD. Trek, Specialized, Giant.',
    offerings: 'Mountain + road + gravel bikes, repair, fitting, apparel, accessories',
    source: 'https://www.bikedoctor.com/contact/frederick-pg119.htm',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    lat: 39.36400,
    lng: -77.41060,
  },
  {
    id: 'bike-doctor-arnold',
    name: 'Bike Doctor — Arnold (HQ)',
    category: 'bike-shop',
    regions: ['Anne Arundel County'],
    website: 'https://www.bikedoctor.com/',
    city: 'Arnold',
    state: 'MD',
    description: 'Headquarters location — Anne Arundel local Steve Ruck founded the chain here in 1988. Original store + service.',
    offerings: 'Mountain + road + gravel bikes, full service shop',
    source: 'https://www.bikedoctor.com/about/about-bike-doctor-pg98.htm',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },

  // ── Hiking / trail clubs ────────────────────────────────────────────
  {
    id: 'mountain-club-of-maryland',
    name: 'Mountain Club of Maryland (MCM)',
    category: 'hiking-club',
    regions: ['Maryland', 'Pennsylvania'],
    website: 'https://www.mcomd.org/',
    city: 'Baltimore',
    state: 'MD',
    description: 'Volunteer hiking club + official Appalachian Trail maintainer for the northernmost 10 MD miles + 32 PA miles + 4 shelters. Leave-No-Trace focused.',
    offerings: 'Group hikes, AT trail maintenance volunteer ops, NPS VIP partner program',
    source: 'https://www.mcomd.org/get-involved/at-maintenance-2/',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
    featured: true,
  },
  {
    id: 'patc',
    name: 'Potomac Appalachian Trail Club (PATC)',
    category: 'hiking-club',
    regions: ['DMV', 'Western Maryland', 'Northern Virginia'],
    website: 'https://www.patc.net/',
    city: 'Vienna',
    state: 'VA',
    description: 'Maintains the southern AT in MD (the bulk of the 41 MD miles), 240+ shelters/cabins, and most DMV-area trails. Not MD-based but the dominant DMV trail organization.',
    offerings: 'Group hikes, trail maintenance volunteer ops, cabin rentals, maps + guidebooks',
    source: 'https://www.patc.net/trail-maintenance-volunteer-opportunities',
    trust: 'verified-2026',
    verifiedAt: '2026-04-26',
  },
];


// ════════════════════════════════════════════════════════════════════════════
// EXPORTS + HELPERS
// ════════════════════════════════════════════════════════════════════════════

export const MARYLAND_LOCAL_SERVICES: LocalService[] = [
  ...FISHING_SERVICES,
  ...HUNTING_SERVICES,
  ...HIKING_BIKING_SERVICES,
];

/**
 * Find services that explicitly serve a given waterbody. Substring match
 * so "Gunpowder Falls" + "Big Gunpowder" both surface for "Gunpowder".
 *
 * Usage: hotspot detail card calls `servicesForWater(hotspot.waterbody)`
 * to render the "Local Pros" section.
 */
export function servicesForWater(water: string): LocalService[] {
  const needle = water.toLowerCase();
  return MARYLAND_LOCAL_SERVICES.filter((s) =>
    (s.waters || []).some((w) => w.toLowerCase().includes(needle) || needle.includes(w.toLowerCase())),
  );
}

/**
 * Find hunting services for a region (county or named area).
 * Used by future hunting-land detail cards.
 */
export function servicesForRegion(region: string): LocalService[] {
  const needle = region.toLowerCase();
  return MARYLAND_LOCAL_SERVICES.filter((s) =>
    (s.regions || []).some((r) => r.toLowerCase().includes(needle) || needle.includes(r.toLowerCase())),
  );
}

/**
 * Find hunting services for a target species (e.g. "Sika Deer").
 */
export function servicesForSpecies(species: string): LocalService[] {
  const needle = species.toLowerCase();
  return MARYLAND_LOCAL_SERVICES.filter((s) =>
    (s.species || []).some((sp) => sp.toLowerCase().includes(needle) || needle.includes(sp.toLowerCase())),
  );
}

/** Filter by category (e.g. all fly shops). */
export function servicesByCategory(category: ServiceCategory): LocalService[] {
  return MARYLAND_LOCAL_SERVICES.filter((s) => s.category === category);
}

export const LOCAL_SERVICES_STATS = {
  total: MARYLAND_LOCAL_SERVICES.length,
  fishing: FISHING_SERVICES.length,
  hunting: HUNTING_SERVICES.length,
  hikingBiking: HIKING_BIKING_SERVICES.length,
  byCategory: MARYLAND_LOCAL_SERVICES.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {}),
  byTrust: MARYLAND_LOCAL_SERVICES.reduce<Record<string, number>>((acc, s) => {
    acc[s.trust] = (acc[s.trust] || 0) + 1;
    return acc;
  }, {}),
};
