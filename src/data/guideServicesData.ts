/**
 * @file guideServicesData.ts
 * @description Curated directory of Maryland fishing charters, hunting guides,
 * outfitters, and gear shops. Used across multiple resource screens.
 *
 * Monetization: Guide services are potential booking commission partners.
 * Outfitters/shops are potential affiliate partners.
 *
 * @module Data
 * @version 1.0.0
 * Updated: 2026-04-11
 */

export interface GuideService {
  id: string;
  name: string;
  type: 'fishing_charter' | 'hunting_guide' | 'outfitter' | 'gear_shop' | 'taxidermist' | 'processor' | 'bait_shop' | 'kayak_rental' | 'archery_shop';
  description: string;
  location: string;
  specialties: string[];
  url?: string;
  phone?: string;
  emoji: string;
  featured?: boolean;
}

// ─── Fishing Charters ──────────────────────────────────────────

export const FISHING_CHARTERS: GuideService[] = [
  {
    id: 'griffins',
    name: "Griffin's Guide Service",
    type: 'fishing_charter',
    description: 'Light tackle and redfish specialist on the Chesapeake Bay.',
    location: 'Chesapeake Bay',
    specialties: ['Light Tackle', 'Redfish', 'Striped Bass'],
    url: 'https://www.griffinsguideservice.com',
    emoji: '🎣',
  },
  {
    id: 'hookset',
    name: 'Hookset Guide Service',
    type: 'fishing_charter',
    description: 'Chesapeake Bay light tackle charters for stripers and blues.',
    location: 'Chesapeake Bay',
    specialties: ['Light Tackle', 'Striped Bass', 'Bluefish'],
    url: 'https://www.hooksetguideservice.com',
    emoji: '🎣',
  },
  {
    id: 'chesapeake-coastal',
    name: 'Chesapeake Coastal Charters',
    type: 'fishing_charter',
    description: 'Fly fishing and light tackle charters on the Bay.',
    location: 'Chesapeake Bay',
    specialties: ['Fly Fishing', 'Light Tackle', 'Striped Bass'],
    url: 'https://www.chesapeakecoastalcharters.com',
    emoji: '🪰',
  },
  {
    id: 'bay-sport-fishing',
    name: 'Chesapeake Bay Sport Fishing',
    type: 'fishing_charter',
    description: 'Top 10 Charter 2024–2025 award winner. Full-service Bay charters.',
    location: 'Chesapeake Bay',
    specialties: ['Striped Bass', 'Bluefish', 'Spanish Mackerel', 'White Perch'],
    url: 'https://www.chesapeakebaysportfishing.com',
    emoji: '🏆',
  },
  {
    id: 'bay-hunters',
    name: 'Bay Hunters Charter',
    type: 'fishing_charter',
    description: 'Western shore charters targeting 8+ species year-round.',
    location: 'Western Shore',
    specialties: ['Striped Bass', 'Catfish', 'Perch', 'Croaker'],
    emoji: '🎣',
  },
  {
    id: 'gootee',
    name: 'Capt. Phil Gootee Fishing Charters',
    type: 'fishing_charter',
    description: 'Striped bass specialist with decades of Bay experience.',
    location: 'Chesapeake Bay',
    specialties: ['Striped Bass', 'Trophy Rockfish'],
    emoji: '🐟',
  },
  {
    id: 'md-fishing-hunting',
    name: 'Maryland Fishing & Hunting LLC',
    type: 'fishing_charter',
    description: 'Charters, cruises, crabbing trips, and lighthouse tours.',
    location: 'Chesapeake Bay',
    specialties: ['Fishing', 'Crabbing', 'Cruises', 'Lighthouse Tours'],
    emoji: '🚢',
  },
  {
    id: 'miss-grace',
    name: 'Miss Grace Charters',
    type: 'fishing_charter',
    description: 'Private and walk-on fishing trips on the Chesapeake Bay.',
    location: 'Chesapeake Bay',
    specialties: ['Private Charters', 'Walk-On Trips'],
    emoji: '🎣',
  },
  {
    id: 'wound-tight',
    name: 'Wound Tight Charters',
    type: 'fishing_charter',
    description: 'Chesapeake Beach and Ocean City fishing charters.',
    location: 'Chesapeake Beach / Ocean City',
    specialties: ['Striped Bass', 'Tuna', 'Marlin'],
    emoji: '🐠',
  },
  {
    id: 'rockin-rowan',
    name: "Rockin' Rowan Fish Charters",
    type: 'fishing_charter',
    description: 'Full-service Bay charters with equipment provided.',
    location: 'Chesapeake Bay',
    specialties: ['Striped Bass', 'Bluefish', 'Perch'],
    emoji: '🎣',
  },
];

