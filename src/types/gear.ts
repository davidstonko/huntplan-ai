/**
 * gear.ts — TypeScript type definitions for hunting and fishing gear recommendations
 *
 * Includes:
 * - Amazon product references with affiliate links
 * - Bait/fly/lure recommendations by species and region
 * - Hatch data for fly fishing (monthly insect emergence)
 * - Hunting gear recommendations
 * - Pre-built gear kits
 * - Gear recommendation engine results
 *
 * Used by AI chat recommendations, gear filters, and kit builders.
 */

/**
 * Amazon product reference with affiliate link
 * Used to surface products in gear recommendations
 */
export interface AmazonProductRef {
  /** Amazon Standard Identification Number */
  asin: string;
  /** Product name/title */
  title: string;
  /** Product category for filtering and grouping */
  category: 'fly' | 'bait' | 'lure' | 'tackle' | 'kit' | 'accessory' | 'clothing' | 'scent' | 'call' | 'optics' | 'stand' | 'decoy';
  /** Price range string, e.g. '$8-15' */
  priceRange: string;
  /** Pre-tagged Amazon affiliate link for revenue sharing */
  affiliateUrl: string;
  /** Optional product thumbnail image URL */
  imageUrl?: string;
  /** Amazon star rating (1-5) */
  rating?: number;
  /** Number of reviews */
  reviewCount?: number;
}

/**
 * Bait, fly, or lure recommendation for a specific species/region/season
 * Returned by the gear recommendation engine based on catch history
 */
export interface BaitRecommendation {
  /** Unique identifier */
  id: string;
  /** Target species: 'striped_bass', 'brown_trout', 'largemouth_bass', etc. */
  species: string;
  /** Water type: tidal (Chesapeake), nontidal (streams), or both */
  waterType: 'tidal' | 'nontidal' | 'both';
  /** Region: 'chesapeake', 'gunpowder', 'deep_creek', 'western_md', etc. */
  region: string;
  /** Months when this recommendation is effective [1-12] */
  months: number[];
  /** Fishing method: bait, fly, lure, or any */
  method: 'bait' | 'fly' | 'lure' | 'any';
  /** Array of recommended baits */
  primaryBait: string[];
  /** Array of recommended fly patterns */
  primaryFlies: string[];
  /** Array of recommended lure types/colors */
  primaryLures: string[];
  /** Conditions description, e.g. 'Best during falling tide, early morning' */
  conditions: string;
  /** Optimal water temperature range, e.g. '50-60°F' */
  waterTemp: string;
  /** Confidence level in recommendation */
  confidence: 'high' | 'medium' | 'low';
  /** Data source attribution */
  source: string;
  /** Related Amazon products for this recommendation */
  amazonProducts: AmazonProductRef[];
}

/**
 * Single month's hatch data for fly fishing
 * Tracks insect emergence patterns throughout the month
 */
export interface HatchEntry {
  /** Month number (1-12) */
  month: number;
  /** Insect common names emerging this month */
  insects: string[];
  /** Dry fly patterns to use */
  dryFlies: string[];
  /** Nymph patterns for sub-surface fishing */
  nymphs: string[];
  /** Streamer patterns for larger fish */
  streamers: string[];
  /** Terrestrial patterns (ants, beetles, grasshoppers) */
  terrestrials: string[];
  /** Additional notes on timing, water conditions, etc. */
  notes: string;
}

/**
 * Complete monthly hatch chart for a specific water body
 * Used by AI chat to provide seasonal fly fishing guidance
 */
export interface HatchChart {
  /** Water body name: 'Gunpowder Falls', 'Casselman River', 'Deep Creek Lake', etc. */
  waterBody: string;
  /** Geographic region within Maryland */
  region: string;
  /** Type of water: freestone (spring-fed), tailwater (dam-influenced), spring creek, or lake */
  waterType: 'freestone' | 'tailwater' | 'spring_creek' | 'lake';
  /** Monthly hatch entries (array of 12 months) */
  entries: HatchEntry[];
  /** Data source attribution */
  source: string;
  /** Last update date (ISO) */
  lastUpdated: string;
}

