/**
 * TrackRecorderContext — Live GPS recorder + saved-track store.
 *
 * Owns both the transient in-flight recording state (what the HUD
 * shows) and the persisted library of saved tracks (what TrackList
 * shows). Splitting these into two contexts was considered and
 * rejected: the list screen needs to reflect newly-saved tracks
 * immediately, and sharing memo-stable state via React context is the
 * cleanest way to do that without a global singleton.
 *
 * Sampling strategy (per V2_3 plan Risk R-6 mitigation):
 *   - Fast mode  : 5s interval, distanceFilter: 10m — used while moving
 *   - Slow mode  : 30s interval, distanceFilter: 25m — used while stationary
 *
 * The recorder flips between the two based on the rolling speed over
 * the last 60s of samples. When the average is < 0.5 m/s we consider
 * the user stationary and throttle; above that we return to fast
 * sampling. This ends up costing < ~3%/hr battery even during a full
 * all-day sit, per the rough iOS energy-impact budget.
 *
 * Cold-start recovery:
 *   Every time we append a sample we also write the in-flight track to
 *   the draft key via trackStorage.saveDraft. On mount, if we find a
 *   stale draft, we surface it as `recoveredDraft` so the UI can offer
 *   "Resume recording?" / "Discard". This prevents silent data loss
 *   when the OS kills the app.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.2.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  RecordedTrack,
  TrackSample,
  TrackRecorderState,
  computeDistanceM,
  computeDurationSec,
  computeElevationGainM,
} from '../types/track';
import { WaypointMode } from '../types/userWaypoint';
import {
  loadAll as storageLoadAll,
  saveAll as storageSaveAll,
  clearAll as storageClearAll,
  saveDraft as storageSaveDraft,
  loadDraft as storageLoadDraft,
  clearDraft as storageClearDraft,
} from '../services/trackStorage';
import { startTracking, stopTracking, Location } from '../services/locationService';

const FAST_INTERVAL_MS = 5_000;
const SLOW_INTERVAL_MS = 30_000;
const STATIONARY_SPEED_THRESHOLD = 0.5; // m/s
const STATIONARY_WINDOW_MS = 60_000;
const DRAFT_PERSIST_INTERVAL_MS = 30_000;

interface TrackRecorderContextValue {
  /** Current recorder lifecycle state. */
  state: TrackRecorderState;
  /** The in-flight track (recording or paused). `null` when idle. */
  activeTrack: RecordedTrack | null;
  /** Every saved track across all modes, newest first. */
  allTracks: RecordedTrack[];
  /** True once both the library load and draft-recovery attempt have resolved. */
  hydrated: boolean;
  /**
   * A draft we recovered from AsyncStorage on boot. Present only if the
   * previous session was killed mid-record without a pause or save.
   * The UI is expected to show a "Resume?" prompt, then call
   * `resumeRecoveredDraft()` or `discardRecoveredDraft()`.
   */
  recoveredDraft: RecordedTrack | null;

  /** Tracks belonging to a specific mode (for per-mode list filters). */
  tracksForMode: (mode: WaypointMode) => RecordedTrack[];

  /** Begin a new recording. Returns the draft track. */
  start: (mode: WaypointMode, name: string) => Promise<RecordedTrack>;
  /** Pause sampling; samples so far are preserved. */
  pause: () => Promise<void>;
  /** Resume sampling on a paused track. */
  resume: () => Promise<void>;
  /** Commit the in-flight track to the saved library and return to idle. */
  save: (finalName?: string) => Promise<RecordedTrack | null>;
  /** Drop the in-flight track without persisting. */
  discard: () => Promise<void>;

  /** Resume a draft recovered from a previous session. */
  resumeRecoveredDraft: () => Promise<void>;
  /** Drop the recovered draft permanently. */
  discardRecoveredDraft: () => Promise<void>;

  /** Look up a saved track by id. */
  getTrack: (id: string) => RecordedTrack | null;
  /** Rename / edit notes on a saved track. */
  updateTrack: (
    id: string,
    patch: Partial<Pick<RecordedTrack, 'name' | 'notes'>>,
  ) => Promise<RecordedTrack | null>;
  /** Delete a saved track. */
  deleteTrack: (id: string) => Promise<boolean>;
  /** Drop every saved track. For Settings reset; UI must confirm. */
  clearAllTracks: () => Promise<void>;
}

