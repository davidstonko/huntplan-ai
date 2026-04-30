/**
 * trackStorage.test.ts — Contract tests for the AsyncStorage layer.
 *
 * Mirrors userWaypointStorage.test.ts. Validates:
 *   - Round-trip: saveAll → loadAll returns the same rows
 *   - Defensive reads on null / malformed / missing-array / future-schema
 *   - saveDraft / loadDraft / clearDraft cycle
 *   - clearAll removes the key
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAll,
  saveAll,
  clearAll,
  saveDraft,
  loadDraft,
  clearDraft,
  __TRACKS_KEY_FOR_TESTS,
  __DRAFT_KEY_FOR_TESTS,
} from '../trackStorage';
import { RecordedTrack } from '../../types/track';

function sampleTrack(overrides: Partial<RecordedTrack> = {}): RecordedTrack {
  return {
    id: 'tr-1',
    mode: 'hunt',
    name: 'Opening-day morning',
    startedAt: '2026-04-24T12:00:00.000Z',
    endedAt: '2026-04-24T13:00:00.000Z',
    state: 'saved',
    samples: [
      { lat: 39.2, lng: -77.1, timestamp: 1_700_000_000_000 },
      { lat: 39.21, lng: -77.09, timestamp: 1_700_000_005_000 },
    ],
    distanceM: 120,
    durationSec: 5,
    elevationGainM: 0,
    ...overrides,
  };
}

describe('trackStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('loadAll', () => {
    it('returns an empty array on a fresh install', async () => {
      const result = await loadAll();
      expect(result).toEqual([]);
    });

    it('returns an empty array when stored JSON is malformed', async () => {
      await AsyncStorage.setItem(__TRACKS_KEY_FOR_TESTS, '{not valid json');
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await loadAll();
      expect(result).toEqual([]);
      warnSpy.mockRestore();
    });

    it('returns an empty array when the shape is missing the tracks array', async () => {
      await AsyncStorage.setItem(
        __TRACKS_KEY_FOR_TESTS,
        JSON.stringify({ schemaVersion: 1 }),
      );
      const result = await loadAll();
      expect(result).toEqual([]);
    });

    it('returns an empty array (and warns) when schemaVersion is newer', async () => {
      await AsyncStorage.setItem(
        __TRACKS_KEY_FOR_TESTS,
        JSON.stringify({ schemaVersion: 999, tracks: [sampleTrack()] }),
      );
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await loadAll();
      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('saveAll', () => {
    it('round-trips a list of tracks', async () => {
      const rows = [sampleTrack({ id: 'a' }), sampleTrack({ id: 'b', mode: 'fish' })];
      const ok = await saveAll(rows);
      expect(ok).toBe(true);
      const reloaded = await loadAll();
      expect(reloaded).toHaveLength(2);
      expect(reloaded[0].id).toBe('a');
      expect(reloaded[1].mode).toBe('fish');
    });

    it('wraps the payload with the current schemaVersion', async () => {
      await saveAll([sampleTrack()]);
      const raw = await AsyncStorage.getItem(__TRACKS_KEY_FOR_TESTS);
      const parsed = JSON.parse(raw as string);
      expect(parsed.schemaVersion).toBe(1);
      expect(Array.isArray(parsed.tracks)).toBe(true);
    });

    it('persists an empty array (used for clearAllTracks path)', async () => {
      await saveAll([sampleTrack()]);
      await saveAll([]);
      const reloaded = await loadAll();
      expect(reloaded).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('removes the tracks key', async () => {
      await saveAll([sampleTrack()]);
      await clearAll();
      const raw = await AsyncStorage.getItem(__TRACKS_KEY_FOR_TESTS);
      expect(raw).toBeNull();
    });
  });

  describe('draft (in-flight recording)', () => {
    it('returns null when no draft has been saved', async () => {
      const d = await loadDraft();
      expect(d).toBeNull();
    });

    it('round-trips a draft', async () => {
      const t = sampleTrack({ id: 'draft', state: 'recording' });
      await saveDraft(t);
      const d = await loadDraft();
      expect(d).not.toBeNull();
      expect(d!.id).toBe('draft');
      expect(d!.state).toBe('recording');
    });

    it('accepts null to mark "no draft"', async () => {
      await saveDraft(sampleTrack());
      await saveDraft(null);
      const d = await loadDraft();
      expect(d).toBeNull();
    });

    it('clearDraft removes the draft key', async () => {
      await saveDraft(sampleTrack());
      await clearDraft();
      const raw = await AsyncStorage.getItem(__DRAFT_KEY_FOR_TESTS);
      expect(raw).toBeNull();
    });

    it('returns null on malformed draft JSON', async () => {
      await AsyncStorage.setItem(__DRAFT_KEY_FOR_TESTS, '{{broken');
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const d = await loadDraft();
      expect(d).toBeNull();
      warnSpy.mockRestore();
    });

    it('returns null on newer-schema draft', async () => {
      await AsyncStorage.setItem(
        __DRAFT_KEY_FOR_TESTS,
        JSON.stringify({ schemaVersion: 99, draft: sampleTrack() }),
      );
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const d = await loadDraft();
      expect(d).toBeNull();
      warnSpy.mockRestore();
    });
  });
});
