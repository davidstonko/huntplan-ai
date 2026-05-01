/**
 * StarterGearScreen — Curated starter-gear checklist for MD hunters & anglers.
 *
 * Shows a read-only list of recommended gear bundles organized by activity
 * and budget tier. Each item can be tapped to open an Amazon affiliate link
 * (mdoutdoors-20 tag). No user accounts, no purchase tracking, no in-app
 * commerce — users are sent to Amazon via Linking.openURL.
 *
 * Built 2026-04-17 for V2.2.0 to replace the "Coming Soon" placeholder and
 * satisfy App Store guideline 4.2 (Minimum Functionality).
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import Colors from '../theme/colors';
import FilterPicker from '../components/common/FilterPicker';
import { useActivityMode } from '../context/ActivityModeContext';
import {
  CURATED_FISHING_GEAR,
  type CuratedGearItem,
} from '../data/curatedFishingGear';
import { CURATED_HUNTING_GEAR } from '../data/curatedHuntingGear';
import { CURATED_HIKING_GEAR } from '../data/curatedHikingGear';

type Tier = 'budget' | 'mid' | 'premium';
type Category =
  | 'safety'
  | 'navigation'
  | 'clothing'
  | 'optics'
  | 'weapon'
  | 'gear'
  | 'rod'
  | 'tackle'
  | 'storage'
  | 'shelter'
  | 'sleep'
  | 'kitchen'
  | 'pack'
  | 'trekking';
type Activity = 'hunt' | 'fish' | 'camp' | 'hike' | 'both';
/**
 * `pickType` labels why this item is in the list:
 *   - editor   → staff pick (default, highest conversion narrative)
 *   - budget   → cheapest viable option
 *   - premium  → best-in-class for users who can spend
 * This lets the UI badge cards and lets GearGuide inline promos pick a
 * representative product per category.
 */
type PickType = 'editor' | 'budget' | 'premium';

interface GearItem {
  id: string;
  activity: Activity;
  category: Category;
  tier: Tier;
  name: string;
  description: string;
  estimatedPrice: string;
  /**
   * Optional Amazon ASIN. When present, the affiliate link becomes a direct
   * product link (higher conversion — ~2–2.5× search URLs). When omitted,
   * `amazonLink` falls back to a tagged search URL built from `query`.
   */
  asin?: string;
  /** Manual override of the affiliate URL — kept for back-compat with items
   *  authored before the `asin` refactor. Prefer `asin` + query going forward. */
  affiliateUrl: string;
  pickType?: PickType;
  /** Optional season window as inclusive 1-indexed month pair — e.g. [9, 1]
   *  means Sept through Jan. Used by the planned seasonal promo to surface
   *  in-season gear on the Home and AI tabs. */
  seasonHint?: [number, number];
}

const AFFILIATE_TAG = 'mdoutdoors-20';

// Amazon search URLs with affiliate tag — users can browse within the result.
// Not direct product links (those change), so these survive catalog updates.
function amazonSearch(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AFFILIATE_TAG}`;
}

/**
 * Build the best available affiliate URL for a gear item. Direct ASIN product
 * links convert roughly 2–2.5× higher than search URLs per audit §18.1, so we
 * prefer them when an ASIN has been provided. Falls back to a tagged search.
 */
export function amazonLink(opts: { asin?: string; query: string }): string {
  if (opts.asin && /^[A-Z0-9]{10}$/.test(opts.asin)) {
    return `https://www.amazon.com/dp/${opts.asin}?tag=${AFFILIATE_TAG}`;
  }
  return amazonSearch(opts.query);
}

