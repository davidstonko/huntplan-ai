/**
 * userWaypointStorage.test.ts — Contract tests for the AsyncStorage layer.
 *
 * AsyncStorage is mocked globally in jest.setup.js. These tests validate:
 *   - Round-trip: saveAll → loadAll returns the same rows
 *   - Defensive reads: null / malformed JSON / non-array shape / future
 *     schema version all return [] instead of throwing
 *   - clearAll removes the key so the next loadAll starts clean
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAll,
  saveAll,
  clearAll,
  __STORAGE_KEY_FOR_TESTS,
} from '../userWaypointStorage';
import { UserWaypoint } from '../../types/userWaypoint';

function sampleWaypoint(overrides: Partial<UserWaypoint> = {}): UserWaypoint {
  return {
    id: 'wp-1',
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
    mode: 'hunt',
    category: 'tree-stand',
    title: 'North Oak Stand',
    notes: 'West wind only; creek below.',
    lat: 39.2,
    lng: -77.1,
    photoUris: [],
    ...overrides,
  };
}

describe('userWaypointStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('loadAll', () => {
    it('returns an empty array on a fresh install (no key)', async () => {
      const result = await loadAll();
      expect(result).toEqual([]);
    });

    it('returns an empty array when stored JSON is malformed', async () => {
      await AsyncStorage.setItem(__STORAGE_KEY_FOR_TESTS, '{not valid json');
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await loadAll();
      expect(result).toEqual([]);
      warnSpy.mockRestore();
    });

    it('returns an empty array when the shape is missing the waypoints array', async () => {
      await AsyncStorage.setItem(
        __STORAGE_KEY_FOR_TESTS,
        JSON.stringify({ schemaVersion: 1 }),
      );
      const result = await loadAll();
      expect(result).toEqual([]);
    });

    it('returns an empty array when the top-level value is null', async () => {
      await AsyncStorage.setItem(__STORAGE_KEY_FOR_TESTS, 'null');
      const result = await loadAll();
      expect(result).toEqual([]);
    });

    it('returns an empty array (and warns) when schemaVersion is newer than current', async () => {
      await AsyncStorage.setItem(
        __STORAGE_KEY_FOR_TESTS,
        JSON.stringify({ schemaVersion: 999, waypoints: [sampleWaypoint()] }),
      );
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await loadAll();
      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('saveAll', () => {
    it('round-trips a list of waypoints', async () => {
      const rows = [sampleWaypoint({ id: 'a' }), sampleWaypoint({ id: 'b', mode: 'fish', category: 'hole' })];
      const ok = await saveAll(rows);
      expect(ok).toBe(true);

      const reloaded = await loadAll();
      expect(reloaded).toHaveLength(2);
      expect(reloaded[0].id).toBe('a');
      expect(reloaded[1].id).toBe('b');
      expect(reloaded[1].mode).toBe('fish');
    });

    it('wraps the payload with the current schemaVersion', async () => {
      await saveAll([sampleWaypoint()]);
      const raw = await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS);
      const parsed = JSON.parse(raw as string);
      expect(parsed.schemaVersion).toBe(1);
      expect(Array.isArray(parsed.waypoints)).toBe(true);
    });

    it('persists an empty array (used for clearAllWaypoints)', async () => {
      await saveAll([sampleWaypoint()]);
      await saveAll([]);
      const reloaded = await loadAll();
      expect(reloaded).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('removes the storage key so loadAll returns []', async () => {
      await saveAll([sampleWaypoint()]);
      const ok = await clearAll();
      expect(ok).toBe(true);

      const reloaded = await loadAll();
      expect(reloaded).toEqual([]);
    });
  });
});