// ─── Hunting Guides ──────────────────────────────────────────

export const HUNTING_GUIDES: GuideService[] = [
  {
    id: 'bj-guide',
    name: 'B & J Guide Service',
    type: 'hunting_guide',
    description: '40+ years guiding whitetail and waterfowl on the Eastern Shore.',
    location: 'Eastern Shore',
    specialties: ['Whitetail Deer', 'Waterfowl', 'Guided Hunts'],
    emoji: '🦌',
  },
  {
    id: 'doa',
    name: 'DOA Outfitters',
    type: 'hunting_guide',
    description: 'Sika and whitetail deer hunts. 150-175 B&C class bucks.',
    location: 'Eastern Shore',
    specialties: ['Sika Deer', 'Whitetail Deer', 'Archery', 'Rifle', 'Muzzleloader'],
    emoji: '🎯',
  },
  {
    id: 'nanticoke',
    name: 'Nanticoke Outfitters',
    type: 'hunting_guide',
    description: 'Salt marsh sika, ducks, whitetail, and turkey hunts.',
    location: 'Eastern Shore',
    specialties: ['Sika Deer', 'Duck Hunting', 'Whitetail', 'Turkey'],
    emoji: '🦆',
  },
  {
    id: 'talbot',
    name: 'Talbot County Outfitters',
    type: 'hunting_guide',
    description: 'Whitetail, sika, geese, sea ducks, and turkey.',
    location: 'Talbot County',
    specialties: ['Whitetail', 'Sika', 'Geese', 'Sea Ducks', 'Turkey'],
    emoji: '🦃',
  },
  {
    id: 'harrisons',
    name: "Harrison's Outfitter Service",
    type: 'hunting_guide',
    description: 'Whitetail hunts since 1974 — one of MD\'s longest-running guides.',
    location: 'Maryland',
    specialties: ['Whitetail Deer'],
    emoji: '🏹',
  },
  {
    id: 'winter-farms',
    name: 'Winter Farms Hunting',
    type: 'hunting_guide',
    description: '3+ generations of guided hunting on private land.',
    location: 'Maryland',
    specialties: ['Deer', 'Waterfowl', 'Private Land'],
    emoji: '🌾',
  },
  {
    id: 'branded',
    name: 'Branded Outdoors',
    type: 'hunting_guide',
    description: 'Sika, whitetail, and turkey guided hunts.',
    location: 'Eastern Shore',
    specialties: ['Sika Deer', 'Whitetail', 'Turkey'],
    emoji: '🎯',
  },
  {
    id: 'muddy-bottom',
    name: 'Muddy Bottom Outfitters',
    type: 'hunting_guide',
    description: 'Deer and turkey guided hunts on the Eastern Shore.',
    location: 'Eastern Shore',
    specialties: ['Deer', 'Turkey'],
    emoji: '🦌',
  },
  {
    id: 'duck-hunting-md',
    name: 'Duck Hunting MD',
    type: 'hunting_guide',
    description: 'Waterfowl hunts from Tilghman Island on the Chesapeake Bay.',
    location: 'Tilghman Island',
    specialties: ['Duck Hunting', 'Waterfowl', 'Bay Hunts'],
    emoji: '🦆',
  },
];

// ─── Outfitters & Gear Shops ──────────────────────────────────

