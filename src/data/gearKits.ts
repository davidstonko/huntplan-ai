/**
 * gearKits.ts — Pre-built, curated gear kits for fishing and hunting
 *
 * Contains 12 comprehensive kits:
 * - 7 fishing kits (fly, shore, Chesapeake, kayak, catfish, panfish)
 * - 5 hunting kits (archery, turkey, waterfowl, late season, trail cam)
 *
 * Each kit references real Amazon products from amazonProductCatalog.ts
 * and is designed for specific user profiles and seasons.
 *
 * Used by AI chat recommendations, gear builders, and the Resources hub.
 */

import { GearKit, GearKitItem } from '../types/gear';
import {
  getProductsByCategory,
  searchProducts,
  AMAZON_PRODUCT_CATALOG,
} from './amazonProductCatalog';

/**
 * MD Trout Starter Kit - For beginners getting into fly fishing
 * @category Fishing - Fly
 */
const mdTroutStarterKit: GearKit = {
  id: 'kit-trout-starter',
  name: 'MD Trout Starter Kit',
  description:
    'Perfect entry point for beginning fly fishers targeting trout in Maryland streams. Includes a quality combo, essential dry flies and nymphs, leaders, and a quality fly box. Ideal for Gunpowder Falls, Casselman River, and Deep Creek.',
  mode: 'fish',
  targetUser: 'Beginner fly fisher',
  imageEmoji: '🐟',
  totalPriceRange: '$120-180',
  items: [
    {
      name: '5-Weight Fly Rod Combo',
      description:
        'Complete fly rod setup with reel, backing, and line. Perfect for small to medium trout streams.',
      required: true,
    },
    {
      name: 'BWO & Sulphur Dry Fly Assortment',
      description:
        'Essential dry flies for matching mayfly hatches on Maryland limestone streams.',
      required: true,
    },
    {
      name: 'Nymph Assortment',
      description:
        'Pheasant Tail, Hare\'s Ear, and Caddis nymphs for sub-surface fishing.',
      required: true,
    },
    {
      name: 'Tapered Leaders & Tippet',
      description: 'Quality leaders in 3X-6X for delicate presentations.',
      required: true,
    },
    {
      name: 'Waterproof Fly Box',
      description: 'Durable compartmentalized box to organize and protect flies.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Fly Rod Combo 5-Weight').slice(0, 1),
    ...searchProducts('BWO Dry Fly').slice(0, 1),
    ...searchProducts('Nymph Assortment').slice(0, 1),
    ...searchProducts('Tapered Leader').slice(0, 1),
    ...searchProducts('Waterproof Fly Box').slice(0, 1),
  ],
};

/**
 * Gunpowder Dry Fly Collection - Curated flies for Maryland limestone streams
 * @category Fishing - Fly
 */
