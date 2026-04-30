/**
 * amazonAffiliateService.ts — Amazon affiliate link generation, product catalog search, and tracking
 *
 * Handles:
 * - Affiliate URL generation with associate tag
 * - Local product catalog search (keyword, category, price)
 * - Product tap tracking for analytics
 * - Creators API client stub (activates after 10 qualifying sales)
 * - FTC disclosure text export
 * - Opening products in Amazon app or browser
 *
 * Used by: AI chat gear recommendations, Resources tab gear guides, Deer Camp kit builders
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { AmazonProductRef } from '../types/gear';
import { AMAZON_PRODUCT_CATALOG } from '../data/amazonProductCatalog';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * MDHuntFishOutdoors Amazon Associate ID (tag)
 * Registered with Amazon Associates Program
 */
export const ASSOCIATE_TAG = 'mdoutdoors1-20';

/**
 * FTC-required affiliate disclosure text
 * Must be prominently displayed whenever affiliate links are shown
 */
export const FTC_DISCLOSURE =
  'As an Amazon Associate, MDHuntFishOutdoors earns from qualifying purchases. Pricing and availability subject to change.';

/**
 * AsyncStorage key for product tap records
 */
const PRODUCT_TAPS_KEY = '@amazon_product_taps';

/**
 * Minimum qualifying sales needed to activate Creators API
 */
const CREATORS_API_THRESHOLD = 10;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Recorded tap event for a product link
 * Used for analytics and recommendation ranking
 */
export interface ProductTapRecord {
  /** Amazon Standard Identification Number */
  asin: string;
  /** Product title from catalog */
  title: string;
  /** ISO timestamp of when link was tapped */
  timestamp: string;
  /** Context where link was tapped: gear guide, AI chat, resource link, kit builder */
  source: 'gear_guide' | 'ai_chat' | 'resources' | 'kit';
  /** Optional target species for contextual analytics */
  species?: string;
  /** Optional month (1-12) for seasonal pattern analysis */
  month?: number;
}

/**
 * Creators API OAuth configuration (Phase 2)
 * Not used until 10 qualifying sales are recorded
 */
interface CreatorsApiConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: number;
}

// =============================================================================
// AFFILIATE URL GENERATION
// =============================================================================

/**
 * Generate an affiliate URL for an Amazon product by ASIN
 *
 * Format: https://www.amazon.com/dp/{asin}?tag={ASSOCIATE_TAG}
 *
 * @param asin — Amazon Standard Identification Number
 * @returns Full affiliate URL with associate tag
 */