export const OUTFITTERS_AND_SHOPS: GuideService[] = [
  {
    id: 'bass-pro',
    name: 'Bass Pro Shops',
    type: 'gear_shop',
    description: 'Hanover, MD flagship. Archery lane, rock wall, aquarium, and full outdoor departments.',
    location: '7000 Arundel Mills Circle, Hanover, MD',
    specialties: ['Fishing Gear', 'Hunting Equipment', 'Boating Center', 'ATV Dealer'],
    url: 'https://www.basspro.com/shop/en/store/arundel-mills',
    emoji: '🏪',
  },
  {
    id: 'cabelas',
    name: "Cabela's",
    type: 'gear_shop',
    description: 'Full hunting, fishing, and outdoor gear with low price guarantee. Licenses available.',
    location: 'Multiple locations',
    specialties: ['Hunting Gear', 'Fishing Equipment', 'Fly Fishing', 'Licenses'],
    url: 'https://www.cabelas.com',
    emoji: '🏬',
  },
  {
    id: 'savage-river',
    name: 'Savage River Outfitters',
    type: 'outfitter',
    description: 'Full-service fly shop near Deep Creek Lake. Blue Ribbon Savage River tailwater specialist.',
    location: 'Western Maryland',
    specialties: ['Fly Fishing', 'Fly Tying Supplies', 'Guided Trips', 'Savage River'],
    emoji: '🪰',
  },
  {
    id: 'clydes',
    name: "Clyde's Sport Shop",
    type: 'gear_shop',
    description: 'Halethorpe institution since 1957. Open M-F 6am-9pm for early risers.',
    location: 'Halethorpe, MD',
    specialties: ['Fishing Tackle', 'Bait', 'Local Knowledge', 'Licenses'],
    emoji: '🏠',
  },
];

// ─── Taxidermists ──────────────────────────────────────────────

export const TAXIDERMISTS: GuideService[] = [
  {
    id: 'upper-bay-taxi',
    name: 'Upper Bay Taxidermy',
    type: 'taxidermist',
    description: '35+ years, father/son team. Full-service mounts.',
    location: 'North East, Cecil County',
    specialties: ['Deer Mounts', 'Waterfowl', 'Fish', 'Full Body'],
    emoji: '🦌',
  },
  {
    id: 'creative-whitetails',
    name: 'Creative Whitetails Taxidermy',
    type: 'taxidermist',
    description: 'Award-winning studio, 35+ years. Owner Dean Ursitti.',
    location: 'La Plata, MD',
    specialties: ['Whitetail Mounts', 'Competition Mounts', 'European Skulls'],
    emoji: '🏆',
  },
  {
    id: 'mountin-man',
    name: "Mountin' Man Taxidermy",
    type: 'taxidermist',
    description: '19+ years experience. Owner Dane Gaulding.',
    location: 'Knoxville, Frederick County',
    specialties: ['Deer', 'Waterfowl', 'Small Game'],
    emoji: '🦌',
  },
  {
    id: 'hitchcock-taxi',
    name: 'Hitchcock Taxidermy',
    type: 'taxidermist',
    description: 'CWD-approved processor and taxidermist.',
    location: 'Severn, Anne Arundel County',
    specialties: ['Deer', 'CWD Processing', 'European Mounts'],
    emoji: '🦌',
  },
  {
    id: 'precision-taxi',
    name: 'Precision Taxidermy',
    type: 'taxidermist',
    description: 'Full-service taxidermy near Baltimore.',
    location: 'Catonsville, Baltimore County',
    specialties: ['Deer', 'Fish', 'Birds', 'Full Body'],
    emoji: '🐟',
  },
  {
    id: 'natures-best',
    name: "Nature's Best Wildlife Artistry",
    type: 'taxidermist',
    description: '30+ years, award-winning wildlife art and mounts.',
    location: 'Mount Airy, Carroll County',
    specialties: ['Competition', 'Wildlife Art', 'Deer', 'Game Birds'],
    emoji: '🎨',
  },
  {
    id: 'cutchins-trail',
    name: 'Cutchins Trail Taxidermy',
    type: 'taxidermist',
    description: 'Serving northern Baltimore County hunters.',
    location: 'White Hall, Baltimore County',
    specialties: ['Deer', 'Turkey', 'Waterfowl'],
    emoji: '🦃',
  },
  {
    id: 'bonehead-taxi',
    name: 'Bonehead Wildlife Taxidermy',
    type: 'taxidermist',
    description: 'Eastern Shore taxidermist serving Queen Anne area.',
    location: 'Queen Anne, MD',
    specialties: ['Deer', 'European Skulls', 'Waterfowl'],
    emoji: '💀',
  },
];

