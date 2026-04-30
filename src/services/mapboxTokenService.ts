/**
 * mapboxTokenService — backend-served Mapbox access token with
 * AsyncStorage cache + offline fallback.
 *
 * Why this exists:
 *   The hardcoded fallback in `config.ts` works but creates an ops
 *   hazard — a leaked token can't be revoked without an app update.
 *   This service fetches a fresh token from the backend at boot, caches
 *   it for 24h, and updates `MapboxGL.setAccessToken` mid-flight when a
 *   newer token arrives.
 *
 * Flow on boot:
 *   1. Read cached token from AsyncStorage. If fresh (< 24h old) and
 *      valid, set it immediately so the first map render uses it.
 *   2. Fire a background `GET /api/v1/config/mapbox-token`. If it
 *      succeeds, cache the new token + call `MapboxGL.setAccessToken`
 *      so subsequent map ops use it.
 *   3. If the fetch fails (offline / backend down), keep using the
 *      cached value or fall back to the hardcoded `MAPBOX_ACCESS_TOKEN`
 *      from config.ts. App still works fully offline.
 *
 * Token rotation strategy (ops):
 *   - Bump MAPBOX_ACCESS_TOKEN env var on Render
 *   - Within 24h every active client picks up the new token on next
 *     foreground / boot
 *   - Old token continues working until Mapbox-side revocation
 *
 * Added 2026-04-27.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import MapboxGL from '@rnmapbox/maps';
import Config, { MAPBOX_ACCESS_TOKEN, API_BASE_URL } from '../config';

const STORAGE_KEY = '@mapbox_token_cache_v1';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedToken {
  token: string;
  fetchedAt: number; // epoch ms
  ttlMs: number;
}

let activeToken = MAPBOX_ACCESS_TOKEN;

/**
 * Read the cached token from AsyncStorage. Returns the token if it's
 * still within its TTL, otherwise null.
 */
async function readCache(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached: CachedToken = JSON.parse(raw);
    if (
      typeof cached.token !== 'string' ||
      typeof cached.fetchedAt !== 'number' ||
      typeof cached.ttlMs !== 'number'
    ) {
      return null;
    }
    const age = Date.now() - cached.fetchedAt;
    if (age >= cached.ttlMs) return null;
    return cached.token;
  } catch {
    return null;
  }
}

async function writeCache(token: string, ttlMs: number): Promise<void> {
  const payload: CachedToken = {
    token,
    fetchedAt: Date.now(),
    ttlMs,
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Cache write failure shouldn't crash the app — we still have the
    // token in memory for this session.
  }
}

/**
 * Fetch a fresh token from the backend. Returns null on any failure
 * (network, 5xx, malformed response). Callers must always have a
 * fallback because this WILL fail when the user is offline.
 */
async function fetchFromBackend(): Promise<{ token: string; ttlMs: number } | null> {
  try {
    const url = `${API_BASE_URL}/api/v1/config/mapbox-token`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (
      typeof json?.token !== 'string' ||
      typeof json?.suggested_refresh_seconds !== 'number'
    ) {
      return null;
    }
    return {
      token: json.token,
      ttlMs: json.suggested_refresh_seconds * 1000,
    };
  } catch {
    return null;
  }
}

/**
 * Apply a token to the running Mapbox SDK + memoize as the active
 * value. Safe to call multiple times — Mapbox handles re-set as a
 * no-op when the value matches.
 */
function applyToken(token: string): void {
  if (!token) return;
  activeToken = token;
  try {
    MapboxGL.setAccessToken(token);
  } catch {
    // setAccessToken can throw if the SDK wasn't initialized yet — that's
    // fine, the next call will succeed once the lib has loaded.
  }
}

/**
 * Public: synchronous getter for the currently-active token. Components
 * that need the token RIGHT NOW (e.g., for the geocoding API in
 * CampAreaPicker / HoneyHole) read this. Falls back to the hardcoded
 * config token until the boot fetch completes.
 */
export function getActiveMapboxToken(): string {
  return activeToken || MAPBOX_ACCESS_TOKEN;
}

/**
 * Public: initialize the token at app boot. Call from App.tsx during
 * the early-init sequence (before any map renders if possible). Two
 * phases:
 *   1. Synchronously try to apply a cached token if one exists + is
 *      fresh.
 *   2. Asynchronously fetch from the backend and apply if we got a
 *      newer / different token.
 *
 * Resolves when the boot fetch completes (or fails). Callers can fire
 * and forget — the token is auto-applied to MapboxGL.
 */
export async function initMapboxToken(): Promise<void> {
  // Phase 1 — fast cached-token path
  const cached = await readCache();
  if (cached) applyToken(cached);
  else applyToken(MAPBOX_ACCESS_TOKEN);

  // Phase 2 — refresh in the background
  const fresh = await fetchFromBackend();
  if (fresh && fresh.token !== activeToken) {
    applyToken(fresh.token);
    await writeCache(fresh.token, fresh.ttlMs);
  } else if (fresh) {
    // Token unchanged but we got a fresh issued-at; re-stamp cache
    // so the TTL window slides forward.
    await writeCache(fresh.token, fresh.ttlMs);
  }
}

/**
 * Public: clear the cached token. Useful in dev if the user manually
 * rotates a token and wants to force a re-fetch on next boot.
 */
export async function clearMapboxTokenCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Suppress the "Config import unused" complaint when we aren't reading
// any other field — the import is here for future expansion.
void Config;
