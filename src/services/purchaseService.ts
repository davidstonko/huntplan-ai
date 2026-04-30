/**
 * @file purchaseService.ts
 * @description RevenueCat integration for MDHuntFishOutdoors subscription management.
 * Handles in-app purchases, subscription tiers, and entitlement checks.
 *
 * Subscription Tiers:
 * - Free: Core features (maps, regulations, AI chat, basic scout)
 * - Pro ($4.99/mo or $39.99/yr): Unlimited scout plans, trip planners, offline maps, ad-free
 * - Team ($9.99/mo or $79.99/yr): Pro + Deer Camp sync, Honey Hole sharing, real-time collab
 *
 * @module services/purchaseService
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── RevenueCat Types ─────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'team';

export interface PurchasePackage {
  id: string;
  identifier: string;
  packageType: 'monthly' | 'annual' | 'lifetime';
  tier: SubscriptionTier;
  title: string;
  description: string;
  price: string;
  pricePerMonth: number;
  currencyCode: string;
  introductoryPrice?: string;
  introductoryPricePeriod?: string;
}

export interface CustomerInfo {
  userId: string;
  originalApplicationVersion: string;
  firstSeen: string;
  latestAppleId?: string;
  entitlements: Entitlements;
  activeSubscriptions: string[];
  allPurchasedProductIds: string[];
  nonConsumablePurchases: string[];
  managementURL?: string;
  requestDate: string;
}

export interface Entitlements {
  active: EntitlementInfo[];
  all: EntitlementInfo[];
}

export interface EntitlementInfo {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  billingIssueDetected: boolean;
  unsubscribeDetectedAt?: string;
  expirationDate?: string;
  latestPurchaseDate?: string;
  originalPurchaseDate?: string;
  purchaseDateMillis: number;
  expirationDateMillis?: number;
  store: 'app_store' | 'play_store' | 'stripe' | 'promotional';
  periodType: 'normal' | 'trial' | 'intro';
  isSandbox: boolean;
  originalTransactionId?: string;
  transactionId?: string;
  presentedOfferingId?: string;
  offeringId?: string;
}

// ─── Feature Gates ───────────────────────────────────────────────

export const FEATURE_GATES: Record<string, SubscriptionTier> = {
  'map_basic': 'free',
  'regulations': 'free',
  'ai_chat_basic': 'free',
  'scout_basic': 'free',           // 3 plans max
  'scout_unlimited': 'pro',        // unlimited plans
  'trip_planner': 'pro',
  'offline_maps': 'pro',
  'ad_free': 'pro',
  'gear_affiliate': 'free',        // affiliate links always free (revenue source)
  'deer_camp_sync': 'team',
  'honey_hole_sharing': 'team',
  'real_time_collab': 'team',
  'photo_upload': 'team',
  'export_gpx': 'pro',
  'state_packs': 'pro',
};

// ─── Storage Keys ───────────────────────────────────────────────

const STORAGE_KEYS = {
  customerInfo: '@purchase_customer_info',
  cachedEntitlement: '@purchase_cached_entitlement',
  lastUpdate: '@purchase_last_update',
  userTier: '@purchase_user_tier',
};

// ─── RevenueCat SDK Wrapper ──────────────────────────────────────
// Actual react-native-purchases SDK import; fallback if not installed

let RCPurchases: any = null;

try {
  RCPurchases = require('react-native-purchases');
} catch {
  if (__DEV__) console.warn('[Purchase] react-native-purchases not installed; using fallback');
}

// ─── Initialization ──────────────────────────────────────────────

/**
 * Initialize RevenueCat on app launch.
 * Should be called from App.tsx during onboarding flow.
 *
 * @param apiKey RevenueCat API key for iOS
 * @returns Promise resolving to the initialized customer info, or null if SDK unavailable
 */