// ─── Deer/Game Processors ──────────────────────────────────────

export const PROCESSORS: GuideService[] = [
  {
    id: 'burnies',
    name: "Burnie's Deer Processing",
    type: 'processor',
    description: '60+ years, CWD approved. Veteran/senior discounts.',
    location: 'Westminster, Carroll County',
    specialties: ['Venison Processing', 'CWD Approved', 'Sausage', 'Jerky'],
    emoji: '🥩',
  },
  {
    id: 'mg-wild',
    name: 'M & G Wild Game Processing',
    type: 'processor',
    description: 'Carroll County game processing and custom cuts.',
    location: 'Carroll County',
    specialties: ['Custom Cuts', 'Ground Venison', 'Sausage'],
    emoji: '🥩',
  },
  {
    id: 'clints-cuts',
    name: "Clint's Cuts",
    type: 'processor',
    description: '"You pop \'em, we chop \'em." Full venison processing.',
    location: 'Frederick County',
    specialties: ['Custom Processing', 'Sausage', 'Jerky', 'Snack Sticks'],
    emoji: '🔪',
  },
  {
    id: 'prys',
    name: "Pry's Deer Processing",
    type: 'processor',
    description: 'Burkittsville processor serving Frederick County.',
    location: 'Burkittsville, Frederick County',
    specialties: ['Venison Processing', 'Custom Cuts'],
    emoji: '🥩',
  },
  {
    id: 'austins',
    name: "Austin's Deer Processing",
    type: 'processor',
    description: 'Anne Arundel County deer processing.',
    location: 'Hanover, Anne Arundel County',
    specialties: ['Venison Processing', 'Sausage', 'Ground Meat'],
    emoji: '🥩',
  },
  {
    id: 'bb-country',
    name: 'B&B Country Meats',
    type: 'processor',
    description: 'Western Maryland processor in Allegany County.',
    location: 'Frostburg, Allegany County',
    specialties: ['Game Processing', 'Custom Cuts', 'Sausage'],
    emoji: '🥩',
  },
];

// ─── Bait & Tackle Shops ──────────────────────────────────────

export const BAIT_SHOPS: GuideService[] = [
  {
    id: 'tochtermans',
    name: "Tochterman's Fishing Tackle",
    type: 'bait_shop',
    description: 'Family-owned since 1916. Baltimore institution.',
    location: 'Baltimore, MD',
    specialties: ['Live Bait', 'Tackle', 'Local Knowledge', 'Chesapeake Gear'],
    emoji: '🪱',
  },
  {
    id: 'atlantic-tackle',
    name: 'Atlantic Tackle',
    type: 'bait_shop',
    description: 'Two-story mega store in Ocean City. 1-877-566-BAIT.',
    location: 'Ocean City, MD',
    specialties: ['Saltwater Tackle', 'Surf Fishing Gear', 'Live Bait', 'Rentals'],
    phone: '1-877-566-2248',
    emoji: '🏬',
  },
  {
    id: 'alltackle',
    name: 'Alltackle',
    type: 'bait_shop',
    description: 'Two locations — Annapolis and Ocean City. Online store too.',
    location: 'Annapolis & Ocean City',
    specialties: ['Saltwater', 'Freshwater', 'Fly Fishing', 'Offshore'],
    url: 'https://www.alltackle.com',
    emoji: '🎣',
  },
  {
    id: 'fishbones',
    name: 'Fishbones Bait & Tackle',
    type: 'bait_shop',
    description: 'Full bait and tackle serving the Pasadena/Glen Burnie area.',
    location: 'Pasadena, Anne Arundel County',
    specialties: ['Live Bait', 'Crabbing Supplies', 'Chesapeake Tackle'],
    emoji: '🐟',
  },
  {
    id: 'sarges',
    name: "Sarge's Bait and Tackle",
    type: 'bait_shop',
    description: 'Upper Bay specialist near Chesapeake City.',
    location: 'Elkton, Cecil County',
    specialties: ['Upper Bay Tackle', 'Live Bait', 'Catfish Gear'],
    emoji: '🎖️',
  },
  {
    id: 'anglers-sport',
    name: 'Anglers Sport Center',
    type: 'bait_shop',
    description: 'Full-service tackle and bait near Annapolis.',
    location: 'Annapolis, MD',
    specialties: ['Bay Fishing', 'Tackle', 'Live Bait', 'Licenses'],
    emoji: '🎣',
  },
];