export function generateAffiliateUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${ASSOCIATE_TAG}`;
}

// =============================================================================
// PRODUCT CATALOG SEARCH
// =============================================================================

/**
 * Search the local product catalog by keyword, category, or price range
 *
 * Performs fuzzy matching on product title and category.
 * Filters can be combined (all must match).
 *
 * @param query — Search keyword(s) to match against title/category
 * @param options — Optional search filters
 * @param options.category — Filter by category (fly, bait, lure, tackle, etc.)
 * @param options.maxPrice — Filter by max price (parsed from priceRange)
 * @param options.limit — Max results to return (default: 20)
 * @returns Array of matching products
 *
 * @example
 * // Find all fly rods under $100
 * const rods = searchProducts('fly rod', { category: 'fly', maxPrice: 100, limit: 10 });
 *
 * // Find all camo clothing
 * const camo = searchProducts('camo', { category: 'clothing' });
 */
export function searchProducts(
  query: string,
  options?: {
    category?: string;
    maxPrice?: number;
    limit?: number;
  }
): AmazonProductRef[] {
  const limit = options?.limit ?? 20;
  const queryLower = query.toLowerCase();

  let results = AMAZON_PRODUCT_CATALOG.filter((product) => {
    // Keyword match on title (fuzzy)
    const titleMatch = product.title.toLowerCase().includes(queryLower);

    // Category filter
    const categoryMatch = !options?.category || product.category === options.category;

    // Price filter (parse priceRange string like "$8-15" and check upper bound)
    let priceMatch = true;
    if (options?.maxPrice) {
      const priceUpper = extractMaxPrice(product.priceRange);
      priceMatch = priceUpper <= options.maxPrice;
    }

    return titleMatch && categoryMatch && priceMatch;
  });

  return results.slice(0, limit);
}

/**
 * Get products by their ASINs
 *
 * @param asins — Array of Amazon Standard Identification Numbers
 * @returns Array of matching products (missing ASINs are omitted)
 */
export function getProductsByAsins(asins: string[]): AmazonProductRef[] {
  const asinSet = new Set(asins);
  return AMAZON_PRODUCT_CATALOG.filter((product) => asinSet.has(product.asin));
}

/**
 * Extract the maximum price from a price range string
 * E.g., "$8-15" → 15, "$30" → 30
 *
 * @param priceRange — Price range string like "$8-15" or "$30"
 * @returns Maximum price as number
 */
function extractMaxPrice(priceRange: string): number {
  const match = priceRange.match(/\$(\d+)(?:-|$)/g);
  if (!match || match.length === 0) return 0;

  const prices = match.map((m) => parseInt(m.replace(/\$/g, ''), 10));
  return Math.max(...prices);
}

// =============================================================================
// PRODUCT TAP TRACKING & ANALYTICS
// =============================================================================

/**
 * Record a product link tap for analytics
 *
 * Stores tap record in AsyncStorage for local analysis and backend sync.
 * Used to track popular products, seasonal trends, and ai chat effectiveness.
 *
 * @param asin — Amazon Standard Identification Number
 * @param context — Tap context for analytics
 * @param context.source — Where the tap came from
 * @param context.species — Optional target species (striped_bass, whitetail, etc.)
 * @param context.month — Optional month (1-12) for seasonal analysis
 *
 * @example
 * // User tapped a fly fishing kit from AI chat
 * await trackProductTap('B0ABCD1234', {
 *   source: 'ai_chat',
 *   species: 'striped_bass',
 *   month: 5,
 * });
 */
export async function trackProductTap(
  asin: string,
  context: {
    source: 'gear_guide' | 'ai_chat' | 'resources' | 'kit';
    species?: string;
    month?: number;
  }
): Promise<void> {
  try {
    // Find product in catalog
    const product = AMAZON_PRODUCT_CATALOG.find((p) => p.asin === asin);
    if (!product) {
      console.warn(`[amazonAffiliateService] Product ASIN not found: ${asin}`);
      return;
    }

    // Create tap record
    const record: ProductTapRecord = {
      asin,
      title: product.title,
      timestamp: new Date().toISOString(),
      source: context.source,
      species: context.species,
      month: context.month,
    };

    // Append to tap history
    const existing = await AsyncStorage.getItem(PRODUCT_TAPS_KEY);
    const taps: ProductTapRecord[] = existing ? JSON.parse(existing) : [];
    taps.push(record);

    // Keep last 1000 taps to avoid unbounded growth
    const trimmed = taps.slice(-1000);
    await AsyncStorage.setItem(PRODUCT_TAPS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('[amazonAffiliateService] Failed to track product tap:', error);
  }
}

/**
 * Retrieve all recorded product tap analytics
 *
 * @returns Array of ProductTapRecord, ordered by timestamp (oldest first)
 *
 * @example
 * const taps = await getTapAnalytics();
 * console.log(`Total taps: ${taps.length}`);
 * // Group by product for popularity ranking
 * const byProduct = {};
 * taps.forEach(tap => {
 *   byProduct[tap.asin] = (byProduct[tap.asin] || 0) + 1;
 * });
 */
export async function getTapAnalytics(): Promise<ProductTapRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(PRODUCT_TAPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[amazonAffiliateService] Failed to retrieve tap analytics:', error);
    return [];
  }
}

// =============================================================================
// OPEN PRODUCT ON AMAZON
// =============================================================================

/**
 * Open a product on Amazon (uses Amazon app if installed, falls back to browser)
 *
 * Attempts to open the Amazon app via deep link. If not installed,
 * falls back to opening the affiliate URL in the default web browser.
 *
 * @param asin — Amazon Standard Identification Number
 * @param context — Optional tracking context
 *
 * @example
 * // Open product and track the tap
 * await trackProductTap(asin, { source: 'gear_guide' });
 * await openProductOnAmazon(asin);
 */
export async function openProductOnAmazon(
  asin: string,
  context?: {
    source?: string;
  }
): Promise<void> {
  try {
    // Try Amazon app deep link first
    const amazonAppUrl = `amazon://dp/${asin}`;
    const canOpen = await Linking.canOpenURL(amazonAppUrl);

    if (canOpen) {
      await Linking.openURL(amazonAppUrl);
    } else {
      // Fall back to browser
      const webUrl = generateAffiliateUrl(asin);
      await Linking.openURL(webUrl);
    }
  } catch (error) {
    console.error('[amazonAffiliateService] Failed to open product:', error);
  }
}