export async function initializePurchases(apiKey: string): Promise<CustomerInfo | null> {
  try {
    if (!RCPurchases) {
      if (__DEV__) console.warn('[Purchase] SDK not available; defaulting to free tier');
      await cacheUserTier('free');
      return null;
    }

    // Configure RevenueCat
    await RCPurchases.default.configure({
      apiKey,
      appUserID: undefined, // Let RC generate deviceID
      observerMode: false,
      shouldShowInAppMessagesAutomatically: true,
    });

    // Fetch current customer info
    const customerInfo = await getCustomerInfo();
    return customerInfo;
  } catch (error) {
    if (__DEV__) console.error('[Purchase] Init failed:', error);
    return null;
  }
}

/**
 * Get the current customer info from RevenueCat or cache.
 * This includes active entitlements, subscription status, and purchase history.
 *
 * @returns Promise resolving to CustomerInfo, or null if unavailable
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    if (!RCPurchases) {
      // Try to use cached value
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.customerInfo);
      return cached ? JSON.parse(cached) : null;
    }

    const customerInfo = await RCPurchases.default.getCustomerInfo();

    // Cache locally for offline access
    await AsyncStorage.setItem(STORAGE_KEYS.customerInfo, JSON.stringify(customerInfo));
    await AsyncStorage.setItem(STORAGE_KEYS.lastUpdate, new Date().toISOString());

    return customerInfo;
  } catch (error) {
    if (__DEV__) console.error('[Purchase] Get customer info failed:', error);
    // Fall back to cached value
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.customerInfo);
    return cached ? JSON.parse(cached) : null;
  }
}

/**
 * Get a list of available packages (products) for purchase.
 * Fetches from RevenueCat or returns cached/hardcoded options.
 *
 * @returns Promise resolving to array of PurchasePackage
 */
export async function getAvailablePackages(): Promise<PurchasePackage[]> {
  try {
    if (!RCPurchases) {
      // Return hardcoded packages for development/fallback
      return getHardcodedPackages();
    }

    const offerings = await RCPurchases.default.getOfferings();
    const packages: PurchasePackage[] = [];

    if (offerings.current) {
      offerings.current.availablePackages.forEach((pkg: any) => {
        packages.push(mapRevenueCatPackage(pkg));
      });
    }

    return packages;
  } catch (error) {
    if (__DEV__) console.error('[Purchase] Get packages failed:', error);
    return getHardcodedPackages();
  }
}

/**
 * Trigger a purchase flow for a specific package.
 *
 * @param packageId RevenueCat package identifier
 * @returns Promise resolving to CustomerInfo if successful
 */
export async function purchasePackage(packageId: string): Promise<CustomerInfo | null> {
  try {
    if (!RCPurchases) {
      console.warn('[Purchase] Cannot purchase; SDK not available');
      return null;
    }

    const packages = await getAvailablePackages();
    const targetPackage = packages.find(p => p.identifier === packageId);

    if (!targetPackage) {
      throw new Error(`Package ${packageId} not found`);
    }

    // Trigger the purchase flow
    const customerInfo = await RCPurchases.default.purchasePackage(targetPackage);

    // Cache the updated info
    await AsyncStorage.setItem(STORAGE_KEYS.customerInfo, JSON.stringify(customerInfo));
    await cacheUserTier(await determineUserTier(customerInfo));

    return customerInfo;
  } catch (error: any) {
    if (__DEV__) console.error('[Purchase] Purchase failed:', error);
    // User may have cancelled
    if (error.code === 'PurchaseCancelledError') {
      if (__DEV__) console.log('[Purchase] User cancelled purchase');
      return null;
    }
    throw error;
  }
}

