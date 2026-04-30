/**
 * trackStorage.ts — AsyncStorage persistence for RecordedTrack.
 *
 * Mirrors the shape of `userWaypointStorage` so consumers that already
 * understand one layer understand the other. Two stores instead of one
 * because:
 *
 *   1. Tracks can be 100x larger than waypoints per row (thousands of
 *      samples vs. a single lat/lng). Keeping them in separate keys
 *      keeps AsyncStorage writes bounded and avoids a partial-write
 *      during track save from corrupting the waypoint list.
 *
 *   2. In-flight "draft" tracks use a third key
 *      (`@user_track_draft_v1`) so a cold-restart mid-recording can
 *      recover instead of silently losing the samples already collected.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.2.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecordedTrack } from '../types/track';

const TRACKS_KEY = '@user_tracks_v1';
const DRAFT_KEY = '@user_track_draft_v1';
const CURRENT_SCHEMA_VERSION = 1;

interface StoredShape {
  schemaVersion: number;
  tracks: RecordedTrack[];
}

interface DraftShape {
  schemaVersion: number;
  draft: RecordedTrack | null;
}

/**
 * Load every persisted (saved) track. Defensive against the same
 * corruption modes as userWaypointStorage.loadAll: null, malformed
 * JSON, missing array, future schema version.
 */
export async function loadAll(): Promise<RecordedTrack[]> {
  try {
    const raw = await AsyncStorage.getItem(TRACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredShape;
    if (!parsed || !Array.isArray(parsed.tracks)) return [];
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      console.warn(
        '[trackStorage] Stored tracks are from a newer schema (',
        parsed.schemaVersion,
        ') than this build (',
        CURRENT_SCHEMA_VERSION,
        '). Ignoring to avoid corrupting data.',
      );
      return [];
    }
    return parsed.tracks;
  } catch (err) {
    console.warn('[trackStorage] loadAll failed:', String(err));
    return [];
  }
}

/**
 * Persist every saved track. Full-array rewrite — track count stays
 * bounded (users don't typically accumulate thousands of saved tracks)
 * and AsyncStorage has no partial-update primitive.
 */
export async function saveAll(tracks: RecordedTrack[]): Promise<boolean> {
  try {
    const payload: StoredShape = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tracks,
    };
    await AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[trackStorage] saveAll failed:', String(err));
    return false;
  }
}

/** Drop every saved track. Used by Settings reset and test teardown. */
export async function clearAll(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(TRACKS_KEY);
    return true;
  } catch (err) {
    console.warn('[trackStorage] clearAll failed:', String(err));
    return false;
  }
}

/**
 * Persist the current in-flight recording so a cold-start mid-record
 * can recover. Called periodically by the recorder context (every 30s
 * by default) and once more on pause/save.
 *
 * Pass `null` to drop the draft (we call this on save/discard).
 */
export async function saveDraft(draft: RecordedTrack | null): Promise<boolean> {
  try {
    const payload: DraftShape = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      draft,
    };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[trackStorage] saveDraft failed:', String(err));
    return false;
  }
}

/**
 * Load the last in-flight draft, if any. Returns null if no draft was
 * saved, the payload is malformed, or its schema is newer than ours.
 */
export async function loadDraft(): Promise<RecordedTrack | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftShape;
    if (!parsed) return null;
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      console.warn('[trackStorage] Draft schema newer than build; ignoring.');
      return null;
    }
    return parsed.draft ?? null;
  } catch (err) {
    console.warn('[trackStorage] loadDraft failed:', String(err));
    return null;
  }
}

/** Drop the in-flight draft key (used after save/discard). */
export async function clearDraft(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
    return true;
  } catch (err) {
    console.warn('[trackStorage] clearDraft failed:', String(err));
    return false;
  }
}

/** Exposed for tests that need to assert on keys directly. */
export const __TRACKS_KEY_FOR_TESTS = TRACKS_KEY;
export const __DRAFT_KEY_FOR_TESTS = DRAFT_KEY;
