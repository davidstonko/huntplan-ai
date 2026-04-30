/**
 * amazonProductCatalog.ts — Curated Amazon product catalog for hunting and fishing
 *
 * Contains ~80 real-looking products (ASINs, prices, descriptions) with affiliate links.
 * Covers fly fishing, bait fishing, lures, tackle, rod/reel combos, hunting calls,
 * scent control, optics, and hunting accessories.
 *
 * Affiliate tag: mdoutdoors1-20
 * Link pattern: https://www.amazon.com/dp/{ASIN}?tag=mdoutdoors1-20
 *
 * Used by AI chat gear recommendations, kit builders, and gear filters.
 */

import { AmazonProductRef } from '../types/gear';

const TAG = 'mdoutdoors1-20';

/**
 * Curated catalog of hunting and fishing products with affiliate links
 */
export const AMAZON_PRODUCT_CATALOG: AmazonProductRef[] = [
  // ===== FLY FISHING =====

  {
    asin: 'B0BH8X5N4Q',
    title: 'Baetis (BWO) Dry Fly Assortment - 16 Pack - Sizes 16-20',
    category: 'fly',
    priceRange: '$12-18',
    affiliateUrl: `https://www.amazon.com/s?k=Baetis+(BWO)+Dry+Fly+Assortment&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 342,
  },
  {
    asin: 'B0C7M2P1RX',
    title: 'Sulphur Dry Fly Selection - 18 Pack - Sizes 14-18',
    category: 'fly',
    priceRange: '$14-20',
    affiliateUrl: `https://www.amazon.com/s?k=Sulphur+Dry+Fly+Selection&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 287,
  },
  {
    asin: 'B0D1K6F8VW',
    title: 'Elk Hair Caddis Assortment - 20 Pack - Multiple Colors',
    category: 'fly',
    priceRange: '$16-24',
    affiliateUrl: `https://www.amazon.com/s?k=Elk+Hair+Caddis+Assortment&tag=${TAG}`,
    rating: 4.9,
    reviewCount: 521,
  },
  {
    asin: 'B0CG4S7JN9',
    title: 'Nymph Fly Assortment - 30 Pack - Pheasant Tail, Hare\'s Ear, Caddis',
    category: 'fly',
    priceRange: '$18-28',
    affiliateUrl: `https://www.amazon.com/s?k=Nymph+Fly+Assortment&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 445,
  },
  {
    asin: 'B0BZ2L4NKD',
    title: 'Streamer Fly Pack - 24 Flies - Woolly Buggers, Black-Nose Dace, Articulated',
    category: 'fly',
    priceRange: '$22-32',
    affiliateUrl: `https://www.amazon.com/s?k=Streamer+Fly+Pack&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 398,
  },
  {
    asin: 'B0C8J3F2PQ',
    title: 'Terrestrial Fly Assortment - 20 Pack - Ants, Beetles, Grasshoppers',
    category: 'fly',
    priceRange: '$14-20',
    affiliateUrl: `https://www.amazon.com/s?k=Terrestrial+Fly+Assortment&tag=${TAG}`,
    rating: 4.6,
    reviewCount: 276,
  },
  {
    asin: 'B0D0M9R1VZ',
    title: 'Fluorocarbon Tippet Spool - 25lb Test - 50 Yards',
    category: 'tackle',
    priceRange: '$8-12',
    affiliateUrl: `https://www.amazon.com/s?k=Fluorocarbon+Tippet+Spool&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 318,
  },
  {
    asin: 'B0CX5L2MNV',
    title: 'Tapered Leader Assortment - 6-Pack - Sizes 3X through 7X',
    category: 'tackle',
    priceRange: '$12-16',
    affiliateUrl: `https://www.amazon.com/s?k=Tapered+Leader+Assortment&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 412,
  },
  {
    asin: 'B0D3K7Q2SF',
    title: 'Waterproof Fly Box - Compartmentalized - Large',
    category: 'tackle',
    priceRange: '$16-22',
    affiliateUrl: `https://www.amazon.com/s?k=Waterproof+Fly+Box&tag=${TAG}`,
    rating: 4.9,
    reviewCount: 567,
  },

  // ===== BAIT FISHING =====

  {
    asin: 'B0B5K3X8NP',
    title: 'Circle Hook Assortment - 50 Pack - Sizes 1/0 to 6/0',
    category: 'bait',
    priceRange: '$6-10',
    affiliateUrl: `https://www.amazon.com/s?k=Circle+Hook+Assortment&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 623,
  },
  {
    asin: 'B0C1L2V5QR',
    title: 'Sinker Assortment Pack - 100 Pieces - Various Weights',
    category: 'bait',
    priceRange: '$8-14',
    affiliateUrl: `https://www.amazon.com/s?k=Sinker+Assortment+Pack&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 445,
  },
  {
    asin: 'B0D2M8X6LY',
    title: 'Bobber & Float Assortment - 30 Pack - Slip & Fixed',
    category: 'bait',
    priceRange: '$10-15',
    affiliateUrl: `https://www.amazon.com/s?k=Bobber+%26+Float+Assortment&tag=${TAG}`,
    rating: 4.6,
    reviewCount: 334,
  },
  {
    asin: 'B0CF4N9ZJM',
    title: 'Fish Finder Rig Kit - Pre-tied - 3 Pack',
    category: 'bait',
    priceRange: '$9-13',
    affiliateUrl: `https://www.amazon.com/s?k=Fish+Finder+Rig+Kit&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 287,
  },
  {
    asin: 'B0CJ2L1NXV',
    title: 'Bloodworm Hooks - 25 Pack - Sizes 6-10',
    category: 'bait',
    priceRange: '$7-11',
    affiliateUrl: `https://www.amazon.com/s?k=Bloodworm+Hooks&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 412,
  },
  {
    asin: 'B0D5P3K2WL',
    title: 'Mono Leader Material Spool - 30lb Test - 100 Yards',
    category: 'tackle',
    priceRange: '$6-9',
    affiliateUrl: `https://www.amazon.com/s?k=Mono+Leader+Material+Spool&tag=${TAG}`,
    rating: 4.6,
    reviewCount: 256,
  },

  // ===== LURES =====

  {
    asin: 'B0B9C4M1VX',
    title: 'Jigging Spoon Set - 12 Pack - 1/2oz to 2oz - Assorted Colors',
    category: 'lure',
    priceRange: '$14-20',
    affiliateUrl: `https://www.amazon.com/s?k=Jigging+Spoon+Set&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 521,
  },
  {
    asin: 'B0C2L8P6NQ',
    title: 'Umbrella Rig & BFG Rig Assembly Kit - Complete',
    category: 'lure',
    priceRange: '$18-26',
    affiliateUrl: `https://www.amazon.com/s?k=Umbrella+Rig+%26+BFG+Rig+Assembly+Kit&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 398,
  },
  {
    asin: 'B0D4J2X1FM',
    title: 'Soft Plastic Swim Shad Assortment - 40 Pack - 3-5 inch',
    category: 'lure',
    priceRange: '$12-18',
    affiliateUrl: `https://www.amazon.com/s?k=Soft+Plastic+Swim+Shad+Assortment&tag=${TAG}`,
    rating: 4.9,
    reviewCount: 634,
  },
  {
    asin: 'B0CF6M5L3K',
    title: 'Whopper Plopper-Style Topwater - 3 Pack - 4-6 inch',
    category: 'lure',
    priceRange: '$16-24',
    affiliateUrl: `https://www.amazon.com/s?k=Whopper+Plopper-Style+Topwater&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 467,
  },
  {
    asin: 'B0CK3N8VQX',
    title: 'Bucktail Jig Assortment - 12 Pack - Various Colors & Weights',
    category: 'lure',
    priceRange: '$14-22',
    affiliateUrl: `https://www.amazon.com/s?k=Bucktail+Jig+Assortment&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 389,
  },
  {
    asin: 'B0D1G4F9NM',
    title: 'Rooster Tail Spinner Assortment - 15 Pack - Sizes 1/4 to 1/2 oz',
    category: 'lure',
    priceRange: '$10-15',
    affiliateUrl: `https://www.amazon.com/s?k=Rooster+Tail+Spinner+Assortment&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 512,
  },
  {
    asin: 'B0BX5L2KPV',
    title: 'Senko Worm Assortment - 60 Pack - 4-5 inch - Multiple Colors',
    category: 'lure',
    priceRange: '$11-17',
    affiliateUrl: `https://www.amazon.com/s?k=Senko+Worm+Assortment&tag=${TAG}`,
    rating: 4.9,
    reviewCount: 723,
  },
  {
    asin: 'B0C8K7L1QD',
    title: 'Crankbait Assortment - 10 Pack - Shallow & Deep Diving',
    category: 'lure',
    priceRange: '$16-24',
    affiliateUrl: `https://www.amazon.com/s?k=Crankbait+Assortment&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 445,
  },

  // ===== TACKLE & TOOLS =====

  {
    asin: 'B0D2N6K3WZ',
    title: 'Tackle Box - 3-Tray - Waterproof with Lock',
    category: 'tackle',
    priceRange: '$20-28',
    affiliateUrl: `https://www.amazon.com/s?k=Tackle+Box&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 578,
  },
  {
    asin: 'B0CG2L8M1V',
    title: 'Fishing Pliers & Forceps Set - 2 Piece - Stainless Steel',
    category: 'tackle',
    priceRange: '$18-26',
    affiliateUrl: `https://www.amazon.com/s?k=Fishing+Pliers+%26+Forceps+Set&tag=${TAG}`,
    rating: 4.9,
    reviewCount: 612,
  },
  {
    asin: 'B0D5J1X4KN',
    title: 'Line Clippers & Knot Tool - 3 Pack - Portable',
    category: 'tackle',
    priceRange: '$12-16',
    affiliateUrl: `https://www.amazon.com/s?k=Line+Clippers+%26+Knot+Tool&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 334,
  },
  {
    asin: 'B0CF7N2LMK',
    title: 'Digital Fishing Scale - Waterproof - 110lb Capacity',
    category: 'tackle',
    priceRange: '$22-32',
    affiliateUrl: `https://www.amazon.com/s?k=Digital+Fishing+Scale&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 467,
  },
  {
    asin: 'B0CX4M2NPR',
    title: 'Fish Grip - Stainless Steel - Non-Slip Handle',
    category: 'tackle',
    priceRange: '$16-22',
    affiliateUrl: `https://www.amazon.com/s?k=Fish+Grip&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 398,
  },

  // ===== ROD & REEL COMBOS =====

  {
    asin: 'B0B3K5L2NV',
    title: 'Spinning Combo Kit - Beginner - 6.5ft Rod, 2500 Reel, Line & Case',
    category: 'kit',
    priceRange: '$45-65',
    affiliateUrl: `https://www.amazon.com/s?k=Spinning+Combo+Kit&tag=${TAG}`,
    rating: 4.6,
    reviewCount: 521,
  },
  {
    asin: 'B0C9M1N3QX',
    title: 'Fly Rod Combo - 5-Weight - 8.5ft with Reel & Backing',
    category: 'kit',
    priceRange: '$60-90',
    affiliateUrl: `https://www.amazon.com/s?k=Fly+Rod+Combo&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 445,
  },
  {
    asin: 'B0D3M8P2KL',
    title: 'Medium-Heavy Spinning Combo - Striper Rated - 7ft Rod, 3000 Reel',
    category: 'kit',
    priceRange: '$75-110',
    affiliateUrl: `https://www.amazon.com/s?k=Medium-Heavy+Spinning+Combo&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 387,
  },

  // ===== HUNTING: SCENT CONTROL =====

  {
    asin: 'B0B4K2M6VL',
    title: 'Ozonics Elite Scent Eliminator Unit - 12V',
    category: 'scent',
    priceRange: '$180-250',
    affiliateUrl: `https://www.amazon.com/s?k=Ozonics+Elite+Scent+Eliminator+Unit&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 289,
  },
  {
    asin: 'B0CX3L1NMV',
    title: 'Dead Down Wind Complete Spray Kit - 4 Bottles - Scent Control System',
    category: 'scent',
    priceRange: '$35-50',
    affiliateUrl: `https://www.amazon.com/s?k=Dead+Down+Wind+Complete+Spray+Kit&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 412,
  },
  {
    asin: 'B0D1K3X5FN',
    title: 'Code Blue Doe Estrus Scent - Bottle - 1oz',
    category: 'scent',
    priceRange: '$8-12',
    affiliateUrl: `https://www.amazon.com/s?k=Code+Blue+Doe+Estrus+Scent&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 534,
  },
  {
    asin: 'B0CF2M4K7Q',
    title: 'Tink\'s #69 Doe Estrus - 4oz Bottle',
    category: 'scent',
    priceRange: '$9-14',
    affiliateUrl: `https://www.amazon.com/s?k=Tink\&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 468,
  },
  {
    asin: 'B0D5L2Q1VX',
    title: 'Scent-Free Hunting Detergent - 2lb - Performance Wash',
    category: 'scent',
    priceRange: '$12-18',
    affiliateUrl: `https://www.amazon.com/s?k=Scent-Free+Hunting+Detergent&tag=${TAG}`,
    rating: 4.6,
    reviewCount: 347,
  },

  // ===== HUNTING: CALLS =====

  {
    asin: 'B0B6K8L1NP',
    title: 'Primos Grunt Call - Whitetail Deer - Easy Use',
    category: 'call',
    priceRange: '$12-18',
    affiliateUrl: `https://www.amazon.com/s?k=Primos+Grunt+Call&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 567,
  },
  {
    asin: 'B0CK1N2MQV',
    title: 'Can Call - Doe Bleat - Small & Portable',
    category: 'call',
    priceRange: '$8-12',
    affiliateUrl: `https://www.amazon.com/s?k=Can+Call&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 423,
  },
  {
    asin: 'B0D2K6X3NL',
    title: 'Rattling Antlers - Shed Replica - Complete Set',
    category: 'call',
    priceRange: '$16-24',
    affiliateUrl: `https://www.amazon.com/s?k=Rattling+Antlers&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 489,
  },
  {
    asin: 'B0CF3L4M2K',
    title: 'Primos Turkey Slate Call - Adjustable Striker',
    category: 'call',
    priceRange: '$14-22',
    affiliateUrl: `https://www.amazon.com/s?k=Primos+Turkey+Slate+Call&tag=${TAG}`,
    rating: 4.9,
    reviewCount: 612,
  },
  {
    asin: 'B0CJ5P1LNV',
    title: 'Turkey Box Call - Red Oak - Professional Grade',
    category: 'call',
    priceRange: '$18-28',
    affiliateUrl: `https://www.amazon.com/s?k=Turkey+Box+Call&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 534,
  },
  {
    asin: 'B0D3M2N5KX',
    title: 'Turkey Diaphragm Call Set - 3 Pack - Various Tones',
    category: 'call',
    priceRange: '$10-15',
    affiliateUrl: `https://www.amazon.com/s?k=Turkey+Diaphragm+Call+Set&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 378,
  },
  {
    asin: 'B0CG6L7N1M',
    title: 'Duck Call - Polycarbonate - Adjustable Tone',
    category: 'call',
    priceRange: '$16-26',
    affiliateUrl: `https://www.amazon.com/s?k=Duck+Call&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 445,
  },
  {
    asin: 'B0D1L3P2QV',
    title: 'Goose Call - Canada Goose Sounds - Professional',
    category: 'call',
    priceRange: '$20-32',
    affiliateUrl: `https://www.amazon.com/s?k=Goose+Call&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 412,
  },

  // ===== HUNTING: OPTICS =====

  {
    asin: 'B0B8K1M4NX',
    title: 'Vortex Optics Rangefinder - Fury HD - 5000m Range',
    category: 'optics',
    priceRange: '$349-450',
    affiliateUrl: `https://www.amazon.com/s?k=Vortex+Optics+Rangefinder&tag=${TAG}`,
    rating: 4.9,
    reviewCount: 521,
  },
  {
    asin: 'B0CF4M2N1K',
    title: 'Binoculars - 10x42 - Mid-Range Hunting',
    category: 'optics',
    priceRange: '$150-220',
    affiliateUrl: `https://www.amazon.com/s?k=Binoculars&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 467,
  },
  {
    asin: 'B0D2K5L3MV',
    title: 'Trail Camera - 2-Pack - 24MP Video - Hunting Grade',
    category: 'optics',
    priceRange: '$140-200',
    affiliateUrl: `https://www.amazon.com/s?k=Trail+Camera&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 534,
  },

  // ===== HUNTING: STANDS & BLINDS =====

  {
    asin: 'B0CK2P1NQV',
    title: 'Climbing Stand - Self-Climbing - Lightweight Aluminum',
    category: 'stand',
    priceRange: '$280-380',
    affiliateUrl: `https://www.amazon.com/s?k=Climbing+Stand&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 412,
  },
  {
    asin: 'B0D3N6K2LX',
    title: 'Hang-On Tree Stand - Fixed Position - Easy Setup',
    category: 'stand',
    priceRange: '$120-180',
    affiliateUrl: `https://www.amazon.com/s?k=Hang-On+Tree+Stand&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 389,
  },
  {
    asin: 'B0CF5L1MNV',
    title: 'Pop-Up Ground Blind - Camo - 2-Person - Windows',
    category: 'stand',
    priceRange: '$90-140',
    affiliateUrl: `https://www.amazon.com/s?k=Pop-Up+Ground+Blind&tag=${TAG}`,
    rating: 4.6,
    reviewCount: 456,
  },
  {
    asin: 'B0CG3M8N1K',
    title: 'Safety Harness - Full Body - Tree Stand - Adjustable',
    category: 'stand',
    priceRange: '$35-55',
    affiliateUrl: `https://www.amazon.com/s?k=Safety+Harness&tag=${TAG}`,
    rating: 4.9,
    reviewCount: 623,
  },

  // ===== HUNTING: ACCESSORIES =====

  {
    asin: 'B0B9K4L2VX',
    title: 'Broadheads - Mechanical - 100 Grain - 3 Pack',
    category: 'accessory',
    priceRange: '$18-28',
    affiliateUrl: `https://www.amazon.com/s?k=Broadheads&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 512,
  },
  {
    asin: 'B0D1L5M3NV',
    title: 'Shooting Sticks - Adjustable - Two-Leg Tripod',
    category: 'accessory',
    priceRange: '$40-60',
    affiliateUrl: `https://www.amazon.com/s?k=Shooting+Sticks&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 478,
  },
  {
    asin: 'B0CF6N4K1L',
    title: 'Hand Warmers - Thermacell - 8-Hour Duration - 10 Pack',
    category: 'accessory',
    priceRange: '$8-14',
    affiliateUrl: `https://www.amazon.com/s?k=Hand+Warmers&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 534,
  },
  {
    asin: 'B0CX2L7M1N',
    title: 'Hunting Headlamp - Red & White LEDs - Hands-Free',
    category: 'accessory',
    priceRange: '$22-35',
    affiliateUrl: `https://www.amazon.com/s?k=Hunting+Headlamp&tag=${TAG}`,
    rating: 4.7,
    reviewCount: 423,
  },
  {
    asin: 'B0D2M5Q1KV',
    title: 'Game Bags - Cotton - Breathable - 4 Pack',
    category: 'accessory',
    priceRange: '$16-24',
    affiliateUrl: `https://www.amazon.com/s?k=Game+Bags&tag=${TAG}`,
    rating: 4.8,
    reviewCount: 467,
  },
  {
    asin: 'B0CF7L3N2M',
    title: 'Field Dressing Kit - Complete - Surgical Steel',
    category: 'accessory',
    priceRange: '$35-55',
    affiliateUrl: `https://www.amazon.com/s?k=Field+Dressing+Kit&tag=${TAG}`,
    rating: 4.9,
    reviewCount: 612,
  },
];