// ─── Kayak & Canoe Rentals ──────────────────────────────────

export const KAYAK_RENTALS: GuideService[] = [
  {
    id: 'annapolis-canoe',
    name: 'Annapolis Canoe and Kayak',
    type: 'kayak_rental',
    description: 'Full kayak/canoe sales and rental service.',
    location: 'Annapolis, MD',
    specialties: ['Kayak Rental', 'Canoe Rental', 'Guided Paddles', 'Sales'],
    emoji: '🛶',
  },
  {
    id: 'paddle-annapolis',
    name: 'Paddle Annapolis',
    type: 'kayak_rental',
    description: 'Paddleboarding and kayaking on the Chesapeake.',
    location: 'Annapolis, MD',
    specialties: ['SUP Rental', 'Kayak Tours', 'Sunset Paddles'],
    emoji: '🏄',
  },
  {
    id: 'black-hill',
    name: 'Black Hill Boats',
    type: 'kayak_rental',
    description: 'Little Seneca Lake rentals, Memorial Day–Labor Day.',
    location: 'Boyds, Montgomery County',
    specialties: ['Kayak', 'Canoe', 'Rowboat', 'Lake Fishing'],
    emoji: '🚣',
  },
  {
    id: 'pocomoke-canoe',
    name: 'Pocomoke River Canoe Company',
    type: 'kayak_rental',
    description: 'Walk-ins welcome. Scenic Pocomoke River paddling.',
    location: 'Snow Hill, Worcester County',
    specialties: ['Canoe', 'Kayak', 'Pocomoke River', 'Nature Trips'],
    emoji: '🌿',
  },
  {
    id: 'cbec-kayak',
    name: 'Chesapeake Bay Environmental Center',
    type: 'kayak_rental',
    description: '42-boat fleet for Bay exploration and nature tours.',
    location: 'Grasonville, MD',
    specialties: ['Kayak Fleet', 'Nature Tours', 'Bay Ecology', 'Group Trips'],
    emoji: '🌊',
  },
  {
    id: 'eastern-watersports',
    name: 'Eastern Watersports',
    type: 'kayak_rental',
    description: '150+ kayak fleet across multiple locations.',
    location: 'Middle River / National Harbor',
    specialties: ['Kayak', 'SUP', 'Fishing Kayaks', 'Group Events'],
    emoji: '🏄',
  },
];

// ─── Archery Pro Shops ──────────────────────────────────────

export const ARCHERY_SHOPS: GuideService[] = [
  {
    id: 'guntry',
    name: 'GUNTRY Archery Pro Shop',
    type: 'archery_shop',
    description: 'Premier facility with indoor range and simulator.',
    location: 'Owings Mills, Baltimore County',
    specialties: ['Indoor Range', 'Bow Tuning', 'Archery Lessons', 'Simulator'],
    emoji: '🏹',
  },
  {
    id: 'bowhunters-den',
    name: 'Bowhunters Den Outdoors',
    type: 'archery_shop',
    description: 'Two Carroll County locations. Full archery service.',
    location: 'Finksburg & Taneytown, Carroll County',
    specialties: ['Bow Sales', 'Tuning', 'Accessories', 'Crossbows'],
    emoji: '🏹',
  },
  {
    id: 'freds-archery',
    name: "Fred's Outdoors Archery",
    type: 'archery_shop',
    description: '20-yard indoor range and full pro shop.',
    location: 'Waldorf, Charles County',
    specialties: ['Indoor Range', 'Bow Tuning', 'Hunting Bows', 'Youth Archery'],
    emoji: '🎯',
  },
  {
    id: 'jefferson-archery',
    name: 'Jefferson Archery',
    type: 'archery_shop',
    description: 'Frederick County archery specialist.',
    location: 'Jefferson, Frederick County',
    specialties: ['Compound Bows', 'Crossbows', 'Tuning', 'Accessories'],
    emoji: '🏹',
  },
  {
    id: 'macrotech',
    name: 'Macrotech Archery Pro Shop',
    type: 'archery_shop',
    description: 'Renowned for expert bow tuning.',
    location: 'Curtis Bay, Baltimore County',
    specialties: ['Expert Tuning', 'Bow Repair', 'Custom Strings'],
    emoji: '🔧',
  },
  {
    id: 'tagged-out',
    name: 'Tagged Out Tuning',
    type: 'archery_shop',
    description: 'Jason duCellier, 30+ years bow tuning expertise.',
    location: 'Harwood, Anne Arundel County',
    specialties: ['Precision Tuning', 'Paper Tuning', 'Walk-Through Tuning'],
    emoji: '🎯',
  },
  {
    id: '3js-archery',
    name: "3J's Archery",
    type: 'archery_shop',
    description: 'Archery-only pro shop with 3D target course.',
    location: 'Mechanicsville, St. Mary\'s County',
    specialties: ['3D Targets', 'Bow Sales', 'Lessons', 'Hunting Accessories'],
    emoji: '🏹',
  },
];