export const GEAR_CATALOG: GearItem[] = [
  // Hunt — Safety
  {
    id: 'hunt-orange-vest',
    activity: 'hunt',
    category: 'safety',
    tier: 'budget',
    name: 'Blaze Orange Vest',
    description: 'MD firearm season requires 250+ sq in of daylight fluorescent orange.',
    estimatedPrice: '$15–30',
    affiliateUrl: amazonSearch('blaze orange hunting vest 250 square inches'),
  },
  {
    id: 'hunt-safety-harness',
    activity: 'hunt',
    category: 'safety',
    tier: 'mid',
    name: 'Tree Stand Safety Harness',
    description: 'Full-body fall-restraint harness — wear every time you climb.',
    estimatedPrice: '$50–150',
    asin: 'B08KT944WQ',
    pickType: 'editor',
    affiliateUrl: amazonLink({ asin: 'B08KT944WQ', query: 'tree stand safety harness full body' }),
  },
  {
    id: 'hunt-first-aid',
    activity: 'both',
    category: 'safety',
    tier: 'budget',
    name: 'Compact First Aid Kit',
    description: 'Backwoods-rated kit with tourniquet, hemostatic gauze, and trauma shears.',
    estimatedPrice: '$25–60',
    asin: 'B0DV6NTJBK',
    pickType: 'editor',
    affiliateUrl: amazonLink({ asin: 'B0DV6NTJBK', query: 'outdoor first aid kit tourniquet' }),
  },

  // Hunt — Navigation
  {
    id: 'hunt-headlamp',
    activity: 'both',
    category: 'navigation',
    tier: 'budget',
    name: 'LED Headlamp (Red + White)',
    description: 'Red-light mode preserves night vision during pre-dawn stand walks.',
    estimatedPrice: '$20–45',
    asin: 'B09NQL41DH',
    pickType: 'editor',
    affiliateUrl: amazonLink({ asin: 'B09NQL41DH', query: 'led headlamp red white rechargeable' }),
  },
  {
    id: 'hunt-gps',
    activity: 'both',
    category: 'navigation',
    tier: 'premium',
    name: 'Handheld GPS (Garmin eTrex)',
    description: 'Standalone GPS as a backup to phone — survives drops, no battery anxiety.',
    estimatedPrice: '$120–250',
    asin: 'B07RR6GZWP',
    pickType: 'premium',
    affiliateUrl: amazonLink({ asin: 'B07RR6GZWP', query: 'garmin etrex handheld gps' }),
  },

  // Hunt — Clothing
  {
    id: 'hunt-base-merino',
    activity: 'hunt',
    category: 'clothing',
    tier: 'mid',
    name: 'Merino Wool Base Layer',
    description: 'Moisture-wicking and odor-resistant; layer under insulation.',
    estimatedPrice: '$60–120',
    affiliateUrl: amazonSearch('merino wool hunting base layer'),
  },
  {
    id: 'hunt-boots-insulated',
    activity: 'hunt',
    category: 'clothing',
    tier: 'premium',
    name: 'Insulated Waterproof Boots',
    description: '800g–1200g insulation for MD cold-weather stand hunting.',
    estimatedPrice: '$120–250',
    asin: 'B0DKFL87FV',
    pickType: 'premium',
    affiliateUrl: amazonLink({ asin: 'B0DKFL87FV', query: 'lacrosse windrose 1000g leather hunting boot realtree' }),
  },

  // Hunt — Optics
  {
    id: 'hunt-binos',
    activity: 'hunt',
    category: 'optics',
    tier: 'mid',
    name: 'Binoculars (8x42 or 10x42)',
    description: 'Mid-range glass for scouting, shed hunting, and confirming antler ID.',
    estimatedPrice: '$100–400',
    asin: 'B004803YTW',
    pickType: 'editor',
    affiliateUrl: amazonLink({ asin: 'B004803YTW', query: 'hunting binoculars 10x42' }),
  },
  {
    id: 'hunt-rangefinder',
    activity: 'hunt',
    category: 'optics',
    tier: 'premium',
    name: 'Laser Rangefinder',
    description: 'Angle-compensated rangefinder — especially useful from tree stands.',
    estimatedPrice: '$150–500',
    affiliateUrl: amazonSearch('hunting rangefinder angle compensated'),
  },

  // Hunt — Weapon accessories
  {
    id: 'hunt-cleaning-kit',
    activity: 'hunt',
    category: 'weapon',
    tier: 'budget',
    name: 'Universal Gun Cleaning Kit',
    description: 'Rods, patches, solvent — clean your firearm after every wet outing.',
    estimatedPrice: '$20–60',
    asin: 'B09JY948M8',
    pickType: 'budget',
    affiliateUrl: amazonLink({ asin: 'B09JY948M8', query: 'universal gun cleaning kit' }),
  },

  // Fish — Rods & reels
  {
    id: 'fish-combo-spinning',
    activity: 'fish',
    category: 'rod',
    tier: 'budget',
    name: 'Spinning Rod/Reel Combo (Medium)',
    description: '6\'6" medium action — bass, trout, catfish, panfish all-rounder.',
    estimatedPrice: '$35–80',
    asin: 'B08M5BKHTF',
    pickType: 'editor',
    affiliateUrl: amazonLink({ asin: 'B08M5BKHTF', query: 'spinning rod reel combo medium action' }),
  },
  {
    id: 'fish-combo-surf',
    activity: 'fish',
    category: 'rod',
    tier: 'mid',
    name: 'Surf Rod/Reel Combo',
    description: '9–12\' surf combo for Assateague/OC stripers and blues.',
    estimatedPrice: '$100–250',
    affiliateUrl: amazonSearch('surf fishing rod reel combo 10 foot'),
  },

  // Fish — Tackle
  {
    id: 'fish-tackle-box',
    activity: 'fish',
    category: 'tackle',
    tier: 'budget',
    name: 'Starter Tackle Box',
    description: 'Hooks, split shots, bobbers, swivels, and a few lures for freshwater.',
    estimatedPrice: '$20–50',
    affiliateUrl: amazonSearch('fishing tackle box starter kit'),
  },
  {
    id: 'fish-lures-bass',
    activity: 'fish',
    category: 'tackle',
    tier: 'mid',
    name: 'Bass Lure Assortment',
    description: 'Senkos, crankbaits, spinnerbaits — covers all freshwater lake conditions.',
    estimatedPrice: '$30–80',
    affiliateUrl: amazonSearch('bass fishing lure assortment'),
  },
  {
    id: 'fish-braid-line',
    activity: 'fish',
    category: 'tackle',
    tier: 'budget',
    name: 'Braided Line (30 lb, 300 yd)',
    description: 'Low-stretch, high-sensitivity — fluorocarbon leader recommended.',
    estimatedPrice: '$15–30',
    asin: 'B005ADORGK',
    pickType: 'editor',
    affiliateUrl: amazonLink({ asin: 'B005ADORGK', query: 'braided fishing line 30 lb 300 yards' }),
  },

  // Fish — Safety
  {
    id: 'fish-pfd',
    activity: 'fish',
    category: 'safety',
    tier: 'mid',
    name: 'Inflatable PFD (Type III)',
    description: 'MD law: one USCG-approved PFD per person on any vessel.',
    estimatedPrice: '$80–200',
    asin: 'B07HPWN2S4',
    pickType: 'editor',
    affiliateUrl: amazonLink({ asin: 'B07HPWN2S4', query: 'inflatable pfd type iii uscg approved' }),
  },
  {
    id: 'fish-sun-shirt',
    activity: 'fish',
    category: 'clothing',
    tier: 'budget',
    name: 'UPF 50+ Sun Shirt',
    description: 'Long-sleeve wicking shirt — essential for Chesapeake Bay summer days.',
    estimatedPrice: '$25–60',
    asin: 'B01IA2W8MW',
    pickType: 'editor',
    affiliateUrl: amazonLink({ asin: 'B01IA2W8MW', query: 'upf 50 fishing sun shirt long sleeve' }),
  },

  // Both — Storage
  {
    id: 'gen-dry-bag',
    activity: 'both',
    category: 'storage',
    tier: 'budget',
    name: 'Waterproof Dry Bag (20L)',
    description: 'Keeps phone, wallet, extra layers dry in rain or on the water.',
    estimatedPrice: '$15–40',
    affiliateUrl: amazonSearch('waterproof dry bag 20 liter'),
  },
  {
    id: 'gen-cooler-40qt',
    activity: 'both',
    category: 'storage',
    tier: 'mid',
    name: 'Insulated Cooler (40 qt)',
    description: 'For hauling out a harvested deer quarter or a day\'s catch on ice.',
    estimatedPrice: '$50–300',
    affiliateUrl: amazonSearch('insulated cooler 40 quart'),
  },

  // Both — Gear
  {
    id: 'gen-knife-fixed',
    activity: 'both',
    category: 'gear',
    tier: 'mid',
    name: 'Fixed-Blade Field Knife',
    description: '4–5" drop-point blade for field-dressing deer or cleaning a limit of fish.',
    estimatedPrice: '$35–120',
    pickType: 'editor',
    affiliateUrl: amazonSearch('fixed blade hunting fillet knife'),
  },

  // ── Camp — Shelter ──
  {
    id: 'camp-tent-2p',
    activity: 'camp',
    category: 'shelter',
    tier: 'mid',
    name: '2-Person Backpacking Tent',
    description: 'Double-wall, freestanding, 3-season — covers spring/fall MD camping.',
    estimatedPrice: '$140–320',
    pickType: 'editor',
    affiliateUrl: amazonSearch('2 person backpacking tent 3 season'),
  },
  {
    id: 'camp-tent-4p',
    activity: 'camp',
    category: 'shelter',
    tier: 'budget',
    name: 'Family 4-Person Car-Camping Tent',
    description: 'Easy-pitch dome for Assateague, Cunningham Falls, and state-park loops.',
    estimatedPrice: '$80–220',
    asin: 'B004J2GUOU',
    pickType: 'budget',
    affiliateUrl: amazonLink({ asin: 'B004J2GUOU', query: '4 person family camping tent dome' }),
  },
  {
    id: 'camp-footprint',
    activity: 'camp',
    category: 'shelter',
    tier: 'budget',
    name: 'Tent Footprint / Groundsheet',
    description: 'Extends the tent floor life 3–4×. Sized to your tent model.',
    estimatedPrice: '$20–55',
    affiliateUrl: amazonSearch('tent footprint groundsheet'),
  },
  {
    id: 'camp-tarp-10x10',
    activity: 'camp',
    category: 'shelter',
    tier: 'budget',
    name: '10x10 Rain Tarp with Poles',
    description: 'Rigging a dry kitchen area is the #1 upgrade for wet MD weekends.',
    estimatedPrice: '$35–90',
    affiliateUrl: amazonSearch('10x10 camping rain tarp poles'),
  },

  // ── Camp — Sleep ──
  {
    id: 'camp-bag-20f',
    activity: 'camp',
    category: 'sleep',
    tier: 'mid',
    name: '20°F Sleeping Bag (Synthetic)',
    description: 'Handles MD shoulder-season lows; synthetic insulates when damp.',
    estimatedPrice: '$70–200',
    asin: 'B015GXSU3E',
    pickType: 'editor',
    seasonHint: [9, 4],
    affiliateUrl: amazonLink({ asin: 'B015GXSU3E', query: '20 degree sleeping bag synthetic' }),
  },
  {
    id: 'camp-pad-inflatable',
    activity: 'camp',
    category: 'sleep',
    tier: 'mid',
    name: 'Inflatable Sleeping Pad (R ≥ 3)',
    description: 'R-value 3+ keeps the ground chill off a 20°F bag in October.',
    estimatedPrice: '$60–180',
    asin: 'B0D92WP6Y4',
    pickType: 'premium',
    affiliateUrl: amazonLink({ asin: 'B0D92WP6Y4', query: 'inflatable sleeping pad r value 3' }),
  },
  {
    id: 'camp-pillow',
    activity: 'camp',
    category: 'sleep',
    tier: 'budget',
    name: 'Compressible Camp Pillow',
    description: 'Packs to a fist; worth the weight for real sleep on back-to-back nights.',
    estimatedPrice: '$15–45',
    affiliateUrl: amazonSearch('compressible camping pillow'),
  },
  {
    id: 'camp-liner',
    activity: 'camp',
    category: 'sleep',
    tier: 'budget',
    name: 'Silk/Cotton Bag Liner',
    description: 'Adds 5–10°F and keeps the inside of the bag clean trip to trip.',
    estimatedPrice: '$25–65',
    affiliateUrl: amazonSearch('sleeping bag liner silk'),
  },

  // ── Camp — Kitchen ──
  {
    id: 'camp-stove-canister',
    activity: 'camp',
    category: 'kitchen',
    tier: 'budget',
    name: 'Canister Stove (Backpacking)',
    description: 'Ultralight, 2–4 min boil time on an 8 oz canister.',
    estimatedPrice: '$15–80',
    asin: 'B01N5O7551',
    pickType: 'editor',
    affiliateUrl: amazonLink({ asin: 'B01N5O7551', query: 'backpacking canister stove msr pocketrocket' }),
  },
  {
    id: 'camp-stove-2burner',
    activity: 'camp',
    category: 'kitchen',
    tier: 'mid',
    name: '2-Burner Propane Stove',
    description: 'Car-camping workhorse — flank steaks and pancakes side by side.',
    estimatedPrice: '$60–160',
    affiliateUrl: amazonSearch('2 burner propane camping stove'),
  },
  {
    id: 'camp-cookset',
    activity: 'camp',
    category: 'kitchen',
    tier: 'budget',
    name: 'Nesting Cook Pot Set',
    description: 'Two pots, two lids, a pan — all nest inside a 20 oz mug.',
    estimatedPrice: '$30–90',
    affiliateUrl: amazonSearch('camping cookware nesting pot set'),
  },
  {
    id: 'camp-water-filter',
    activity: 'camp',
    category: 'kitchen',
    tier: 'mid',
    name: 'Gravity or Pump Water Filter',
    description: '0.1 micron hollow-fiber — needed past any headwater campground.',
    estimatedPrice: '$40–150',
    affiliateUrl: amazonSearch('gravity water filter camping hollow fiber'),
  },
  {
    id: 'camp-lantern',
    activity: 'camp',
    category: 'kitchen',
    tier: 'budget',
    name: 'Rechargeable LED Lantern',
    description: 'USB-C rechargeable, 300–800 lumens, dim mode for camp-site etiquette.',
    estimatedPrice: '$20–70',
    affiliateUrl: amazonSearch('rechargeable led camping lantern usb c'),
  },

  // ── Camp — Gear / Tools ──
  {
    id: 'camp-hatchet',
    activity: 'camp',
    category: 'gear',
    tier: 'mid',
    name: 'Camp Hatchet (14–19")',
    description: 'Splits kindling and limbs downed branches. Forged head, hickory handle.',
    estimatedPrice: '$40–120',
    affiliateUrl: amazonSearch('camping hatchet forged head hickory'),
  },
  {
    id: 'camp-fire-starter',
    activity: 'camp',
    category: 'gear',
    tier: 'budget',
    name: 'Ferro Rod + Tinder Pack',
    description: 'Back-up ignition when a wet match ruins your dinner plan.',
    estimatedPrice: '$10–30',
    affiliateUrl: amazonSearch('ferro rod fire starter tinder'),
  },
  {
    id: 'camp-chair-packable',
    activity: 'camp',
    category: 'gear',
    tier: 'mid',
    name: 'Packable Camp Chair',
    description: 'Two-pound chair that lives in the car — changes a 3-night trip entirely.',
    estimatedPrice: '$60–140',
    pickType: 'editor',
    affiliateUrl: amazonSearch('packable lightweight camp chair'),
  },
  {
    id: 'camp-power-bank',
    activity: 'camp',
    category: 'gear',
    tier: 'mid',
    name: '20,000 mAh USB-C Power Bank',
    description: '4–5 phone recharges; keeps the offline map stack and GPS alive.',
    estimatedPrice: '$35–95',
    affiliateUrl: amazonSearch('20000 mah usb c power bank'),
  },
  {
    id: 'camp-bug-net',
    activity: 'camp',
    category: 'gear',
    tier: 'budget',
    name: 'Head Net + Permethrin Spray',
    description: 'Essential during MD tick/mosquito peak (May–Aug).',
    estimatedPrice: '$15–35',
    seasonHint: [5, 8],
    affiliateUrl: amazonSearch('permethrin spray head net combo'),
  },

  // ── Hike — Pack ──
  {
    id: 'hike-pack-day',
    activity: 'hike',
    category: 'pack',
    tier: 'budget',
    name: 'Daypack (24–30 L)',
    description: 'Hydration-compatible pack for AT day sections and state-park loops.',
    estimatedPrice: '$40–120',
    asin: 'B06WWJJ2V7',
    pickType: 'editor',
    affiliateUrl: amazonLink({ asin: 'B06WWJJ2V7', query: 'osprey talon 22 hiking daypack hydration' }),
  },
  {
    id: 'hike-pack-overnight',
    activity: 'hike',
    category: 'pack',
    tier: 'mid',
    name: 'Overnight Backpack (45–55 L)',
    description: 'One- to three-night AT shelter-hopping volume.',
    estimatedPrice: '$140–320',
    pickType: 'editor',
    affiliateUrl: amazonSearch('55 liter backpacking pack'),
  },
  {
    id: 'hike-rain-cover',
    activity: 'hike',
    category: 'pack',
    tier: 'budget',
    name: 'Pack Rain Cover',
    description: 'Cheaper than a dry liner, faster than repacking in a downpour.',
    estimatedPrice: '$15–35',
    affiliateUrl: amazonSearch('backpack rain cover 30 liter'),
  },

  // ── Hike — Trekking ──
  {
    id: 'hike-poles',
    activity: 'hike',
    category: 'trekking',
    tier: 'mid',
    name: 'Trekking Poles (Carbon)',
    description: 'Saves knees on MD ridge descents (Catoctin, Weverton, Gathland).',
    estimatedPrice: '$70–180',
    asin: 'B01MUFDBQ9',
    pickType: 'budget',
    affiliateUrl: amazonLink({ asin: 'B01MUFDBQ9', query: 'cascade mountain tech carbon trekking poles' }),
  },
  {
    id: 'hike-gaiters',
    activity: 'hike',
    category: 'trekking',
    tier: 'budget',
    name: 'Low Hiking Gaiters',
    description: 'Keeps grit and ticks out of the boot during rhododendron bushwhacks.',
    estimatedPrice: '$25–60',
    affiliateUrl: amazonSearch('low hiking gaiters'),
  },
  {
    id: 'hike-boots',
    activity: 'hike',
    category: 'clothing',
    tier: 'premium',
    name: 'Mid-Cut Hiking Boots',
    description: 'Waterproof membrane, Vibram sole — AT-rated for MD\'s rocky ridges.',
    estimatedPrice: '$120–280',
    pickType: 'premium',
    affiliateUrl: amazonSearch('waterproof hiking boots vibram'),
  },
  {
    id: 'hike-socks-merino',
    activity: 'hike',
    category: 'clothing',
    tier: 'budget',
    name: 'Merino Hiking Socks (3-pack)',
    description: 'Wool wicks better than cotton; a fresh pair mid-day changes the day.',
    estimatedPrice: '$30–70',
    affiliateUrl: amazonSearch('merino wool hiking socks 3 pack'),
  },
  {
    id: 'hike-rain-shell',
    activity: 'hike',
    category: 'clothing',
    tier: 'mid',
    name: 'Packable Rain Shell',
    description: '2.5-layer waterproof breathable; stuffs to grapefruit size.',
    estimatedPrice: '$80–220',
    affiliateUrl: amazonSearch('packable waterproof rain jacket hiking'),
  },

  // ── Hike — Safety / Navigation ──
  {
    id: 'hike-first-aid',
    activity: 'hike',
    category: 'safety',
    tier: 'budget',
    name: 'Trail First Aid Kit (10 oz)',
    description: 'Blister care, tick-key, Benadryl, 4 ibuprofen, hemostatic gauze.',
    estimatedPrice: '$20–50',
    affiliateUrl: amazonSearch('hiking first aid kit blister tick'),
  },
  {
    id: 'hike-emergency-bivy',
    activity: 'hike',
    category: 'safety',
    tier: 'budget',
    name: 'Emergency Bivy',
    description: 'Mylar bivy for shelter if a day hike stretches past dusk.',
    estimatedPrice: '$15–35',
    affiliateUrl: amazonSearch('emergency bivy sack mylar'),
  },
  {
    id: 'hike-whistle-compass',
    activity: 'hike',
    category: 'navigation',
    tier: 'budget',
    name: 'Baseplate Compass + Whistle',
    description: 'Pair with a paper topo or the offline map — mechanical backup is cheap insurance.',
    estimatedPrice: '$10–30',
    affiliateUrl: amazonSearch('baseplate compass hiking whistle'),
  },
  {
    id: 'hike-prb',
    activity: 'hike',
    category: 'safety',
    tier: 'premium',
    name: 'Personal Locator Beacon / Satellite Messenger',
    description: 'SOS + 2-way text where there is no cell coverage (Green Ridge, Savage River).',
    estimatedPrice: '$250–500',
    pickType: 'premium',
    affiliateUrl: amazonSearch('satellite messenger personal locator beacon'),
  },

  // ── Hike — Hydration / Food ──
  {
    id: 'hike-filter-bottle',
    activity: 'hike',
    category: 'kitchen',
    tier: 'budget',
    name: 'Squeeze Filter + 2L Bladder',
    description: 'Refill from any clean stream; 0.1 micron is the AT standard.',
    estimatedPrice: '$35–70',
    asin: 'B08HWP19XK',
    pickType: 'budget',
    affiliateUrl: amazonLink({ asin: 'B08HWP19XK', query: 'sawyer mini squeeze water filter' }),
  },
  {
    id: 'hike-electrolyte',
    activity: 'hike',
    category: 'kitchen',
    tier: 'budget',
    name: 'Electrolyte Drink Tablets (30 ct)',
    description: 'Cheaper than Gatorade, lighter than salt tabs, and actually tastes fine.',
    estimatedPrice: '$15–30',
    seasonHint: [5, 9],
    affiliateUrl: amazonSearch('electrolyte drink tablets hiking'),
  },
  {
    id: 'hike-trail-snacks',
    activity: 'hike',
    category: 'gear',
    tier: 'budget',
    name: 'Trail Bar Variety Pack',
    description: '12–18 mixed bars to front-load the pack without thinking.',
    estimatedPrice: '$20–45',
    affiliateUrl: amazonSearch('trail bar variety pack clif kind'),
  },
  // ──────────────────────────────────────────────────────────────────────────
  // Multi-day / AT section-hiker additions (Task #11, 2026-04-18)
  // Fills the gap between 45–55 L overnight setups and thru-hike-ready kits.
  // Targets: 3-day Pen Mar → Harpers Ferry AT segment, 40.9 mi in Maryland.
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'hike-pack-expedition',
    activity: 'hike',
    category: 'pack',
    tier: 'premium',
    name: 'Expedition Pack (60–70 L)',
    description: '3+ day load capacity with proper hip belt. Required once bear canister + 3-day food + winter layers are in play.',
    estimatedPrice: '$230–380',
    pickType: 'editor',
    affiliateUrl: amazonSearch('osprey atmos 65 backpacking pack'),
  },
  {
    id: 'hike-tent-ultralight',
    activity: 'hike',
    category: 'pack',
    tier: 'premium',
    name: 'Ultralight 2P Trekking-Pole Tent',
    description: 'Sub-3 lb shelter that uses your trekking poles — the MD-AT shelter network lets you mostly tarp, but carry a tent for Pogo and capacity overflow.',
    estimatedPrice: '$280–550',
    pickType: 'premium',
    affiliateUrl: amazonSearch('durston x-mid zpacks duplex trekking pole tent'),
  },
  {
    id: 'hike-quilt-20f',
    activity: 'hike',
    category: 'pack',
    tier: 'mid',
    name: '20°F Down Backpacking Quilt',
    description: '1.5–2 lb down quilt beats the 3 lb camp bag for thru-hike weight. 20°F handles MD AT down to early November.',
    estimatedPrice: '$180–380',
    seasonHint: [3, 11],
    pickType: 'editor',
    affiliateUrl: amazonSearch('enlightened equipment revelation 20 quilt'),
  },
  {
    id: 'hike-pad-ultralight',
    activity: 'hike',
    category: 'pack',
    tier: 'premium',
    name: 'Ultralight Insulated Air Pad (R ≥ 4)',
    description: 'NeoAir-class pad at ~14 oz vs. 1.5+ lb camp pad. R-4 keeps you warm on cold AT shelter floors.',
    estimatedPrice: '$180–220',
    affiliateUrl: amazonSearch('therm-a-rest neoair xlite pad regular'),
  },
  {
    id: 'hike-stove-canister-ul',
    activity: 'hike',
    category: 'kitchen',
    tier: 'budget',
    name: 'Ultralight Canister Stove + Pot',
    description: '~3 oz BRS-3000T or Soto Windmaster + 750 ml titanium pot. Enough for 3-day AT section with 1×110 g fuel canister.',
    estimatedPrice: '$40–85',
    pickType: 'budget',
    affiliateUrl: amazonSearch('brs 3000t ultralight canister stove'),
  },
  {
    id: 'hike-meals-freezedried',
    activity: 'hike',
    category: 'kitchen',
    tier: 'mid',
    name: 'Freeze-Dried Backpacker Meals (6-pack)',
    description: 'Mountain House / Peak Refuel 600–800 kcal pouches; 1 per dinner, pair with oatmeal breakfasts + tortilla lunches for a 3-day AT loop.',
    estimatedPrice: '$50–85',
    pickType: 'editor',
    affiliateUrl: amazonSearch('mountain house freeze dried meals variety pack'),
  },
  {
    id: 'hike-bear-bag',
    activity: 'hike',
    category: 'safety',
    tier: 'mid',
    name: 'Ursack Major / PCT Bear Hang Kit',
    description: 'MD AT has active bear presence from Pen Mar to Weverton; every shelter has a bear pole but not all tent sites do. Ursack avoids the hang entirely.',
    estimatedPrice: '$85–110',
    pickType: 'editor',
    affiliateUrl: amazonSearch('ursack major bear resistant food bag'),
  },
  {
    id: 'hike-trail-runners',
    activity: 'hike',
    category: 'clothing',
    tier: 'mid',
    name: 'Trail Runners (non-waterproof)',
    description: 'Thru-hike consensus shoe — lighter + dries faster than boots. MD AT is rocky but not rugged enough to justify heavy boots for fit hikers.',
    estimatedPrice: '$110–160',
    pickType: 'editor',
    affiliateUrl: amazonSearch('altra lone peak trail running shoes'),
  },
  {
    id: 'hike-puffy-down',
    activity: 'hike',
    category: 'clothing',
    tier: 'mid',
    name: 'Down Puffy Jacket (800-fill)',
    description: '10–14 oz insulating layer for camp + shelter; compresses small. 800-fill goose down, hooded preferred.',
    estimatedPrice: '$180–320',
    seasonHint: [10, 4],
    pickType: 'editor',
    affiliateUrl: amazonSearch('patagonia down sweater hoody mens'),
  },
  {
    id: 'hike-rain-pants',
    activity: 'hike',
    category: 'clothing',
    tier: 'budget',
    name: 'Packable Rain Pants',
    description: 'MD AT averages 42 in precip/yr — rain pants keep the hike going when the shell alone is not enough.',
    estimatedPrice: '$35–120',
    affiliateUrl: amazonSearch('frogg toggs rain pants packable'),
  },
  {
    id: 'hike-camp-shoes',
    activity: 'hike',
    category: 'clothing',
    tier: 'budget',
    name: 'Camp Shoes / Crocs (packable)',
    description: 'Foot relief after 15-mi AT day; lets boots dry overnight at the shelter.',
    estimatedPrice: '$20–55',
    affiliateUrl: amazonSearch('crocs classic clog packable'),
  },
  {
    id: 'hike-trowel',
    activity: 'hike',
    category: 'gear',
    tier: 'budget',
    name: 'Deuce of Spades UL Trowel',
    description: 'LNT 6–8 inch catholes — required between AT shelter sites. 0.6 oz aluminum trowel.',
    estimatedPrice: '$20–25',
    affiliateUrl: amazonSearch('deuce of spades ultralight trowel'),
  },
  {
    id: 'hike-blister-kit',
    activity: 'hike',
    category: 'safety',
    tier: 'budget',
    name: 'Foot Care / Blister Kit',
    description: 'Leukotape + Engo patches + moleskin — the combo that ends hikes when missing. Weight-wise, the single best-ROI ounce in the pack.',
    estimatedPrice: '$20–35',
    pickType: 'editor',
    affiliateUrl: amazonSearch('leukotape blister kit hiking'),
  },
  {
    id: 'hike-guidebook-atmd',
    activity: 'hike',
    category: 'navigation',
    tier: 'budget',
    name: 'AT Guide: Maryland + Northern Virginia',
    description: 'ATC-published map set with shelter water notes + resupply logistics for the 40.9 MD miles. Paper backup to the phone is AT convention.',
    estimatedPrice: '$14–28',
    affiliateUrl: amazonSearch('appalachian trail guide maryland northern virginia'),
  },
  {
    id: 'hike-power-bank-ul',
    activity: 'hike',
    category: 'gear',
    tier: 'mid',
    name: 'UL 10,000 mAh USB-C Power Bank',
    description: '~6 oz bank recharges a phone ~2×. Lighter than the 20k camp bank in the Camp catalog; matches a 3-day AT section.',
    estimatedPrice: '$25–55',
    affiliateUrl: amazonSearch('nitecore nb10000 ultralight power bank'),
  },
];