// =============================================================================
// CREATORS API (Phase 2 — Stubbed)
// =============================================================================

/**
 * Check if Creators API is available
 *
 * Returns true if 10+ qualifying sales have been recorded.
 * Once available, Creators API allows fetching live product data
 * and real-time search capabilities.
 *
 * @returns true if API is available, false otherwise
 */
export function isCreatorsApiAvailable(): boolean {
  // TODO: Implement qualifying sales counter in Phase 2
  // For now, always return false (stubbed)
  const DEMO_MODE = false;
  if (DEMO_MODE) {
    console.log('[amazonAffiliateService] Creators API available (demo mode)');
    return true;
  }
  return false;
}

/**
 * Fetch live product data from Amazon Creators API (Phase 2)
 *
 * Currently stubbed — will be activated after 10 qualifying sales.
 * Returns data from local catalog for now.
 *
 * @param asin — Amazon Standard Identification Number
 * @returns Product data with live pricing/reviews, or null if not found
 *
 * @note Phase 2: Implement OAuth 2.0 token refresh and API client
 */
export async function fetchLiveProductData(asin: string): Promise<AmazonProductRef | null> {
  if (!isCreatorsApiAvailable()) {
    console.log(
      '[amazonAffiliateService] Creators API not available yet. Using local catalog data.'
    );
    return AMAZON_PRODUCT_CATALOG.find((p) => p.asin === asin) || null;
  }

  try {
    // TODO: Phase 2 implementation
    // - Refresh OAuth token if needed
    // - Call Creators API /products/{asin} endpoint
    // - Return live pricing and review data
    console.log('[amazonAffiliateService] Fetching live data from Creators API...');
    return null;
  } catch (error) {
    console.error('[amazonAffiliateService] Creators API fetch failed:', error);
    // Fall back to local catalog
    return AMAZON_PRODUCT_CATALOG.find((p) => p.asin === asin) || null;
  }
}

/**
 * Search Amazon catalog via Creators API (Phase 2)
 *
 * Currently stubbed — uses local catalog for search.
 * Will be upgraded to real-time search via Creators API in Phase 2.
 *
 * @param keywords — Search query
 * @param category — Optional category filter
 * @returns Array of matching products
 *
 * @note Phase 2: Implement Creators API /search endpoint
 */
export async function searchAmazonCatalog(
  keywords: string,
  category?: string
): Promise<AmazonProductRef[]> {
  if (!isCreatorsApiAvailable()) {
    console.log(
      '[amazonAffiliateService] Creators API not available. Using local catalog search.'
    );
    return searchProducts(keywords, { category });
  }

  try {
    // TODO: Phase 2 implementation
    // - Call Creators API /search endpoint with keywords and category
    // - Handle pagination
    // - Return results with live data
    console.log('[amazonAffiliateService] Searching Creators API...');
    return [];
  } catch (error) {
    console.error('[amazonAffiliateService] Creators API search failed:', error);
    // Fall back to local catalog
    return searchProducts(keywords, { category });
  }
}

// =============================================================================
// FTC DISCLOSURE
// =============================================================================

/**
 * Get the required FTC affiliate disclosure text
 *
 * Returns a string that must be displayed whenever affiliate links are shown.
 * Recommended placement: footer of gear guides, below product recommendations,
 * or in a modal at app launch.
 *
 * @returns FTC-compliant disclosure string
 *
 * @example
 * import { FTC_DISCLOSURE } from '@/services/amazonAffiliateService';
 * export const GearGuideScreen = () => (
 *   <>
 *     <GearList />
 *     <Text style={{ fontSize: 12 }}>{FTC_DISCLOSURE}</Text>
 *   </>
 * );
 */
export function getAffiliateDisclosure(): string {
  return FTC_DISCLOSURE;
}