// ─── Additional Fishing Charters (Deep Scrape) ─────────────

export const ADDITIONAL_CHARTERS: GuideService[] = [
  {
    id: 'ocean-princess',
    name: 'The Ocean Princess',
    type: 'fishing_charter',
    description: "Maryland's largest party boat — 75+ passengers. Ocean City.",
    location: 'Ocean City, MD',
    specialties: ['Party Boat', 'Head Boat', 'Offshore', 'Bottom Fishing'],
    emoji: '🚢',
  },
  {
    id: 'rod-n-reel',
    name: "Rod 'N' Reel Charter",
    type: 'fishing_charter',
    description: 'Largest fleet on Chesapeake Bay. Operating since 1946.',
    location: 'Chesapeake Beach, MD',
    specialties: ['Charter Fleet', 'Striped Bass', 'Bluefish', 'Bottom Fishing'],
    emoji: '🏆',
  },
  {
    id: 'last-hurrah',
    name: 'Last Hurrah Charters',
    type: 'fishing_charter',
    description: 'Captain Scott — Annapolis/Central Bay specialist.',
    location: 'Annapolis, MD',
    specialties: ['Light Tackle', 'Striped Bass', 'Perch', 'Private Charters'],
    emoji: '🎣',
  },
  {
    id: 'shea-d-lady',
    name: 'Shea-D-Lady Charters',
    type: 'fishing_charter',
    description: '46-foot vessel from Solomons Island.',
    location: 'Solomons Island, MD',
    specialties: ['Striped Bass', 'Bottom Fishing', 'Chesapeake Bay'],
    emoji: '⛵',
  },
  {
    id: 'annapolis-charters',
    name: 'Annapolis Fishing Charters',
    type: 'fishing_charter',
    description: 'Multiple boats, Bay and tributaries.',
    location: 'Annapolis, MD',
    specialties: ['Bay Fishing', 'Light Tackle', 'Corporate Events'],
    emoji: '🎣',
  },
];

// ─── Combined helpers ──────────────────────────────────────────

export function getAllCharters(): GuideService[] {
  return [...FISHING_CHARTERS, ...ADDITIONAL_CHARTERS];
}

export function getGuidesByType(type: GuideService['type']): GuideService[] {
  switch (type) {
    case 'fishing_charter':
      return getAllCharters();
    case 'hunting_guide':
      return HUNTING_GUIDES;
    case 'outfitter':
    case 'gear_shop':
      return OUTFITTERS_AND_SHOPS;
    case 'taxidermist':
      return TAXIDERMISTS;
    case 'processor':
      return PROCESSORS;
    case 'bait_shop':
      return BAIT_SHOPS;
    case 'kayak_rental':
      return KAYAK_RENTALS;
    case 'archery_shop':
      return ARCHERY_SHOPS;
    default:
      return [];
  }
}

export function getAllGuides(): GuideService[] {
  return [
    ...getAllCharters(),
    ...HUNTING_GUIDES,
    ...OUTFITTERS_AND_SHOPS,
    ...TAXIDERMISTS,
    ...PROCESSORS,
    ...BAIT_SHOPS,
    ...KAYAK_RENTALS,
    ...ARCHERY_SHOPS,
  ];
}