const TIER_LABELS: Record<Tier, string> = {
  budget: 'Budget',
  mid: 'Mid-Range',
  premium: 'Premium',
};

const CATEGORY_LABELS: Record<Category, string> = {
  safety: 'Safety',
  navigation: 'Navigation',
  clothing: 'Clothing',
  optics: 'Optics',
  weapon: 'Weapon',
  gear: 'Tools',
  rod: 'Rods & Reels',
  tackle: 'Tackle',
  storage: 'Storage',
  shelter: 'Shelter',
  sleep: 'Sleep System',
  kitchen: 'Kitchen / Water',
  pack: 'Pack',
  trekking: 'Trekking',
};

// 2026-04-26: per-mode gear pickers. Each outdoor mode has its own
// "what kind of trip" hierarchy because the gear surfaces have almost
// zero overlap (a saddle-hunting whitetail kit vs a striped-bass boat
// kit vs an Appalachian Trail backpacking kit are entirely different).
// David fills in his real picks (`creatorPick: true`) over time; the
// rest are sensible Maryland-tuned defaults that still drive Amazon
// affiliate revenue via the mdoutdoors1-20 tag.

interface PickerCategory { id: string; short: string }

/**
 * Optional sub-style filter row for categories where the gear surface
 * splits into recognizable styles. Today: fly fishing (euro / conventional)
 * and whitetail (saddle / treestand). 'all' shows everything; the other
 * options only show items tagged with that subStyle OR tagged 'both'.
 */