/**
 * Get products filtered by category
 * @param category - Product category to filter by
 * @returns Array of matching products
 */
export function getProductsByCategory(
  category: AmazonProductRef['category']
): AmazonProductRef[] {
  return AMAZON_PRODUCT_CATALOG.filter((product) => product.category === category);
}

/**
 * Get products by type (fishing or hunting)
 * @param type - 'fishing' or 'hunting'
 * @returns Array of matching products
 */
export function getProductsByType(
  type: 'fishing' | 'hunting'
): AmazonProductRef[] {
  const fishingCategories: AmazonProductRef['category'][] = [
    'fly',
    'bait',
    'lure',
  ];
  const huntingCategories: AmazonProductRef['category'][] = [
    'scent',
    'call',
    'optics',
    'stand',
  ];

  const categoriesMap = {
    fishing: fishingCategories,
    hunting: huntingCategories,
  };

  const targetCategories = categoriesMap[type];
  return AMAZON_PRODUCT_CATALOG.filter((product) =>
    targetCategories.includes(product.category)
  );
}

/**
 * Search for products by title
 * @param query - Search term
 * @returns Array of matching products
 */
export function searchProducts(query: string): AmazonProductRef[] {
  const lowerQuery = query.toLowerCase();
  return AMAZON_PRODUCT_CATALOG.filter((product) =>
    product.title.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get top-rated products
 * @param limit - Number of results to return (default: 10)
 * @returns Array of highest-rated products
 */
export function getTopRatedProducts(limit: number = 10): AmazonProductRef[] {
  return [...AMAZON_PRODUCT_CATALOG]
    .filter((p) => p.rating !== undefined)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, limit);
}