/**
 * Restore previous purchases. Call when user reinstalls app or switches device.
 *
 * @returns Promise resolving to CustomerInfo with restored entitlements
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    if (!RCPurchases) {
      console.warn('[Purchase] Cannot restore; SDK not available');
      return null;
    }

    const customerInfo = await RCPurchases.default.restoreTransactions();

    // Cache the updated info
    await AsyncStorage.setItem(STORAGE_KEYS.customerInfo, JSON.stringify(customerInfo));
    await cacheUserTier(await determineUserTier(customerInfo));

    return customerInfo;
  } catch (error) {
    if (__DEV__) console.error('[Purchase] Restore purchases failed:', error);
    return null;
  }
}

// ─── Entitlement Checking ─────────────────────────────────────────

/**
 * Determine the current user's subscription tier based on active entitlements.
 *
 * @param customerInfo Optional customer info; if not provided, will fetch
 * @returns Promise resolving to the user's current tier: 'free' | 'pro' | 'team'
 */
export async function getUserTier(customerInfo?: CustomerInfo): Promise<SubscriptionTier> {
  try {
    const info = customerInfo || (await getCustomerInfo());

    if (!info) {
      return 'free';
    }

    const tier = await determineUserTier(info);
    await cacheUserTier(tier);
    return tier;
  } catch (error) {
    if (__DEV__) console.error('[Purchase] Get user tier failed:', error);
    // Fall back to cached tier
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.userTier);
    return (cached as SubscriptionTier) || 'free';
  }
}

/**
 * Check if a specific feature is available for the current user.
 * Uses cached tier for offline access.
 *
 * @param feature Feature key from FEATURE_GATES
 * @returns Promise resolving to boolean
 */
export async function checkEntitlement(feature: string): Promise<boolean> {
  try {
    const requiredTier = FEATURE_GATES[feature];
    if (!requiredTier) {
      if (__DEV__) console.warn(`[Purchase] Unknown feature: ${feature}`);
      return false;
    }

    const userTier = await getUserTier();
    return tierHasAccess(userTier, requiredTier);
  } catch (error) {
    if (__DEV__) console.error('[Purchase] Check entitlement failed:', error);
    return false;
  }
}

/**
 * Check multiple features at once and return a map of results.
 *
 * @param features Array of feature keys
 * @returns Promise resolving to Record<feature, boolean>
 */
export async function checkEntitlements(features: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  const userTier = await getUserTier();

  features.forEach(feature => {
    const requiredTier = FEATURE_GATES[feature];
    results[feature] = requiredTier ? tierHasAccess(userTier, requiredTier) : false;
  });

  return results;
}

// ─── Subscription Management ──────────────────────────────────────

/**
 * Get the subscription status for a specific entitlement.
 * Returns null if user doesn't have the entitlement.
 *
 * @param entitlementId The entitlement identifier
 * @returns Promise resolving to EntitlementInfo or null
 */
export async function getEntitlementStatus(entitlementId: string): Promise<EntitlementInfo | null> {
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return null;

    const entitlements = customerInfo.entitlements.all || [];
    return entitlements.find(e => e.identifier === entitlementId) || null;
  } catch (error) {
    if (__DEV__) console.error('[Purchase] Get entitlement status failed:', error);
    return null;
  }
}

/**
 * Check if the user has an active subscription (any tier above free).
 *
 * @returns Promise resolving to boolean
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const tier = await getUserTier();
  return tier !== 'free';
}

/**
 * Get the management URL for the user's Apple subscriptions (open in browser).
 *
 * @returns Promise resolving to URL string, or null if unavailable
 */