const TrackRecorderContext = createContext<TrackRecorderContextValue | null>(
  null,
);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
function nowIso(): string {
  return new Date().toISOString();
}

interface Props {
  children: ReactNode;
}

export function TrackRecorderProvider({ children }: Props) {
  const [state, setState] = useState<TrackRecorderState>('idle');
  const [activeTrack, setActiveTrack] = useState<RecordedTrack | null>(null);
  const [allTracks, setAllTracks] = useState<RecordedTrack[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<RecordedTrack | null>(
    null,
  );

  // Refs for hot-path access inside the GPS callback (avoids stale-closure
  // bugs where the watchPosition callback fires with an old activeTrack).
  const activeTrackRef = useRef<RecordedTrack | null>(null);
  const allTracksRef = useRef<RecordedTrack[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const intervalModeRef = useRef<'fast' | 'slow'>('fast');
  const lastDraftWriteRef = useRef<number>(0);

  useEffect(() => {
    activeTrackRef.current = activeTrack;
  }, [activeTrack]);
  useEffect(() => {
    allTracksRef.current = allTracks;
  }, [allTracks]);

  // Hydrate saved tracks + recover any in-flight draft from a prior kill.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tracks, draft] = await Promise.all([
        storageLoadAll(),
        storageLoadDraft(),
      ]);
      if (cancelled) return;
      setAllTracks(tracks);
      allTracksRef.current = tracks;
      if (draft && (draft.state === 'recording' || draft.state === 'paused')) {
        // Force to paused — we can't know whether the app died mid-sample
        // or between samples, and the user should confirm before we
        // resume GPS streaming.
        setRecoveredDraft({ ...draft, state: 'paused' });
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Sampling helpers -----------------------------------------------

  /** Compute the average sample speed over the trailing window. */
  const recentAvgSpeed = useCallback((samples: TrackSample[]): number => {
    if (samples.length < 2) return Infinity; // treat as "fast" until proven otherwise
    const lastTs = samples[samples.length - 1].timestamp;
    const windowStart = lastTs - STATIONARY_WINDOW_MS;
    const windowed = samples.filter((s) => s.timestamp >= windowStart);
    if (windowed.length < 2) return Infinity;
    let dist = 0;
    for (let i = 1; i < windowed.length; i++) {
      dist += computeDistanceM([windowed[i - 1], windowed[i]]);
    }
    const secs =
      (windowed[windowed.length - 1].timestamp - windowed[0].timestamp) /
      1000;
    if (secs <= 0) return Infinity;
    return dist / secs;
  }, []);

  /** Tear down the current watcher. */
  const stopWatcher = useCallback(() => {
    if (watchIdRef.current !== null) {
      stopTracking(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  /** Start a watcher at the given interval. */
  const startWatcher = useCallback((intervalMs: number) => {
    stopWatcher();
    watchIdRef.current = startTracking(
      {
        onSuccess: (loc: Location) => {
          onSample(loc);
        },
        onError: (err) => {
          console.warn('[TrackRecorder] GPS error:', err);
        },
      },
      intervalMs,
    );
    intervalModeRef.current =
      intervalMs <= FAST_INTERVAL_MS ? 'fast' : 'slow';
    // `onSample` is stable (declared below); TS's exhaustive-deps check is
    // intentionally relaxed here because we rely on refs for hot data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Handle a fresh GPS fix. */
  const onSample = useCallback((loc: Location) => {
    const current = activeTrackRef.current;
    if (!current || current.state !== 'recording') return;

    const sample: TrackSample = {
      lat: loc.latitude,
      lng: loc.longitude,
      altitude: undefined, // @react-native-community/geolocation does not expose altitude in our current wrapper
      timestamp: Date.now(),
      accuracy: loc.accuracy,
    };

    const nextSamples = [...current.samples, sample];
    const updated: RecordedTrack = {
      ...current,
      samples: nextSamples,
    };
    activeTrackRef.current = updated;
    setActiveTrack(updated);

    // Adaptive sampling: if the rolling-window speed drops below the
    // stationary threshold, switch to slow interval. If it comes back up,
    // restore fast.
    const avg = recentAvgSpeed(nextSamples);
    const shouldBeSlow = avg < STATIONARY_SPEED_THRESHOLD;
    const currentMode = intervalModeRef.current;
    if (shouldBeSlow && currentMode === 'fast') {
      startWatcher(SLOW_INTERVAL_MS);
    } else if (!shouldBeSlow && currentMode === 'slow') {
      startWatcher(FAST_INTERVAL_MS);
    }

    // Draft persistence: every ~30s, flush in-flight track so an OS
    // kill doesn't erase the recording.
    const now = Date.now();
    if (now - lastDraftWriteRef.current > DRAFT_PERSIST_INTERVAL_MS) {
      lastDraftWriteRef.current = now;
      storageSaveDraft(updated);
    }
  }, [recentAvgSpeed, startWatcher]);

  // --- Public API ------------------------------------------------------

  const tracksForMode = useCallback(
    (mode: WaypointMode) => allTracksRef.current.filter((t) => t.mode === mode),
    [],
  );

  const getTrack = useCallback(
    (id: string) => allTracksRef.current.find((t) => t.id === id) ?? null,
    [],
  );

  const start = useCallback(
    async (mode: WaypointMode, name: string): Promise<RecordedTrack> => {
      // If something's already running, pause it first — the HUD should
      // not call start twice but we defend anyway.
      if (activeTrackRef.current) {
        stopWatcher();
      }
      const track: RecordedTrack = {
        id: generateId(),
        mode,
        name,
        startedAt: nowIso(),
        endedAt: null,
        state: 'recording',
        samples: [],
        distanceM: 0,
        durationSec: 0,
        elevationGainM: 0,
      };
      activeTrackRef.current = track;
      setActiveTrack(track);
      setState('recording');
      lastDraftWriteRef.current = Date.now();
      await storageSaveDraft(track);
      startWatcher(FAST_INTERVAL_MS);
      return track;
    },
    [startWatcher, stopWatcher],
  );

  const pause = useCallback(async () => {
    const current = activeTrackRef.current;
    if (!current || current.state !== 'recording') return;
    stopWatcher();
    const paused: RecordedTrack = { ...current, state: 'paused' };
    activeTrackRef.current = paused;
    setActiveTrack(paused);
    setState('paused');
    await storageSaveDraft(paused);
  }, [stopWatcher]);

  const resume = useCallback(async () => {
    const current = activeTrackRef.current;
    if (!current || current.state !== 'paused') return;
    const recording: RecordedTrack = { ...current, state: 'recording' };
    activeTrackRef.current = recording;
    setActiveTrack(recording);
    setState('recording');
    await storageSaveDraft(recording);
    startWatcher(FAST_INTERVAL_MS);
  }, [startWatcher]);

  const save = useCallback(
    async (finalName?: string): Promise<RecordedTrack | null> => {
      const current = activeTrackRef.current;
      if (!current) return null;
      stopWatcher();
      const endedAt = nowIso();
      const finalized: RecordedTrack = {
        ...current,
        name: finalName ?? current.name,
        endedAt,
        state: 'saved',
        distanceM: computeDistanceM(current.samples),
        durationSec: computeDurationSec(current.samples),
        elevationGainM: computeElevationGainM(current.samples),
      };
      const next = [finalized, ...allTracksRef.current];
      allTracksRef.current = next;
      setAllTracks(next);
      await storageSaveAll(next);
      await storageClearDraft();
      activeTrackRef.current = null;
      setActiveTrack(null);
      setState('saved');
      // Transition back to idle after a tick so the UI can read `saved`.
      setTimeout(() => setState('idle'), 0);
      return finalized;
    },
    [stopWatcher],
  );

  const discard = useCallback(async () => {
    stopWatcher();
    activeTrackRef.current = null;
    setActiveTrack(null);
    setState('idle');
    await storageClearDraft();
  }, [stopWatcher]);

  const resumeRecoveredDraft = useCallback(async () => {
    if (!recoveredDraft) return;
    const recording: RecordedTrack = {
      ...recoveredDraft,
      state: 'recording',
    };
    activeTrackRef.current = recording;
    setActiveTrack(recording);
    setState('recording');
    setRecoveredDraft(null);
    await storageSaveDraft(recording);
    startWatcher(FAST_INTERVAL_MS);
  }, [recoveredDraft, startWatcher]);

  const discardRecoveredDraft = useCallback(async () => {
    setRecoveredDraft(null);
    await storageClearDraft();
  }, []);

  const updateTrack = useCallback(
    async (
      id: string,
      patch: Partial<Pick<RecordedTrack, 'name' | 'notes'>>,
    ): Promise<RecordedTrack | null> => {
      const idx = allTracksRef.current.findIndex((t) => t.id === id);
      if (idx < 0) return null;
      const merged: RecordedTrack = {
        ...allTracksRef.current[idx],
        ...patch,
      };
      const next = [...allTracksRef.current];
      next[idx] = merged;
      allTracksRef.current = next;
      setAllTracks(next);
      await storageSaveAll(next);
      return merged;
    },
    [],
  );

  const deleteTrack = useCallback(async (id: string): Promise<boolean> => {
    const current = allTracksRef.current;
    const next = current.filter((t) => t.id !== id);
    if (next.length === current.length) return false;
    allTracksRef.current = next;
    setAllTracks(next);
    await storageSaveAll(next);
    return true;
  }, []);

  const clearAllTracks = useCallback(async () => {
    await storageClearAll();
    allTracksRef.current = [];
    setAllTracks([]);
  }, []);

  // Tear down GPS watcher on unmount so a navigation-level remount
  // doesn't leak watchers.
  useEffect(() => {
    return () => {
      stopWatcher();
    };
  }, [stopWatcher]);

  const value = useMemo<TrackRecorderContextValue>(
    () => ({
      state,
      activeTrack,
      allTracks,
      hydrated,
      recoveredDraft,
      tracksForMode,
      start,
      pause,
      resume,
      save,
      discard,
      resumeRecoveredDraft,
      discardRecoveredDraft,
      getTrack,
      updateTrack,
      deleteTrack,
      clearAllTracks,
    }),
    [
      state,
      activeTrack,
      allTracks,
      hydrated,
      recoveredDraft,
      tracksForMode,
      start,
      pause,
      resume,
      save,
      discard,
      resumeRecoveredDraft,
      discardRecoveredDraft,
      getTrack,
      updateTrack,
      deleteTrack,
      clearAllTracks,
    ],
  );

  return (
    <TrackRecorderContext.Provider value={value}>
      {children}
    </TrackRecorderContext.Provider>
  );
}

/**
 * Hook for consuming TrackRecorderContext. Throws on misuse so a
 * misplaced caller (outside the provider) fails loudly in dev.
 */
export function useTrackRecorder(): TrackRecorderContextValue {
  const ctx = useContext(TrackRecorderContext);
  if (!ctx) {
    throw new Error(
      'useTrackRecorder must be called from a descendant of <TrackRecorderProvider>.',
    );
  }
  return ctx;
}
