/**
 * Centralized configuration for the MDHuntFishOutdoors app.
 *
 * Manages environment variables, feature flags, and app metadata. Services
 * import this as either:
 *   import Config from '../config'           // default-export object
 *   import { APP_VERSION } from '../config'   // named exports
 *
 * Tests live in src/__tests__/config.test.ts and treat the default-exported
 * Config as the contract.
 */

// ── App version metadata ─────────────────────────────────────────
//
// Update both fields together on each App Store submission:
//   - APP_MARKETING_VERSION must match CFBundleShortVersionString in Info.plist
//   - APP_BUILD_NUMBER must match CFBundleVersion
//
export const APP_MARKETING_VERSION = '2.5.0';
export const APP_BUILD_NUMBER = '2';
export const APP_VERSION = `${APP_MARKETING_VERSION}+${APP_BUILD_NUMBER}`;

// ── App identity ─────────────────────────────────────────────────
export const APP_BUNDLE_ID = 'com.davidstonko.huntmaryland';
export const APP_STORE_ID = '6761347484';
export const WEBSITE_URL = 'https://davidstonko.github.io/huntmaryland-site';

// ── API endpoints ────────────────────────────────────────────────
//
// 2026-04-26 (fork merge): pointed at the Render-hosted backend in BOTH
// dev and prod. The previous `__DEV__ ? localhost : render` pattern
// silently broke every AI/auth/sync call on a fresh dev machine where
// no FastAPI process was running — the user got "Network request
// failed" with no obvious next step. To run against a local backend
// instead, set EXPO_PUBLIC_API_BASE_URL=http://localhost:8000 in your
// shell before `npx react-native start`.
//
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://huntplan-api.onrender.com';

export const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_BASE_URL || 'wss://huntplan-api.onrender.com';

// ── Mapbox ───────────────────────────────────────────────────────
//
// Token loads via react-native-dotenv from `.env` (gitignored). NO
// hardcoded fallback in source — that pattern leaked into git history
// in V2.2.0 and was scrubbed 2026-04-30. If `.env` is missing
// MAPBOX_ACCESS_TOKEN at build time, the dotenv plugin throws at import
// time (allowUndefined: false in babel.config.js), which surfaces the
// problem loudly instead of silently shipping a broken-map binary.
//
// To rotate: account.mapbox.com → Access Tokens → create new pk.* token
// scoped to maps:read / styles:read / tiles:read with URL allowlist
// `com.davidstonko.huntmaryland://*`. Update `.env` locally; never
// commit the literal value.
//
import { MAPBOX_ACCESS_TOKEN as ENV_MAPBOX_ACCESS_TOKEN } from '@env';

export const MAPBOX_ACCESS_TOKEN: string = ENV_MAPBOX_ACCESS_TOKEN;

// ── Subscriptions, crash reporting, affiliate ───────────────────
export const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
export const AMAZON_AFFILIATE_TAG = 'mdoutdoors1-20';

// ── Feature flags ────────────────────────────────────────────────
export const FEATURES = {
  REALTIME_SYNC: true,
  SOCIAL_FEATURES: true,
  PURCHASES_ENABLED: false, // Off until RevenueCat key + entitlements wired
  SENTRY_ENABLED: false,    // Off until SENTRY_DSN populated
  ANALYTICS_FLUSH: true,
  STATE_PACKS: false,       // V2.3 multi-state download — disabled until VA/PA assets ship
  WEBSOCKET_SYNC: true,
  PUSH_NOTIFICATIONS: true,
  PHOTO_UPLOAD: true,
  OFFLINE_MAPS: true,
  AI_CHAT: true,
} as const;

// ── Bundled Config object ───────────────────────────────────────
//
// 2026-04-26 (fork merge): single canonical Config default-exported here.
// Anything that says `import Config from '../config'` resolves to this file
// (Node/TS prefer `.ts` over the `config/` directory at the same path).
//
export const Config = {
  // App metadata
  APP_MARKETING_VERSION,
  APP_BUILD_NUMBER,
  APP_VERSION,
  APP_BUNDLE_ID,
  APP_STORE_ID,
  WEBSITE_URL,

  // API
  API_BASE_URL,
  WS_BASE_URL,

  // Tokens / DSNs
  MAPBOX_ACCESS_TOKEN,
  REVENUECAT_API_KEY,
  SENTRY_DSN,
  AMAZON_AFFILIATE_TAG,

  // Feature flags
  FEATURES,

  // Legacy/aliased flags retained for older services that look them up
  // directly on the Config object (e.g., Config.ENABLE_AI_CHAT).
  ENABLE_WEBSOCKET_SYNC: FEATURES.WEBSOCKET_SYNC,
  ENABLE_PUSH_NOTIFICATIONS: FEATURES.PUSH_NOTIFICATIONS,
  ENABLE_PHOTO_UPLOAD: FEATURES.PHOTO_UPLOAD,
  ENABLE_OFFLINE_MAPS: FEATURES.OFFLINE_MAPS,
  ENABLE_AI_CHAT: FEATURES.AI_CHAT,

  // Debug
  IS_DEVELOPMENT: __DEV__,
} as const;

// react-native-dotenv (allowUndefined: false) throws at import time if
// the key is missing, so reaching this file with an empty token would
// already be impossible. Kept as a defensive double-check + dev hint.
if (!MAPBOX_ACCESS_TOKEN) {
  // eslint-disable-next-line no-console
  console.warn(
    '[config] MAPBOX_ACCESS_TOKEN is empty. Check that .env defines MAPBOX_ACCESS_TOKEN — see .env.example.',
  );
}


/**
 * Helper to fetch with timeout (30s default).
 * Guards against Render backend cold-starts (~30s) and hung requests.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export default Config;