const gunpowderDryFlyKit: GearKit = {
  id: 'kit-gunpowder-dries',
  name: 'Gunpowder Dry Fly Collection',
  description:
    'Advanced collection of proven dry fly patterns for experienced fly fishers. Covers major hatches throughout the season on Gunpowder Falls and similar limestone streams. Includes terrestrials for late summer.',
  mode: 'fish',
  targetUser: 'Experienced fly fisher',
  imageEmoji: '🎣',
  totalPriceRange: '$35-50',
  items: [
    {
      name: 'Baetis (BWO) Dry Fly Assortment',
      description: 'Sizes 16-20 for spring and fall mayfly activity.',
      required: true,
    },
    {
      name: 'Sulphur Dry Fly Selection',
      description: 'Sizes 14-18 for summer evening hatches.',
      required: true,
    },
    {
      name: 'Elk Hair Caddis Assortment',
      description:
        'Multiple sizes and colors for spring and fall caddis hatches.',
      required: true,
    },
    {
      name: 'Terrestrial Fly Assortment',
      description: 'Ants, beetles, and grasshoppers for late-season fishing.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('BWO Dry Fly').slice(0, 1),
    ...searchProducts('Sulphur Dry Fly').slice(0, 1),
    ...searchProducts('Elk Hair Caddis').slice(0, 1),
    ...searchProducts('Terrestrial Fly').slice(0, 1),
  ],
};

/**
 * Chesapeake Striper Kit - For bay anglers targeting striped bass
 * @category Fishing - Multi-method
 */
const chesapeakeStriperKit: GearKit = {
  id: 'kit-striper-bay',
  name: 'Chesapeake Striper Kit',
  description:
    'Complete kit for Chesapeake Bay striper fishing. Includes heavy spinning gear, bucktail jigs, soft plastics, and live bait rigs for both fall/spring runs and summer shallow water. Covers lure and live bait methods.',
  mode: 'fish',
  targetUser: 'Bay angler',
  imageEmoji: '🐠',
  totalPriceRange: '$150-250',
  items: [
    {
      name: 'Medium-Heavy Spinning Combo',
      description: '7ft rod with 3000 reel for casting heavier lures and bait.',
      required: true,
    },
    {
      name: 'Bucktail Jig Assortment',
      description: 'Various colors and weights (1/2oz-2oz) for deep channel fishing.',
      required: true,
    },
    {
      name: 'Soft Plastic Swim Shad Pack',
      description: '3-5 inch shads for rigging on jig heads or free-lining.',
      required: true,
    },
    {
      name: 'Jigging Spoon Set',
      description: '1/2oz to 2oz spoons for vertical jigging and casting.',
      required: true,
    },
    {
      name: 'Circle Hook Assortment & Live Bait Rigs',
      description: 'Sizes 1/0-6/0 with leader for live mackerel or shad.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Medium-Heavy Spinning').slice(0, 1),
    ...searchProducts('Bucktail Jig').slice(0, 1),
    ...searchProducts('Soft Plastic Swim Shad').slice(0, 1),
    ...searchProducts('Jigging Spoon').slice(0, 1),
    ...searchProducts('Circle Hook').slice(0, 1),
  ],
};

/**
 * Shore Fishing Starter Kit - For families and beginners
 * @category Fishing - Bait
 */
const shoreFishingKit: GearKit = {
  id: 'kit-shore-starter',
  name: 'Shore Fishing Starter Kit',
  description:
    'Perfect for families and casual anglers fishing from shore. Beginner-friendly setup with spinning combos, simple bait rigs, bobbers, and tackle basics. Great for lakes, ponds, and rivers.',
  mode: 'fish',
  targetUser: 'Family / beginner',
  imageEmoji: '🌊',
  totalPriceRange: '$60-100',
  items: [
    {
      name: 'Beginner Spinning Combo',
      description: '6.5ft rod with 2500 reel. Easy to use for kids and adults.',
      required: true,
    },
    {
      name: 'Bobber & Float Assortment',
      description: 'Mix of slip and fixed bobbers for different depths.',
      required: true,
    },
    {
      name: 'Circle Hook Assortment',
      description: 'Sizes 1/0-4/0 for live bait fishing with minimal catch-and-release injury.',
      required: true,
    },
    {
      name: 'Sinker Assortment',
      description: 'Various weights for reaching different depths.',
      required: true,
    },
    {
      name: 'Small Tackle Box',
      description: 'Portable storage for hooks, sinkers, and bobbers.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Spinning Combo Beginner').slice(0, 1),
    ...searchProducts('Bobber Float').slice(0, 1),
    ...searchProducts('Circle Hook').slice(0, 1),
    ...searchProducts('Sinker Assortment').slice(0, 1),
    ...searchProducts('Tackle Box').slice(0, 1),
  ],
};

/**
 * Kayak Fishing Essentials - For anglers fishing from kayak
 * @category Fishing - Multi-method
 */
const kayakFishingKit: GearKit = {
  id: 'kit-kayak-essentials',
  name: 'Kayak Fishing Essentials',
  description:
    'Specialized kit for kayak anglers on Maryland waters. Includes compact spinning and light lure rigs, essential tackle, safety gear, and fish handling tools optimized for kayak access to shallow water and grass beds.',
  mode: 'fish',
  targetUser: 'Kayak angler',
  imageEmoji: '🛶',
  totalPriceRange: '$200-350',
  items: [
    {
      name: 'Compact Spinning Combo',
      description: '6ft medium-light rod with 2500 reel. Easy to handle from kayak.',
      required: true,
    },
    {
      name: 'Light Soft Plastic Lure Collection',
      description: 'Senkos, shads, and drop-shot plastics in natural colors.',
      required: true,
    },
    {
      name: 'Small Jigging Spoon Set',
      description: '1/4-1/2oz spoons for dropping to structure.',
      required: true,
    },
    {
      name: 'Waterproof Tackle Box',
      description: 'Compact, waterproof storage for kayak safety.',
      required: true,
    },
    {
      name: 'Fish Scale & Grip',
      description: 'Measure and handle catch safely while in kayak.',
      required: true,
    },
    {
      name: 'Multi-tool Pliers',
      description: 'Hook removal and quick repairs.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Spinning Combo Beginner').slice(0, 1),
    ...searchProducts('Senko Worm').slice(0, 1),
    ...searchProducts('Jigging Spoon').slice(0, 1),
    ...searchProducts('Tackle Box').slice(0, 1),
    ...searchProducts('Fish Grip').slice(0, 1),
    ...searchProducts('Fishing Pliers').slice(0, 1),
  ],
};

/**
 * Catfish Rig Kit - For freshwater catfish targeting
 * @category Fishing - Bait
 */
const catfishRigKit: GearKit = {
  id: 'kit-catfish-rigs',
  name: 'Catfish Rig Kit',
  description:
    'Essential rigs and tackle for catfish fishing in Maryland lakes, rivers, and ponds. Includes heavy rigs, large circle hooks, sinker assortments, and bait options for channel cats, blues, and flatheads.',
  mode: 'fish',
  targetUser: 'Catfish angler',
  imageEmoji: '🐱',
  totalPriceRange: '$40-70',
  items: [
    {
      name: 'Heavy Circle Hooks',
      description: 'Sizes 2/0-6/0. Circle hooks ideal for safe catch-and-release.',
      required: true,
    },
    {
      name: 'Heavy Sinker Assortment',
      description: '1oz-4oz weights for holding bottom in current.',
      required: true,
    },
    {
      name: 'Three-Way Rig Pack',
      description: 'Pre-tied rigs for quick setup. Multiple configurations included.',
      required: true,
    },
    {
      name: 'Fish Finder Rigs',
      description: 'Egg sinker rigs for sensitive catfish detection.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Circle Hook').slice(0, 1),
    ...searchProducts('Sinker Assortment').slice(0, 1),
    ...searchProducts('Fish Finder Rig').slice(0, 1),
  ],
};

/**
 * Panfish & Crappie Kit - For lake and pond panfish
 * @category Fishing - Lure
 */
const panfishCrappieKit: GearKit = {
  id: 'kit-panfish-lake',
  name: 'Panfish / Crappie Kit',
  description:
    'Light-tackle kit for bluegill, crappie, and other panfish. Compact spinning setup with small jigs, light spinners, and simple rigs. Ideal for lakes, ponds, and slow-moving rivers.',
  mode: 'fish',
  targetUser: 'Lake angler',
  imageEmoji: '🐠',
  totalPriceRange: '$50-80',
  items: [
    {
      name: 'Light Spinning Combo',
      description: '5.5ft medium-light rod with 1500 reel.',
      required: true,
    },
    {
      name: 'Small Jig Assortment',
      description: '1/16-1/8oz jigs in white, yellow, and natural colors.',
      required: true,
    },
    {
      name: 'Rooster Tail Spinner Pack',
      description: '1/4oz spinners in various colors for active feeding fish.',
      required: true,
    },
    {
      name: 'Small Crappie Rig Pack',
      description: 'Split-shot rigs with small hooks for live minnow presentations.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Spinning Combo Beginner').slice(0, 1),
    ...searchProducts('Jig').slice(0, 1),
    ...searchProducts('Rooster Tail Spinner').slice(0, 1),
  ],
};

/**
 * MD Archery Deer Starter Kit - For new bowhunters
 * @category Hunting - Archery
 */
const archeryDeerStarterKit: GearKit = {
  id: 'kit-archery-deer-starter',
  name: 'MD Archery Deer Starter',
  description:
    'Complete starter kit for new bowhunters targeting whitetail deer in Maryland. Includes all essentials: stand, safety harness, broadheads, scent control, and setup accessories. Everything needed for archery season.',
  mode: 'hunt',
  targetUser: 'New bowhunter',
  imageEmoji: '🦌',
  totalPriceRange: '$150-250',
  items: [
    {
      name: 'Hang-On Tree Stand',
      description: 'Lightweight, easy-setup stand for different tree sizes.',
      required: true,
    },
    {
      name: 'Safety Harness',
      description: 'Full-body harness for stand safety. Non-negotiable.',
      required: true,
    },
    {
      name: 'Broadheads',
      description: 'Mechanical broadheads (100 grain) for ethical, effective shots.',
      required: true,
    },
    {
      name: 'Dead Down Wind Scent Kit',
      description: 'Spray system to control human odor during hunts.',
      required: true,
    },
    {
      name: 'Hunting Headlamp',
      description: 'Red LED for pre-dawn and dusk movement without spooking deer.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Hang-On Tree Stand').slice(0, 1),
    ...searchProducts('Safety Harness').slice(0, 1),
    ...searchProducts('Broadheads Mechanical').slice(0, 1),
    ...searchProducts('Dead Down Wind').slice(0, 1),
    ...searchProducts('Hunting Headlamp').slice(0, 1),
  ],
};

/**
 * Turkey Hunting Kit - Spring and fall turkey season
 * @category Hunting - Calls & Scent
 */
const turkeyHuntingKit: GearKit = {
  id: 'kit-turkey-spring',
  name: 'Turkey Hunting Kit',
  description:
    'Complete spring and fall turkey hunting package. Includes proven calls (slate, box, diaphragm), decoy-friendly camo setup, scent control, and essential accessories for calling in toms and hens.',
  mode: 'hunt',
  targetUser: 'Spring turkey hunter',
  imageEmoji: '🦃',
  totalPriceRange: '$120-200',
  items: [
    {
      name: 'Turkey Slate Call',
      description: 'Adjustable striker for realistic hen clucks and purrs.',
      required: true,
    },
    {
      name: 'Turkey Box Call',
      description: 'Easy-to-use classic call for cutting and tree calls.',
      required: true,
    },
    {
      name: 'Diaphragm Call Set',
      description: 'Three different reeds for hands-free calling.',
      required: true,
    },
    {
      name: 'Scent-Free Detergent',
      description: 'Wash hunting clothes to eliminate human odor.',
      required: true,
    },
    {
      name: 'Hunting Headlamp',
      description: 'Red LED for morning walk-ins without spooking roosted birds.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Turkey Slate Call').slice(0, 1),
    ...searchProducts('Turkey Box Call').slice(0, 1),
    ...searchProducts('Turkey Diaphragm').slice(0, 1),
    ...searchProducts('Scent-Free Detergent').slice(0, 1),
    ...searchProducts('Hunting Headlamp').slice(0, 1),
  ],
};

/**
 * Waterfowl Essentials Kit - For duck and goose hunters
 * @category Hunting - Calls & Decoys
 */
const waterfowlKit: GearKit = {
  id: 'kit-waterfowl-essentials',
  name: 'Waterfowl Essentials',
  description:
    'Essential kit for Maryland duck and goose hunters. Includes calls for multiple species, scent control, safety gear, and accessories for layout blinds or jump-shooting. Covers early season, main season, and late season tactics.',
  mode: 'hunt',
  targetUser: 'Duck / Goose hunter',
  imageEmoji: '🦆',
  totalPriceRange: '$80-150',
  items: [
    {
      name: 'Duck Call',
      description: 'Polycarbonate call for realistic mallard and other duck species.',
      required: true,
    },
    {
      name: 'Goose Call',
      description: 'Canada goose vocalizations. Essential for season opener and late season.',
      required: true,
    },
    {
      name: 'Scent-Free Detergent',
      description: 'Reduce human odor on camo and clothing.',
      required: true,
    },
    {
      name: 'Hand Warmers',
      description: 'Thermacell 8-hour packs for dawn hunts in cold weather.',
      required: true,
    },
    {
      name: 'Hunting Headlamp',
      description: 'Red LED for pre-dawn movement to blinds.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Duck Call').slice(0, 1),
    ...searchProducts('Goose Call').slice(0, 1),
    ...searchProducts('Scent-Free Detergent').slice(0, 1),
    ...searchProducts('Hand Warmers').slice(0, 1),
    ...searchProducts('Hunting Headlamp').slice(0, 1),
  ],
};

/**
 * Late Season Warmth Kit - Cold weather hunting essentials
 * @category Hunting - Clothing & Warmth
 */
const lateSeasonWarmthKit: GearKit = {
  id: 'kit-late-season-warmth',
  name: 'Late Season Warmth Kit',
  description:
    'Complete cold-weather hunting system for November through season close. Includes hand/body warmers, protective clothing accessories, and safety gear for long sits in freezing conditions.',
  mode: 'hunt',
  targetUser: 'Cold weather deer hunter',
  imageEmoji: '❄️',
  totalPriceRange: '$100-180',
  items: [
    {
      name: 'Hand Warmer Pack',
      description: 'Thermacell 8-hour warmers. 10-pack for extended season.',
      required: true,
    },
    {
      name: 'Scent-Free Detergent',
      description: 'Wash heavy late-season camo and layering.'     ,
      required: true,
    },
    {
      name: 'Safety Harness with Padding',
      description: 'Insulated comfort harness for long sits in cold.',
      required: true,
    },
    {
      name: 'Hunting Headlamp',
      description: 'Red LED for safe pre-dawn stand setup and dusk sits.',
      required: true,
    },
    {
      name: 'Field Dressing Kit',
      description: 'Necessary for humane, efficient processing in cold weather.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Hand Warmers').slice(0, 1),
    ...searchProducts('Scent-Free Detergent').slice(0, 1),
    ...searchProducts('Safety Harness').slice(0, 1),
    ...searchProducts('Hunting Headlamp').slice(0, 1),
    ...searchProducts('Field Dressing Kit').slice(0, 1),
  ],
};

/**
 * Trail Cam Setup Kit - Year-round wildlife monitoring
 * @category Hunting - Optics & Monitoring
 */
const trailCamSetupKit: GearKit = {
  id: 'kit-trail-cam-setup',
  name: 'Trail Cam Setup Kit',
  description:
    'Complete trail camera system for year-round property monitoring. Includes 2-pack cameras with 24MP video, mounting hardware, batteries, and data management setup for pre-season scouting and in-season patterns.',
  mode: 'hunt',
  targetUser: 'Serious scout / land manager',
  imageEmoji: '📹',
  totalPriceRange: '$150-250',
  items: [
    {
      name: 'Trail Camera 2-Pack',
      description: '24MP video, PIR motion detection, SD card compatible.',
      required: true,
    },
    {
      name: 'Alkaline Battery Pack',
      description: 'Multiple packs for extended deployment without frequent resets.',
      required: true,
    },
    {
      name: 'Vortex Rangefinder',
      description: 'Pair with camera data to map stand distances and shooting lanes.',
      required: false,
    },
    {
      name: 'Field Notebook',
      description: 'Log patterns, times, and behavior observations.',
      required: false,
    },
  ],
  amazonProducts: [
    ...searchProducts('Trail Camera 2-Pack').slice(0, 1),
    ...searchProducts('Rangefinder').slice(0, 1),
  ],
};

/**
 * Complete gear kit array
 */
export const GEAR_KITS: GearKit[] = [
  // Fishing kits
  mdTroutStarterKit,
  gunpowderDryFlyKit,
  chesapeakeStriperKit,
  shoreFishingKit,
  kayakFishingKit,
  catfishRigKit,
  panfishCrappieKit,
  // Hunting kits
  archeryDeerStarterKit,
  turkeyHuntingKit,
  waterfowlKit,
  lateSeasonWarmthKit,
  trailCamSetupKit,
];

/**
 * Get gear kits filtered by activity mode
 * @param mode - 'fish' or 'hunt'
 * @returns Array of kits matching the mode
 */
export function getKitsByMode(mode: 'fish' | 'hunt'): GearKit[] {
  return GEAR_KITS.filter((kit) => kit.mode === mode);
}

/**
 * Get a specific kit by ID
 * @param id - Kit ID
 * @returns Gear kit or undefined
 */
export function getKitById(id: string): GearKit | undefined {
  return GEAR_KITS.find((kit) => kit.id === id);
}

/**
 * Get kits for a specific user profile
 * @param targetUser - User profile string (e.g., 'Beginner fly fisher')
 * @returns Array of matching kits
 */
export function getKitsByUserProfile(targetUser: string): GearKit[] {
  return GEAR_KITS.filter((kit) => kit.targetUser === targetUser);
}

/**
 * Get all fishing kits
 * @returns Array of fishing kits
 */
export function getFishingKits(): GearKit[] {
  return getKitsByMode('fish');
}

/**
 * Get all hunting kits
 * @returns Array of hunting kits
 */
export function getHuntingKits(): GearKit[] {
  return getKitsByMode('hunt');
}