/**
 * Hunting gear recommendation for a specific species/season
 * Returned by the gear recommendation engine
 */
export interface HuntingGearRecommendation {
  /** Unique identifier */
  id: string;
  /** Target species: 'whitetail', 'turkey', 'waterfowl', 'bear' */
  species: string;
  /** Season type: 'archery_early', 'firearms', 'muzzleloader', 'late_season' */
  season: string;
  /** Months when this recommendation applies [1-12] */
  months: number[];
  /** Hunting method: archery, firearms, muzzleloader, or any */
  method: 'archery' | 'firearms' | 'muzzleloader' | 'any';
  /** Clothing and outer layer recommendations */
  clothing: GearItem[];
  /** Scent control products */
  scent: GearItem[];
  /** Calls and sounds */
  calls: GearItem[];
  /** Accessories (backpacks, rangefinders, etc.) */
  accessories: GearItem[];
  /** Conditions description for optimal use */
  conditions: string;
  /** Array of hunting tips and best practices */
  tips: string[];
  /** Related Amazon products for this recommendation */
  amazonProducts: AmazonProductRef[];
}

/**
 * Individual gear item within a recommendation or kit
 * Contains name, description, and relevance
 */
export interface GearItem {
  /** Item name */
  name: string;
  /** Description of the item and its use */
  description: string;
  /** Gear category for filtering */
  category: 'camo' | 'scent' | 'call' | 'optics' | 'stand' | 'pack' | 'clothing' | 'boot' | 'decoy' | 'blind' | 'accessory';
  /** How relevant this item is for the season/species */
  seasonalRelevance: 'high' | 'medium' | 'low';
  /** Typical price range, e.g. '$40-80' */
  priceRange: string;
}

/**
 * Pre-built, curated gear kit for a specific use case
 * E.g., 'Beginner Fly Fishing Kit', 'Late Season Deer Hunting'
 */
export interface GearKit {
  /** Unique kit identifier */
  id: string;
  /** Kit name: 'Beginner Fly Fishing Kit', 'Bay Angler Starter', etc. */
  name: string;
  /** Full description of what's included and who it's for */
  description: string;
  /** Activity mode: 'fish' or 'hunt' */
  mode: 'fish' | 'hunt';
  /** Target user profile: 'Beginner fly fisher', 'Bay angler', 'Late season deer hunter' */
  targetUser: string;
  /** Items in the kit */
  items: GearKitItem[];
  /** Total estimated price range, e.g. '$120-180' */
  totalPriceRange: string;
  /** Amazon products that make up this kit */
  amazonProducts: AmazonProductRef[];
  /** Emoji representation of kit activity (🐟, 🦌, etc.) */
  imageEmoji: string;
}

/**
 * Individual item within a GearKit
 */
export interface GearKitItem {
  /** Item name */
  name: string;
  /** Description of why this item is in the kit */
  description: string;
  /** Whether this item is required or optional */
  required: boolean;
}

/**
 * Result of a gear recommendation query
 * Returned by the gear recommendation engine based on species, region, and history
 */
export interface GearRecommendationResult {
  /** Original query parameters */
  query: {
    /** Target species */
    species: string;
    /** Optional region filter */
    region?: string;
    /** Optional method filter */
    method?: string;
    /** Current month */
    month: number;
  };
  /** Array of recommendations (BaitRecommendation or HuntingGearRecommendation) */
  recommendations: BaitRecommendation[] | HuntingGearRecommendation[];
  /** Suggested products based on recommendations */
  suggestedProducts: AmazonProductRef[];
  /** Suggested gear kits based on user profile */
  suggestedKits: GearKit[];
  /** Optional personalized note from catch/harvest log history */
  personalNote?: string;
  /** Overall confidence in this recommendation set */
  confidence: 'high' | 'medium' | 'low';
}
