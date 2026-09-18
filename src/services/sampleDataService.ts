/**
 * sampleDataService - seeds (and removes) a small demo set in the personal
 * layer so a first-time user, or an App Review tester with no data, can
 * see what a populated Log tab, map, and journal look like.
 *
 * The demo set:
 *   - one GPS track near Patapsco Valley State Park (~40 samples)
 *   - three hunt waypoints, including a tree stand
 *   - one journal entry with weather
 *   - one gear checklist
 *
 * Records are written through the existing context mutators (passed in as
 * a small adapter so this module stays testable without React). Every
 * record carries the "Sample: " name prefix, which is how
 * `clearSampleData` finds them again; the types have no isSample field.
 */

import type { RecordedTrack, TrackSample } from '../types/track';
import {
  computeDistanceM,
  computeDurationSec,
  computeElevationGainM,
} from '../types/track';
import type { UserWaypoint } from '../types/userWaypoint';
import type { JournalEntry } from '../types/journalEntry';
import type { GearChecklist } from '../types/gearChecklist';
import type { NewWaypointInput } from '../context/UserWaypointContext';
import type { NewJournalEntryInput } from '../context/JournalEntryContext';
import type { NewChecklistInput } from '../context/GearChecklistContext';

/** Name/title prefix that marks a record as sample data. */
export const SAMPLE_PREFIX = 'Sample: ';

/** Stable id for the sample track so re-seeding replaces, not duplicates. */
export const SAMPLE_TRACK_ID = 'sample-track-patapsco';

/** True when a record's display name marks it as sample data. */
export function isSampleName(name: string | undefined | null): boolean {
  return typeof name === 'string' && name.startsWith(SAMPLE_PREFIX);
}

/** Patapsco Valley SP, Avalon area (Orange Grove trail region). */
const PATAPSCO_START = { lat: 39.2312, lng: -76.7269, altitude: 62 };

/**
 * Build a ~1.6 km out-and-back walk along the river with gentle climbs.
 * Deterministic: same output every call, so tests and re-seeds match.
 */
export function buildSampleTrack(now: Date = new Date()): RecordedTrack {
  const samples: TrackSample[] = [];
  const count = 40;
  const intervalMs = 45 * 1000;
  // Start the walk yesterday morning so it sorts naturally in the list.
  const startMs = new Date(now.getTime() - 24 * 3600 * 1000).setHours(6, 40, 0, 0);

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    // Out along the river (first half), then back on a higher bench.
    const out = t <= 0.5 ? t * 2 : (1 - t) * 2;
    const lat = PATAPSCO_START.lat + out * 0.0068 + (t > 0.5 ? 0.0006 : 0);
    const lng = PATAPSCO_START.lng - out * 0.0092 + Math.sin(i * 0.9) * 0.00008;
    const altitude =
      PATAPSCO_START.altitude +
      (t > 0.5 ? 18 : 0) +
      Math.round(Math.sin(t * Math.PI) * 14 + Math.sin(i * 0.7) * 2);
    samples.push({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      altitude,
      timestamp: startMs + i * intervalMs,
      accuracy: 6 + (i % 4),
    });
  }

  const startedAt = new Date(samples[0].timestamp).toISOString();
  const endedAt = new Date(samples[samples.length - 1].timestamp).toISOString();

  return {
    id: SAMPLE_TRACK_ID,
    mode: 'hunt',
    name: `${SAMPLE_PREFIX}Patapsco river walk`,
    startedAt,
    endedAt,
    state: 'saved',
    samples,
    distanceM: Math.round(computeDistanceM(samples)),
    durationSec: computeDurationSec(samples),
    elevationGainM: Math.round(computeElevationGainM(samples)),
    notes:
      'Sample track. Morning walk-in along the Patapsco with a climb to the bench where the stand sits. Load your own tracks from the Log tab.',
  };
}

/** Three hunt waypoints around the sample track, including a stand. */
export function buildSampleWaypoints(): NewWaypointInput[] {
  return [
    {
      mode: 'hunt',
      category: 'tree-stand',
      title: `${SAMPLE_PREFIX}Oak bench stand`,
      notes:
        'Sample waypoint. Ladder stand on the bench above the river bend. Best on a north or northwest wind.',
      lat: 39.2374,
      lng: -76.7355,
      photoUris: [],
    },
    {
      mode: 'hunt',
      category: 'scrape',
      title: `${SAMPLE_PREFIX}Fresh scrape line`,
      notes: 'Sample waypoint. Three scrapes under the licking branch along the old road.',
      lat: 39.2346,
      lng: -76.7318,
      photoUris: [],
    },
    {
      mode: 'hunt',
      category: 'parking',
      title: `${SAMPLE_PREFIX}Trailhead parking`,
      notes: 'Sample waypoint. Gravel lot at the trailhead. Gate opens at sunrise.',
      lat: 39.2312,
      lng: -76.7269,
      photoUris: [],
    },
  ];
}

