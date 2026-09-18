import {
  SAMPLE_PREFIX,
  SAMPLE_TRACK_ID,
  buildSampleChecklist,
  buildSampleJournalEntry,
  buildSampleTrack,
  buildSampleWaypoints,
  clearSampleData,
  countSampleData,
  hasSampleData,
  isSampleName,
  seedSampleData,
  type SampleDataStores,
} from '../sampleDataService';
import type { RecordedTrack } from '../../types/track';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { JournalEntry } from '../../types/journalEntry';
import type { GearChecklist } from '../../types/gearChecklist';

/** In-memory stand-in for the four contexts. */
function makeStores(): SampleDataStores & {
  state: {
    tracks: RecordedTrack[];
    waypoints: UserWaypoint[];
    entries: JournalEntry[];
    checklists: GearChecklist[];
  };
} {
  let n = 0;
  const id = () => `id-${++n}`;
  const ts = new Date().toISOString();
  const state = {
    tracks: [] as RecordedTrack[],
    waypoints: [] as UserWaypoint[],
    entries: [] as JournalEntry[],
    checklists: [] as GearChecklist[],
  };
  const stores: SampleDataStores = {
    tracks: {
      get allTracks() {
        return state.tracks;
      },
      importTrack: async (t) => {
        state.tracks = [t, ...state.tracks.filter((x) => x.id !== t.id)];
        return t;
      },
      deleteTrack: async (tid) => {
        const before = state.tracks.length;
        state.tracks = state.tracks.filter((t) => t.id !== tid);
        return state.tracks.length < before;
      },
    },
    waypoints: {
      get allWaypoints() {
        return state.waypoints;
      },
      addWaypoint: async (input) => {
        const w: UserWaypoint = { ...input, id: id(), createdAt: ts, updatedAt: ts, photoUris: input.photoUris ?? [] };
        state.waypoints = [...state.waypoints, w];
        return w;
      },
      deleteWaypoint: async (wid) => {
        const before = state.waypoints.length;
        state.waypoints = state.waypoints.filter((w) => w.id !== wid);
        return state.waypoints.length < before;
      },
    },
    journal: {
      get allEntries() {
        return state.entries;
      },
      addEntry: async (input) => {
        const e: JournalEntry = { ...input, id: id(), createdAt: ts, updatedAt: ts, tags: input.tags ?? [], photoUris: input.photoUris ?? [] };
        state.entries = [...state.entries, e];
        return e;
      },
      deleteEntry: async (eid) => {
        const before = state.entries.length;
        state.entries = state.entries.filter((e) => e.id !== eid);
        return state.entries.length < before;
      },
    },
    gear: {
      get allChecklists() {
        return state.checklists;
      },
      addChecklist: async (input) => {
        const c: GearChecklist = {
          id: id(),
          createdAt: ts,
          updatedAt: ts,
          mode: input.mode,
          name: input.name ?? 'Checklist',
          tripDate: input.tripDate,
          items: [],
        };
        state.checklists = [...state.checklists, c];
        return c;
      },
      deleteChecklist: async (cid) => {
        const before = state.checklists.length;
        state.checklists = state.checklists.filter((c) => c.id !== cid);
        return state.checklists.length < before;
      },
    },
  };
  return Object.assign(stores, { state });
}

describe('sampleDataService builders', () => {
  it('builds a ~40 sample track near Patapsco Valley with derived stats', () => {
    const t = buildSampleTrack(new Date('2026-09-18T12:00:00Z'));
    expect(t.id).toBe(SAMPLE_TRACK_ID);
    expect(t.mode).toBe('hunt');
    expect(t.state).toBe('saved');
    expect(t.name.startsWith(SAMPLE_PREFIX)).toBe(true);
    expect(t.samples.length).toBe(40);
    for (const s of t.samples) {
      expect(s.lat).toBeGreaterThan(39.22);
      expect(s.lat).toBeLessThan(39.25);
      expect(s.lng).toBeGreaterThan(-76.75);
      expect(s.lng).toBeLessThan(-76.71);
    }
    // Monotonic timestamps.
    for (let i = 1; i < t.samples.length; i++) {
      expect(t.samples[i].timestamp).toBeGreaterThan(t.samples[i - 1].timestamp);
    }
    expect(t.distanceM).toBeGreaterThan(1000);
    expect(t.distanceM).toBeLessThan(4000);
    expect(t.durationSec).toBeGreaterThan(0);
    expect(t.elevationGainM).toBeGreaterThan(0);
    expect(t.endedAt).not.toBeNull();
  });

  it('builds three hunt waypoints including a tree stand', () => {
    const w = buildSampleWaypoints();
    expect(w).toHaveLength(3);
    expect(w.some((x) => x.category === 'tree-stand')).toBe(true);
    for (const x of w) {
      expect(x.mode).toBe('hunt');
      expect(x.title.startsWith(SAMPLE_PREFIX)).toBe(true);
    }
  });

  it('builds a journal entry with weather and a checklist', () => {
    const e = buildSampleJournalEntry(new Date('2026-09-18T12:00:00Z'));
    expect(e.title.startsWith(SAMPLE_PREFIX)).toBe(true);
    expect(e.weather?.temperatureF).toBeDefined();
    expect(e.weather?.windDirection).toBe('NW');
    expect(e.entryDate).toBe('2026-09-17');
    const c = buildSampleChecklist(new Date('2026-09-18T12:00:00Z'));
    expect(c.name?.startsWith(SAMPLE_PREFIX)).toBe(true);
    expect(c.mode).toBe('hunt');
    expect(c.tripDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('isSampleName only matches the prefix', () => {
    expect(isSampleName('Sample: thing')).toBe(true);
    expect(isSampleName('My sample stand')).toBe(false);
    expect(isSampleName(undefined)).toBe(false);
  });
});

describe('seedSampleData / clearSampleData', () => {
  it('seeds one track, three waypoints, one entry, one checklist', async () => {
    const stores = makeStores();
    expect(hasSampleData(stores)).toBe(false);
    const counts = await seedSampleData(stores);
    expect(counts).toEqual({ tracks: 1, waypoints: 3, journalEntries: 1, checklists: 1 });
    expect(countSampleData(stores)).toEqual({ tracks: 1, waypoints: 3, journalEntries: 1, checklists: 1 });
    expect(hasSampleData(stores)).toBe(true);
  });

  it('is idempotent: seeding twice does not duplicate', async () => {
    const stores = makeStores();
    await seedSampleData(stores);
    await seedSampleData(stores);
    expect(countSampleData(stores)).toEqual({ tracks: 1, waypoints: 3, journalEntries: 1, checklists: 1 });
    expect(stores.state.waypoints).toHaveLength(3);
  });

  it('clears only sample records and leaves user data alone', async () => {
    const stores = makeStores();
    await stores.waypoints.addWaypoint({
      mode: 'hunt',
      category: 'rub',
      title: 'My rub',
      notes: '',
      lat: 39.1,
      lng: -76.8,
    });
    await stores.tracks.importTrack({ ...buildSampleTrack(), id: 'mine', name: 'My walk' });
    await seedSampleData(stores);
    const removed = await clearSampleData(stores);
    expect(removed).toEqual({ tracks: 1, waypoints: 3, journalEntries: 1, checklists: 1 });
    expect(hasSampleData(stores)).toBe(false);
    expect(stores.state.waypoints.map((w) => w.title)).toEqual(['My rub']);
    expect(stores.state.tracks.map((t) => t.id)).toEqual(['mine']);
  });
});