type SubStyleId = 'all' | 'euro' | 'conventional' | 'saddle' | 'treestand';
interface SubStyleOption { id: SubStyleId; short: string }

const SUBSTYLES_BY_CATEGORY: Record<string, SubStyleOption[]> = {
  fly_gunpowder: [
    { id: 'all',          short: 'All' },
    { id: 'euro',         short: 'Euro Nymph' },
    { id: 'conventional', short: 'Conventional' },
  ],
  whitetail_saddle: [
    { id: 'all',          short: 'All' },
    { id: 'saddle',       short: 'Saddle' },
    { id: 'treestand',    short: 'Treestand' },
  ],
};

const FISH_GEAR_CATEGORIES: PickerCategory[] = [
  { id: 'fly_gunpowder',    short: 'Fly · Streams' },
  { id: 'bass_freshwater',  short: 'Lakes & Ponds' },
  { id: 'chesapeake',       short: 'Bay · Shore' },
  { id: 'saltwater',        short: 'Bay · Boat' },
];

const HUNT_GEAR_CATEGORIES: PickerCategory[] = [
  { id: 'whitetail_saddle',           short: 'Whitetail' },
  { id: 'spring_turkey',              short: 'Turkey' },
  { id: 'sika_deer',                  short: 'Sika' },
  { id: 'bear_hunting',               short: 'Bear' },
  { id: 'hunting_optics_observation', short: 'Optics' },
  { id: 'hunting_stands_blinds',      short: 'Stands' },
  { id: 'hunting_calls_decoys',       short: 'Calls' },
  { id: 'hunting_clothing_layers',    short: 'Clothing' },
  { id: 'hunting_accessories_tools',  short: 'Accessories' },
];