/** One hunt journal entry with weather, tied to the sample stand. */
export function buildSampleJournalEntry(now: Date = new Date()): NewJournalEntryInput {
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  return {
    mode: 'hunt',
    entryDate: yesterday.toISOString().slice(0, 10),
    title: `${SAMPLE_PREFIX}Morning sit at the oak bench`,
    body:
      'Sample entry. In the stand 25 minutes before legal light. Two does fed through the bench at 7:10 and a small buck worked the scrape line around 8:30. Wind held steady out of the northwest. Left at 10:00 to walk the river back to the truck.',
    outcome: 'sighting',
    tags: ['sample', 'stand', 'morning'],
    lat: 39.2374,
    lng: -76.7355,
    locationLabel: 'Patapsco Valley SP, Avalon area',
    weather: {
      temperatureF: 41,
      windMph: 7,
      windDirection: 'NW',
      conditions: 'Clear, light frost',
    },
    photoUris: [],
  };
}

/** One seeded hunt checklist named as sample data. */
export function buildSampleChecklist(now: Date = new Date()): NewChecklistInput {
  const nextSat = new Date(now);
  nextSat.setDate(nextSat.getDate() + (((6 - nextSat.getDay() + 7) % 7) || 7));
  return {
    mode: 'hunt',
    name: `${SAMPLE_PREFIX}Opening day stand sit`,
    tripDate: nextSat.toISOString().slice(0, 10),
    seed: true,
  };
}

/**
 * The slice of the four personal-layer contexts this service needs.
 * SampleDataBanner assembles it from the context hooks; tests pass mocks.
 */
export interface SampleDataStores {
  tracks: {
    allTracks: RecordedTrack[];
    importTrack: (track: RecordedTrack) => Promise<RecordedTrack>;
    deleteTrack: (id: string) => Promise<boolean>;
  };
  waypoints: {
    allWaypoints: UserWaypoint[];
    addWaypoint: (input: NewWaypointInput) => Promise<UserWaypoint>;
    deleteWaypoint: (id: string) => Promise<boolean>;
  };
  journal: {
    allEntries: JournalEntry[];
    addEntry: (input: NewJournalEntryInput) => Promise<JournalEntry>;
    deleteEntry: (id: string) => Promise<boolean>;
  };
  gear: {
    allChecklists: GearChecklist[];
    addChecklist: (input: NewChecklistInput) => Promise<GearChecklist>;
    deleteChecklist: (id: string) => Promise<boolean>;
  };
}

export interface SampleDataCounts {
  tracks: number;
  waypoints: number;
  journalEntries: number;
  checklists: number;
}

/** Count sample records currently in the stores. */
export function countSampleData(stores: SampleDataStores): SampleDataCounts {
  return {
    tracks: stores.tracks.allTracks.filter((t) => isSampleName(t.name) || t.id === SAMPLE_TRACK_ID).length,
    waypoints: stores.waypoints.allWaypoints.filter((w) => isSampleName(w.title)).length,
    journalEntries: stores.journal.allEntries.filter((e) => isSampleName(e.title)).length,
    checklists: stores.gear.allChecklists.filter((c) => isSampleName(c.name)).length,
  };
}

/** True when any sample record is present. */
export function hasSampleData(stores: SampleDataStores): boolean {
  const c = countSampleData(stores);
  return c.tracks + c.waypoints + c.journalEntries + c.checklists > 0;
}

/**
 * Seed the demo set. Idempotent: existing sample records are removed
 * first so tapping twice never duplicates anything.
 */
export async function seedSampleData(
  stores: SampleDataStores,
  now: Date = new Date(),
): Promise<SampleDataCounts> {
  await clearSampleData(stores);

  await stores.tracks.importTrack(buildSampleTrack(now));
  for (const w of buildSampleWaypoints()) {
    await stores.waypoints.addWaypoint(w);
  }
  await stores.journal.addEntry(buildSampleJournalEntry(now));
  await stores.gear.addChecklist(buildSampleChecklist(now));

  return { tracks: 1, waypoints: 3, journalEntries: 1, checklists: 1 };
}

/** Remove every record that carries the sample marker. */
export async function clearSampleData(stores: SampleDataStores): Promise<SampleDataCounts> {
  const removed: SampleDataCounts = { tracks: 0, waypoints: 0, journalEntries: 0, checklists: 0 };

  for (const t of stores.tracks.allTracks) {
    if (isSampleName(t.name) || t.id === SAMPLE_TRACK_ID) {
      if (await stores.tracks.deleteTrack(t.id)) removed.tracks += 1;
    }
  }
  for (const w of stores.waypoints.allWaypoints) {
    if (isSampleName(w.title)) {
      if (await stores.waypoints.deleteWaypoint(w.id)) removed.waypoints += 1;
    }
  }
  for (const e of stores.journal.allEntries) {
    if (isSampleName(e.title)) {
      if (await stores.journal.deleteEntry(e.id)) removed.journalEntries += 1;
    }
  }
  for (const c of stores.gear.allChecklists) {
    if (isSampleName(c.name)) {
      if (await stores.gear.deleteChecklist(c.id)) removed.checklists += 1;
    }
  }
  return removed;
}
