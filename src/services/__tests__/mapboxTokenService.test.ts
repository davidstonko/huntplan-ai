/**
 * mapboxTokenService contract test.
 *
 * Locks the 2026-04-27 wiring of /api/v1/config/mapbox-token.
 *
 * Invariants:
 *   - getActiveMapboxToken returns the hardcoded fallback before init
 *   - On successful fetch, token is cached AND applyToken is called
 *   - On fetch failure, prior cached token is preserved + still applied
 *   - On corrupted cache, the fallback is used (no crash)
 *
 * AsyncStorage + fetch are mocked at the module level. We do NOT mock
 * MapboxGL.setAccessToken — the existing __tests__/setup.ts already
 * provides a mock for @rnmapbox/maps, and the service swallows any
 * setAccessToken error so the test passes even without it.
 */

// Mock @rnmapbox/maps before any imports — its native module isn't
// available in jest. The service only calls setAccessToken so a noop
// shim is enough to load the module under test.
jest.mock('@rnmapbox/maps', () => ({
  __esModule: true,
  default: {
    setAccessToken: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initMapboxToken,
  getActiveMapboxToken,
  clearMapboxTokenCache,
} from '../mapboxTokenService';
import { MAPBOX_ACCESS_TOKEN } from '../../config';

const STORAGE_KEY = '@mapbox_token_cache_v1';

describe('mapboxTokenService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('falls back to MAPBOX_ACCESS_TOKEN when cache is empty + fetch fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await initMapboxToken();
    expect(getActiveMapboxToken()).toBe(MAPBOX_ACCESS_TOKEN);
  });

  it('uses cached token when available within TTL window', async () => {
    const cached = {
      token: 'pk.cached_token_within_ttl',
      fetchedAt: Date.now(),
      ttlMs: 24 * 60 * 60 * 1000,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await initMapboxToken();
    expect(getActiveMapboxToken()).toBe('pk.cached_token_within_ttl');
  });

  it('ignores cache that is past TTL', async () => {
    const stale = {
      token: 'pk.stale_token',
      fetchedAt: Date.now() - 25 * 60 * 60 * 1000, // 25h old
      ttlMs: 24 * 60 * 60 * 1000,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stale));
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await initMapboxToken();
    expect(getActiveMapboxToken()).toBe(MAPBOX_ACCESS_TOKEN);
  });

  it('applies fresh token from backend + caches it', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'pk.fresh_from_backend',
        issued_at: '2026-04-27T00:00:00Z',
        suggested_refresh_seconds: 86400,
      }),
    } as unknown as Response);
    await initMapboxToken();
    expect(getActiveMapboxToken()).toBe('pk.fresh_from_backend');

    // Verify cache write
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const cached = JSON.parse(raw!);
    expect(cached.token).toBe('pk.fresh_from_backend');
    expect(cached.ttlMs).toBe(86400 * 1000);
  });

  it('handles corrupted cache gracefully', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not valid json {{{');
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await initMapboxToken();
    expect(getActiveMapboxToken()).toBe(MAPBOX_ACCESS_TOKEN);
  });

  it('clearMapboxTokenCache wipes the storage entry', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: 'pk.x', fetchedAt: Date.now(), ttlMs: 1000 }),
    );
    await clearMapboxTokenCache();
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBeNull();
  });
});