const HIKE_GEAR_CATEGORIES: PickerCategory[] = [
  { id: 'day_hike',     short: 'Day Hike' },
  { id: 'overnight',    short: 'Backpacking' },
  { id: 'cold_weather', short: 'Winter' },
  { id: 'rain_gear',    short: 'Rain' },
];

function getCategoriesFor(mode: string): PickerCategory[] {
  if (mode === 'fish') return FISH_GEAR_CATEGORIES;
  if (mode === 'hunt') return HUNT_GEAR_CATEGORIES;
  if (mode === 'hike') return HIKE_GEAR_CATEGORIES;
  return [];
}

function getCuratedDataFor(mode: string) {
  if (mode === 'fish') return CURATED_FISHING_GEAR;
  if (mode === 'hunt') return CURATED_HUNTING_GEAR;
  if (mode === 'hike') return CURATED_HIKING_GEAR;
  return [];
}

function CreatorPicksSection({
  mode,
  categoryId,
  subStyle,
}: {
  mode: 'hunt' | 'fish' | 'hike';
  categoryId: string;
  subStyle: SubStyleId;
}) {
  const category = useMemo(
    () => getCuratedDataFor(mode).find((c) => c.id === categoryId),
    [mode, categoryId],
  );
  if (!category) return null;
  // Apply sub-style filter. 'all' shows everything; specific styles show
  // items tagged with that subStyle OR tagged 'both' OR untagged.
  const matchesSubStyle = (it: CuratedGearItem) => {
    if (subStyle === 'all') return true;
    if (!it.subStyle) return true;
    return it.subStyle === subStyle || it.subStyle === 'both';
  };
  const filteredItems = category.items.filter(matchesSubStyle);
  const picks = filteredItems.filter((it) => it.creatorPick);
  const others = filteredItems.filter((it) => !it.creatorPick);

  const handlePickPress = async (item: CuratedGearItem) => {
    try {
      const supported = await Linking.canOpenURL(item.url);
      if (supported) await Linking.openURL(item.url);
      else Alert.alert('Unable to open', 'Cannot open the link on this device.');
    } catch {
      Alert.alert('Error', 'Failed to open the link.');
    }
  };

  const renderCard = (item: CuratedGearItem, idx: number, featured: boolean) => (
    <TouchableOpacity
      key={`${item.subcategory}-${idx}-${item.name}`}
      style={featured ? styles.creatorCard : styles.card}
      onPress={() => handlePickPress(item)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={featured ? styles.creatorCardCategory : styles.category}>
            {item.subcategory}
          </Text>
          <Text style={styles.itemName}>{item.name}</Text>
        </View>
        {featured ? (
          <View style={styles.creatorBadge}>
            <Text style={styles.creatorBadgeText}>By David</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.description}>{item.description}</Text>
      {featured && item.note ? (
        <Text style={styles.creatorNote}>“{item.note}”</Text>
      ) : null}
      <View style={styles.cardFooter}>
        <Text style={styles.price}>{item.price}</Text>
        <Text style={styles.viewLink}>{'View on Amazon →'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.creatorSection}>
      <View style={styles.creatorHeader}>
        <Text style={styles.creatorBadgeBig}>BY DAVID</Text>
        <Text style={styles.creatorTitle}>{category.title}</Text>
        <Text style={styles.creatorSubtitle}>{category.intro}</Text>
      </View>
      {picks.map((item, idx) => renderCard(item, idx, true))}
      {others.length > 0 ? (
        <>
          <View style={styles.creatorDivider} />
          <Text style={styles.creatorMoreLabel}>Also recommended</Text>
          {others.map((item, idx) => renderCard(item, idx + picks.length, false))}
        </>
      ) : null}
    </View>
  );
}

function SubStylePicker({
  options,
  active,
  onChange,
}: {
  options: SubStyleOption[];
  active: SubStyleId;
  onChange: (id: SubStyleId) => void;
}) {
  return (
    <View style={styles.subStyleRow}>
      {options.map((opt) => {
        const isActive = opt.id === active;
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[
              styles.subStyleChip,
              isActive && styles.subStyleChipActive,
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.subStyleText,
                isActive && styles.subStyleTextActive,
              ]}
            >
              {opt.short}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CategoryPicker({
  categories,
  active,
  onChange,
}: {
  categories: PickerCategory[];
  active: string;
  onChange: (id: string) => void;
}) {
  // 2026-04-30 (V2.4 audit): replaced the horizontal ScrollView of
  // chips with a single FilterPicker. Hunt mode has 9 categories
  // (Whitetail / Turkey / Sika / Bear / Optics / Stands / Calls /
  // Clothing / Accessories) which always overflowed the right edge;
  // Fish has 4, Hike has 4. The picker handles all sizes uniformly.
  // Single-select is emulated by toggle handlers — turning one ON
  // sets that category; toggling OFF the active one is a no-op (we
  // always keep something selected, since the gear list filters off
  // the active category).
  const activeCat = categories.find((c) => c.id === active);
  return (
    <View style={styles.categoryPickerWrap}>
      <FilterPicker
        triggerLabel={activeCat ? `Category: ${activeCat.short}` : 'Category'}
        title="Gear Category"
        options={categories.map((cat) => ({
          key: cat.id,
          label: cat.short,
          active: cat.id === active,
        }))}
        onChange={(key, next) => {
          if (next) onChange(key);
          // No revert behavior — we always keep one category selected.
        }}
      />
    </View>
  );
}

export default function StarterGearScreen() {
  const { activeMode } = useActivityMode();
  const [selectedTier, setSelectedTier] = useState<Tier | 'all'>('all');
  // Mode-keyed selected category. Each mode gets its own default — the most
  // heavily-curated category at the time of writing. State holds the id of
  // a category from getCategoriesFor(mode); on mode-switch we reset to the
  // mode's default.
  const modeCategories = useMemo(() => getCategoriesFor(activeMode), [activeMode]);
  const defaultCategoryId = modeCategories[0]?.id ?? null;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    defaultCategoryId,
  );
  const [selectedSubStyle, setSelectedSubStyle] = useState<SubStyleId>('all');
  // Reset selected category whenever the mode changes.
  React.useEffect(() => {
    setSelectedCategoryId(defaultCategoryId);
    setSelectedSubStyle('all');
  }, [defaultCategoryId]);
  // Reset sub-style whenever the category changes too.
  React.useEffect(() => {
    setSelectedSubStyle('all');
  }, [selectedCategoryId]);

  const subStyleOptions: SubStyleOption[] | null =
    selectedCategoryId && SUBSTYLES_BY_CATEGORY[selectedCategoryId]
      ? SUBSTYLES_BY_CATEGORY[selectedCategoryId]
      : null;

  const filtered = useMemo(() => {
    return GEAR_CATALOG.filter((item) => {
      if (item.activity !== 'both' && item.activity !== activeMode) return false;
      if (selectedTier !== 'all' && item.tier !== selectedTier) return false;
      return true;
    });
  }, [activeMode, selectedTier]);

  const handlePress = async (item: GearItem) => {
    try {
      const supported = await Linking.canOpenURL(item.affiliateUrl);
      if (supported) {
        await Linking.openURL(item.affiliateUrl);
      } else {
        Alert.alert('Unable to open', 'Cannot open the Amazon link on this device.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to open the link.');
    }
  };

  const renderItem = ({ item }: { item: GearItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => handlePress(item)} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.category}>{CATEGORY_LABELS[item.category]}</Text>
          <Text style={styles.itemName}>{item.name}</Text>
        </View>
        <View style={[styles.tierBadge, styles[`tier_${item.tier}`]]}>
          <Text style={styles.tierText}>{TIER_LABELS[item.tier]}</Text>
        </View>
      </View>
      <Text style={styles.description}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.price}>{item.estimatedPrice}</Text>
        <Text style={styles.viewLink}>{'View on Amazon \u2192'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/*
        2026-04-30 (V2.4): tier filter chip row replaced with a
        FilterPicker. 4 chips (All / Budget / Mid / Premium) fit fine on
        most phones, but consistency with the rest of the V2.4 audit
        makes this cleaner. Single-select via toggle handlers.
      */}
      <View style={styles.tierTriggerWrap}>
        <FilterPicker
          triggerLabel={
            selectedTier === 'all' ? 'Tier' : `Tier: ${TIER_LABELS[selectedTier as Tier]}`
          }
          title="Price Tier"
          compact
          options={[
            {
              key: 'all',
              label: 'All Tiers',
              hint: 'No tier filter',
              active: selectedTier === 'all',
            },
            {
              key: 'budget',
              label: TIER_LABELS.budget,
              hint: 'Most affordable picks',
              active: selectedTier === 'budget',
            },
            {
              key: 'mid',
              label: TIER_LABELS.mid,
              hint: 'Balanced quality + price',
              active: selectedTier === 'mid',
            },
            {
              key: 'premium',
              label: TIER_LABELS.premium,
              hint: 'Best-in-class picks',
              active: selectedTier === 'premium',
            },
          ]}
          onChange={(key, next) => {
            if (next) setSelectedTier(key as any);
            else if (selectedTier === key) setSelectedTier('all');
          }}
          onClearAll={() => setSelectedTier('all')}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.headerNote}>
              <Text style={styles.headerNoteText}>
                Starter gear recommendations curated for Maryland conditions. Tapping a card opens
                an Amazon search — MDHuntFishOutdoors may earn a small referral commission at no
                cost to you. Prices are estimates.
              </Text>
            </View>
            {modeCategories.length > 0 && selectedCategoryId ? (
              <>
                <CategoryPicker
                  categories={modeCategories}
                  active={selectedCategoryId}
                  onChange={setSelectedCategoryId}
                />
                {subStyleOptions ? (
                  <SubStylePicker
                    options={subStyleOptions}
                    active={selectedSubStyle}
                    onChange={setSelectedSubStyle}
                  />
                ) : null}
                <CreatorPicksSection
                  mode={activeMode as 'hunt' | 'fish' | 'hike'}
                  categoryId={selectedCategoryId}
                  subStyle={selectedSubStyle}
                />
              </>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items match this filter.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // 2026-04-30 (V2.4): tier chip ScrollView retired in favor of a
  // FilterPicker. Wrapper provides padding + dark surface bar matching
  // the previous chrome.
  tierTriggerWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  // Category picker wrapper — used by CategoryPicker component.
  categoryPickerWrap: {
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  // 2026-04-26: optional sub-style filter row (Euro / Conventional / etc.)
  // Renders below the main category picker when the category supports
  // multiple recognizable styles (fly fishing, whitetail).
  subStyleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  subStyleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.oak,
    backgroundColor: 'transparent',
  },
  subStyleChipActive: {
    backgroundColor: Colors.mdGold,
    borderColor: Colors.mdGold,
  },
  subStyleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  subStyleTextActive: {
    color: '#1c1c1c',
  },
  // 2026-04-26: Fish-mode category picker (Fly · Lakes · Bay Shore · Bay Boat).
  fishCategoryScroll: {
    maxHeight: 44,
    marginBottom: 12,
  },
  fishCategoryBar: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  fishCategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.oak,
    marginRight: 8,
    backgroundColor: Colors.surface,
  },
  fishCategoryChipActive: {
    backgroundColor: Colors.water,
    borderColor: Colors.water,
  },
  fishCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  fishCategoryTextActive: {
    color: Colors.textPrimary,
  },
  // 2026-04-26: "By David" creator-pick section styles.
  creatorSection: {
    marginBottom: 18,
  },
  creatorHeader: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 10,
  },
  creatorBadgeBig: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: Colors.mdGold,
    marginBottom: 4,
  },
  creatorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  creatorSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  creatorCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.mdGold,
  },
  creatorCardCategory: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.mdGold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  creatorBadge: {
    backgroundColor: Colors.mdGold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  creatorBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1c1c1c',
    letterSpacing: 0.5,
  },
  creatorNote: {
    marginTop: 6,
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  creatorDivider: {
    height: 1,
    backgroundColor: Colors.mud,
    marginTop: 6,
    marginBottom: 14,
  },
  creatorMoreLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // 2026-04-26 (fork merge): inactive-state contrast was failing WCAG AA
  // (Colors.textMuted #6B6358 on Colors.surface ≈ 2.4:1, same pattern as
  // the bottom-tab fix). Switched to textSecondary + oak border for legibility.
  // Second pass: minWidth so "Budget" doesn't clip on small viewports.
  tierFilter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.oak,
    marginRight: 8,
    minWidth: 78,
    alignItems: 'center',
  },
  tierFilterActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  tierFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tierFilterTextActive: {
    color: Colors.textPrimary,
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  headerNote: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.mdGold,
  },
  headerNoteText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  category: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mdGold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tier_budget: {
    backgroundColor: '#2E5530',
  },
  tier_mid: {
    backgroundColor: '#6B4A2A',
  },
  tier_premium: {
    backgroundColor: '#6B2F2F',
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.tan,
  },
  viewLink: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.moss,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
