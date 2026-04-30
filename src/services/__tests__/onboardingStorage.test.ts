/**
 * onboardingStorage tests — Phase A.26 onboarding tour persistence.
 * Verifies the per-mode set semantics and defensive load behavior.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSeenModes,
  hasSeenTour,
  markTourSeen,
  resetTour,
  clearAllTourState,
} from '../onboardingStorage';
import { TOUR_CONTENT, tourTitleFor } from '../onboardingTours';

const KEY = 'user_onboarding_v1';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('onboardingStorage — defensive load', () => {
  it('returns empty set on a fresh install', async () => {
    expect((await loadSeenModes()).size).toBe(0);
  });

  it('returns empty set on malformed JSON', async () => {
    await AsyncStorage.setItem(KEY, '{nope');
    expect((await loadSeenModes()).size).toBe(0);
  });

  it('returns empty set when stored value is not an array', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ hunt: true }));
    expect((await loadSeenModes()).size).toBe(0);
  });

  it('drops unknown mode strings on load', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify(['hunt', 'climb', 'fish', 42]),
    );
    const seen = await loadSeenModes();
    expect(seen.has('hunt')).toBe(true);
    expect(seen.has('fish')).toBe(true);
    expect(seen.size).toBe(2);
  });
});

describe('onboardingStorage — markTourSeen / hasSeenTour', () => {
  it('hasSeenTour false before mark, true after mark', async () => {
    expect(await hasSeenTour('hunt')).toBe(false);
    await markTourSeen('hunt');
    expect(await hasSeenTour('hunt')).toBe(true);
  });

  it('marking one mode does not affect another', async () => {
    await markTourSeen('hunt');
    expect(await hasSeenTour('hunt')).toBe(true);
    expect(await hasSeenTour('fish')).toBe(false);
    expect(await hasSeenTour('camp')).toBe(false);
    expect(await hasSeenTour('hike')).toBe(false);
  });

  it('markTourSeen is idempotent', async () => {
    await markTourSeen('hike');
    await markTourSeen('hike');
    await markTourSeen('hike');
    const seen = await loadSeenModes();
    expect(Array.from(seen)).toEqual(['hike']);
  });

  it('persists across separate calls', async () => {
    await markTourSeen('camp');
    await markTourSeen('hunt');
    const seen = await loadSeenModes();
    expect(seen.has('camp')).toBe(true);
    expect(seen.has('hunt')).toBe(true);
    expect(seen.size).toBe(2);
  });
});

describe('onboardingStorage — resetTour / clearAllTourState', () => {
  it('resetTour removes one mode without affecting others', async () => {
    await markTourSeen('hunt');
    await markTourSeen('fish');
    await resetTour('hunt');
    expect(await hasSeenTour('hunt')).toBe(false);
    expect(await hasSeenTour('fish')).toBe(true);
  });

  it('resetTour for an unseen mode is a no-op', async () => {
    await markTourSeen('fish');
    await resetTour('hunt');
    expect(await hasSeenTour('fish')).toBe(true);
    expect((await loadSeenModes()).size).toBe(1);
  });

  it('clearAllTourState forgets every mode', async () => {
    await markTourSeen('hunt');
    await markTourSeen('fish');
    await markTourSeen('camp');
    await clearAllTourState();
    expect((await loadSeenModes()).size).toBe(0);
  });
});

describe('onboardingTours — TOUR_CONTENT shape', () => {
  it('every mode has at least one slide', () => {
    for (const mode of ['hunt', 'fish', 'camp', 'hike'] as const) {
      expect(TOUR_CONTENT[mode].length).toBeGreaterThan(0);
    }
  });

  it('every slide has required fields with non-empty strings', () => {
    for (const mode of ['hunt', 'fish', 'camp', 'hike'] as const) {
      for (const s of TOUR_CONTENT[mode]) {
        expect(typeof s.code).toBe('string');
        expect(s.code.length).toBeGreaterThan(0);
        expect(s.code.length).toBeLessThanOrEqual(4);
        expect(typeof s.title).toBe('string');
        expect(s.title.length).toBeGreaterThan(0);
        expect(typeof s.body).toBe('string');
        expect(s.body.length).toBeGreaterThan(0);
        expect(s.chipColor).toMatch(/^#[0-9a-fA-F]{3,8}$/);
        expect(s.chipTextColor).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      }
    }
  });

  it('tourTitleFor returns a non-empty string for each mode', () => {
    for (const mode of ['hunt', 'fish', 'camp', 'hike'] as const) {
      const t = tourTitleFor(mode);
      expect(typeof t).toBe('string');
      expect(t.length).toBeGreaterThan(0);
    }
  });
});
