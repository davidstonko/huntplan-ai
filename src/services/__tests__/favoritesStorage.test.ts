/**
 * favoritesStorage.test.ts — Contract tests for the favorites
 * AsyncStorage layer. Mirrors userWaypointStorage.test.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAll,
  saveAll,
  clearAll,
  __STORAGE_KEY_FOR_TESTS,
} from '../favoritesStorage';
import type { FavoriteRef } from '../../types/favorite';

function fav(overrides: Partial<FavoriteRef> = {}): FavoriteRef {
  return {
    kind: 'waypoint',
    id: 'wp-1',
    addedAt: '2026-04-24T10:00:00.000Z',
    ...overrides,
  };
}

describe('favoritesStorage', () => {
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

    it('returns an empty array when shape is missing favorites array', async () => {
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
        JSON.stringify({ schemaVersion: 999, favorites: [fav()] }),
      );
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await loadAll();
      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('saveAll', () => {
    it('round-trips a list of favorites', async () => {
      const rows = [
        fav({ kind: 'waypoint', id: 'a' }),
        fav({ kind: 'journal', id: 'b' }),
      ];
      const ok = await saveAll(rows);
      expect(ok).toBe(true);

      const reloaded = await loadAll();
      expect(reloaded).toHaveLength(2);
      expect(reloaded[0].id).toBe('a');
      expect(reloaded[1].kind).toBe('journal');
    });

    it('wraps the payload with the current schemaVersion', async () => {
      await saveAll([fav()]);
      const raw = await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS);
      const parsed = JSON.parse(raw as string);
      expect(parsed.schemaVersion).toBe(1);
      expect(Array.isArray(parsed.favorites)).toBe(true);
    });

    it('persists an empty array (used by clearAllFavorites)', async () => {
      await saveAll([fav()]);
      await saveAll([]);
      const reloaded = await loadAll();
      expect(reloaded).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('removes the storage key so loadAll returns []', async () => {
      await saveAll([fav()]);
      const ok = await clearAll();
      expect(ok).toBe(true);

      const reloaded = await loadAll();
      expect(reloaded).toEqual([]);
    });
  });
});