export async function getManagementURL(): Promise<string | null> {
  try {
    const customerInfo = await getCustomerInfo();
    return customerInfo?.managementURL || null;
  } catch (error) {
    if (__DEV__) console.error('[Purchase] Get management URL failed:', error);
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Determine tier from entitlements.
 * Hierarchy: Team > Pro > Free
 */
async function determineUserTier(customerInfo: CustomerInfo): Promise<SubscriptionTier> {
  if (!customerInfo?.entitlements?.active) {
    return 'free';
  }

  const activeIds = customerInfo.entitlements.active.map(e => e.identifier);

  // Check for team (includes all pro features)
  if (activeIds.includes('entitlement_team')) {
    return 'team';
  }

  // Check for pro
  if (activeIds.includes('entitlement_pro')) {
    return 'pro';
  }

  return 'free';
}

/**
 * Check if a tier has access to a required tier.
 * Hierarchy: free < pro < team
 */
function tierHasAccess(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const tierRank = { free: 0, pro: 1, team: 2 };
  return tierRank[userTier] >= tierRank[requiredTier];
}

/**
 * Map RevenueCat package to our PurchasePackage type.
 */
function mapRevenueCatPackage(rcPackage: any): PurchasePackage {
  const product = rcPackage.product;
  const packageType = rcPackage.packageType as 'monthly' | 'annual' | 'lifetime';

  // Determine tier from package identifier
  let tier: SubscriptionTier = 'free';
  if (rcPackage.identifier.includes('pro')) {
    tier = 'pro';
  } else if (rcPackage.identifier.includes('team')) {
    tier = 'team';
  }

  return {
    id: rcPackage.id,
    identifier: rcPackage.identifier,
    packageType,
    tier,
    title: product.title,
    description: product.description,
    price: product.priceString,
    pricePerMonth: calculateMonthlyPrice(product.price, packageType),
    currencyCode: product.currencyCode,
    introductoryPrice: product.introductoryPrice?.priceString,
    introductoryPricePeriod: product.introductoryPrice?.periodNumberOfUnits + product.introductoryPrice?.periodUnit,
  };
}

/**
 * Calculate effective monthly price for comparison.
 */
function calculateMonthlyPrice(totalPrice: number, packageType: string): number {
  switch (packageType) {
    case 'monthly':
      return totalPrice;
    case 'annual':
      return totalPrice / 12;
    case 'lifetime':
      return totalPrice / 60; // Amortized over 5 years
    default:
      return totalPrice;
  }
}

/**
 * Get hardcoded packages for development/fallback.
 */
function getHardcodedPackages(): PurchasePackage[] {
  return [
    {
      id: 'monthly_pro',
      identifier: 'com.davidstonko.huntmaryland.pro.monthly',
      packageType: 'monthly',
      tier: 'pro',
      title: 'Pro Monthly',
      description: 'Unlimited plans, offline maps, ad-free',
      price: '$4.99',
      pricePerMonth: 4.99,
      currencyCode: 'USD',
    },
    {
      id: 'annual_pro',
      identifier: 'com.davidstonko.huntmaryland.pro.annual',
      packageType: 'annual',
      tier: 'pro',
      title: 'Pro Annual',
      description: 'Save 33% with annual plan',
      price: '$39.99',
      pricePerMonth: 3.33,
      currencyCode: 'USD',
    },
    {
      id: 'monthly_team',
      identifier: 'com.davidstonko.huntmaryland.team.monthly',
      packageType: 'monthly',
      tier: 'team',
      title: 'Team Monthly',
      description: 'Pro + Deer Camp sync, real-time collaboration',
      price: '$9.99',
      pricePerMonth: 9.99,
      currencyCode: 'USD',
    },
    {
      id: 'annual_team',
      identifier: 'com.davidstonko.huntmaryland.team.annual',
      packageType: 'annual',
      tier: 'team',
      title: 'Team Annual',
      description: 'Save 33% with annual plan',
      price: '$79.99',
      pricePerMonth: 6.67,
      currencyCode: 'USD',
    },
  ];
}

/**
 * Cache user tier locally for offline access.
 */
async function cacheUserTier(tier: SubscriptionTier): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.userTier, tier);
  } catch (error) {
    if (__DEV__) console.error('[Purchase] Cache user tier failed:', error);
  }
}

/**
 * Reset all cached purchase data (for debugging or logout).
 */
export async function clearPurchaseCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.customerInfo,
      STORAGE_KEYS.cachedEntitlement,
      STORAGE_KEYS.lastUpdate,
      STORAGE_KEYS.userTier,
    ]);
  } catch (error) {
    if (__DEV__) console.error('[Purchase] Clear cache failed:', error);
  }
}
