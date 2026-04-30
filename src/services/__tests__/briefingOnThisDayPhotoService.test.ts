/**
 * @file briefingOnThisDayPhotoService.test.ts
 * @description Locks the Phase A.37 "Photo of the Day" projection.
 *
 * The picker walks the OnThisDayResult buckets newest-year-first
 * and returns the FIRST photo-bearing item's FIRST usable photo.
 * These tests pin every interesting axis: missing photoUris,
 * blank-string entries, only-tracks/markups buckets, multiple
 * photos within one item, multiple photo-bearing items across
 * buckets, and the empty case.
 */

import {
  pickOnThisDayPhoto,
  hasOnThisDayPhoto,
} from '../briefingOnThisDayPhotoService';
import type {
  OnThisDayItem,
  OnThisDayResult,
  OnThisDayYearBucket,
} from '../onThisDayService';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { JournalEntry } from '../../types/journalEntry';
import type { RecordedTrack } from '../../types/track';
import type { LineStringMarkup } from '../../types/userMarkup';
import type { GearChecklist } from '../../types/gearChecklist';

// ── Factories — locked overrides-spread pattern ──

function wp(overrides: Partial<UserWaypoint> = {}): UserWaypoint {
  const base: UserWaypoint = {
    id: 'wp-1',
    createdAt: '2024-04-25T10:00:00Z',
    updatedAt: '2024-04-25T10:00:00Z',
    mode: 'hunt',
    category: 'tree-stand',
    title: 'Stand A',
    notes: '',
    lat: 39.0,
    lng: -76.0,
    photoUris: [],
  };
  return { ...base, ...overrides };
}

function je(overrides: Partial<JournalEntry> = {}): JournalEntry {
  const base: JournalEntry = {
    id: 'je-1',
    createdAt: '2024-04-25T08:00:00Z',
    updatedAt: '2024-04-25T08:00:00Z',
    entryDate: '2024-04-25',
    mode: 'hunt',
    title: 'Sat hunt',
    body: '',
    outcome: 'sighting',
    tags: [],
    photoUris: [],
  };
  return { ...base, ...overrides };
}

function tr(overrides: Partial<RecordedTrack> = {}): RecordedTrack {
  const base: RecordedTrack = {
    id: 'tr-1',
    mode: 'hike',
    name: 'Morning loop',
    startedAt: '2024-04-25T13:00:00Z',
    endedAt: '2024-04-25T14:00:00Z',
    state: 'saved',
    samples: [],
    distanceM: 1000,
    durationSec: 3600,
    elevationGainM: 0,
  };
  return { ...base, ...overrides };
}

function mk(): LineStringMarkup {
  return {
    id: 'mk-1',
    createdAt: '2024-04-25T15:00:00Z',
    updatedAt: '2024-04-25T15:00:00Z',
    mode: 'fish',
    title: 'Drift line',
    shapeType: 'LineString',
    coordinates: [
      [-76.0, 39.0],
      [-76.1, 39.1],
    ],
  };
}

function gc(): GearChecklist {
  return {
    id: 'gc-1',
    createdAt: '2024-04-20T08:00:00Z',
    updatedAt: '2024-04-20T08:00:00Z',
    mode: 'camp',
    name: 'Weekend pack',
    tripDate: '2024-04-25',
    items: [],
  };
}

/** Builds an OnThisDayResult shell from a year→items map. */
function result(
  todayYear: number,
  yearItems: Array<[number, OnThisDayItem[]]>,
): OnThisDayResult {
  const buckets: OnThisDayYearBucket[] = yearItems
    .slice()
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({
      year,
      yearsAgo: todayYear - year,
      items,
    }));
  return {
    monthDay: '04-25',
    todayYear,
    buckets,
    totalCount: buckets.reduce((n, b) => n + b.items.length, 0),
  };
}

// ── pickOnThisDayPhoto — primary picker ──

describe('pickOnThisDayPhoto — basic selection', () => {
  it('returns null when there are no buckets at all', () => {
    expect(pickOnThisDayPhoto(result(2026, []))).toBeNull();
  });

  it('returns null when buckets carry only non-photo kinds', () => {
    const r = result(2026, [
      [
        2025,
        [
          { kind: 'track', date: '2025-04-25', year: 2025, item: tr() },
          { kind: 'markup', date: '2025-04-25', year: 2025, item: mk() },
          { kind: 'checklist', date: '2025-04-25', year: 2025, item: gc() },
        ],
      ],
    ]);
    expect(pickOnThisDayPhoto(r)).toBeNull();
  });

  it('returns null when waypoint/journal items have empty photoUris', () => {
    const r = result(2026, [
      [
        2025,
        [
          {
            kind: 'waypoint',
            date: '2025-04-25',
            year: 2025,
            item: wp({ photoUris: [] }),
          },
          {
            kind: 'journal',
            date: '2025-04-25',
            year: 2025,
            item: je({ photoUris: [] }),
          },
        ],
      ],
    ]);
    expect(pickOnThisDayPhoto(r)).toBeNull();
  });

  it('picks the first photo on a single waypoint with one photo', () => {
    const r = result(2026, [
      [
        2025,
        [
          {
            kind: 'waypoint',
            date: '2025-04-25',
            year: 2025,
            item: wp({ id: 'wp-x', title: 'Stand B', photoUris: ['file:///a.jpg'] }),
          },
        ],
      ],
    ]);
    const teaser = pickOnThisDayPhoto(r);
    expect(teaser).not.toBeNull();
    expect(teaser?.uri).toBe('file:///a.jpg');
    expect(teaser?.year).toBe(2025);
    expect(teaser?.yearsAgo).toBe(1);
    expect(teaser?.kind).toBe('waypoint');
    expect(teaser?.title).toBe('Stand B');
  });

  it('picks the first photo on a single journal with multiple photos', () => {
    const r = result(2026, [
      [
        2024,
        [
          {
            kind: 'journal',
            date: '2024-04-25',
            year: 2024,
            item: je({
              id: 'je-x',
              title: 'Cunningham morning',
              photoUris: ['file:///j1.jpg', 'file:///j2.jpg', 'file:///j3.jpg'],
            }),
          },
        ],
      ],
    ]);
    const teaser = pickOnThisDayPhoto(r);
    expect(teaser?.uri).toBe('file:///j1.jpg');
    expect(teaser?.kind).toBe('journal');
    expect(teaser?.year).toBe(2024);
    expect(teaser?.yearsAgo).toBe(2);
    expect(teaser?.title).toBe('Cunningham morning');
  });
});

describe('pickOnThisDayPhoto — bucket + item ordering', () => {
  it('prefers the newest-year bucket when multiple buckets carry photos', () => {
    const r = result(2026, [
      [
        2023,
        [
          {
            kind: 'waypoint',
            date: '2023-04-25',
            year: 2023,
            item: wp({ id: 'wp-old', photoUris: ['file:///old.jpg'] }),
          },
        ],
      ],
      [
        2025,
        [
          {
            kind: 'waypoint',
            date: '2025-04-25',
            year: 2025,
            item: wp({ id: 'wp-new', photoUris: ['file:///new.jpg'] }),
          },
        ],
      ],
    ]);
    const teaser = pickOnThisDayPhoto(r);
    expect(teaser?.uri).toBe('file:///new.jpg');
    expect(teaser?.year).toBe(2025);
    expect(teaser?.yearsAgo).toBe(1);
  });

  it('walks within a bucket in item order when first item has no photos', () => {
    const r = result(2026, [
      [
        2025,
        [
          // First item is a track — skipped (no photoUris field).
          { kind: 'track', date: '2025-04-25', year: 2025, item: tr() },
          // Second item is a waypoint with no photos — also skipped.
          {
            kind: 'waypoint',
            date: '2025-04-25',
            year: 2025,
            item: wp({ id: 'wp-empty', photoUris: [] }),
          },
          // Third item is a journal w/ a photo — this should win.
          {
            kind: 'journal',
            date: '2025-04-25',
            year: 2025,
            item: je({
              id: 'je-win',
              title: 'Found one',
              photoUris: ['file:///winner.jpg'],
            }),
          },
        ],
      ],
    ]);
    const teaser = pickOnThisDayPhoto(r);
    expect(teaser?.uri).toBe('file:///winner.jpg');
    expect(teaser?.kind).toBe('journal');
    expect(teaser?.title).toBe('Found one');
  });

  it('falls back to an older bucket when the newest has no photo-bearing items', () => {
    const r = result(2026, [
      [
        2022,
        [
          {
            kind: 'waypoint',
            date: '2022-04-25',
            year: 2022,
            item: wp({ id: 'wp-old', photoUris: ['file:///fallback.jpg'] }),
          },
        ],
      ],
      [
        2025,
        [
          // Newest bucket only has tracks — should be skipped entirely.
          { kind: 'track', date: '2025-04-25', year: 2025, item: tr() },
        ],
      ],
    ]);
    const teaser = pickOnThisDayPhoto(r);
    expect(teaser?.uri).toBe('file:///fallback.jpg');
    expect(teaser?.year).toBe(2022);
    expect(teaser?.yearsAgo).toBe(4);
  });
});

describe('pickOnThisDayPhoto — defensive URI handling', () => {
  it('skips empty-string entries and picks the next usable URI', () => {
    const r = result(2026, [
      [
        2025,
        [
          {
            kind: 'waypoint',
            date: '2025-04-25',
            year: 2025,
            item: wp({ photoUris: ['', '   ', 'file:///real.jpg'] }),
          },
        ],
      ],
    ]);
    expect(pickOnThisDayPhoto(r)?.uri).toBe('file:///real.jpg');
  });

  it('trims whitespace from a usable URI before returning', () => {
    const r = result(2026, [
      [
        2025,
        [
          {
            kind: 'waypoint',
            date: '2025-04-25',
            year: 2025,
            item: wp({ photoUris: ['  file:///padded.jpg  '] }),
          },
        ],
      ],
    ]);
    expect(pickOnThisDayPhoto(r)?.uri).toBe('file:///padded.jpg');
  });

  it('returns null when photoUris contains only blanks', () => {
    const r = result(2026, [
      [
        2025,
        [
          {
            kind: 'journal',
            date: '2025-04-25',
            year: 2025,
            item: je({ photoUris: ['', '   ', '\t'] }),
          },
        ],
      ],
    ]);
    expect(pickOnThisDayPhoto(r)).toBeNull();
  });
});

describe('pickOnThisDayPhoto — caption fallbacks', () => {
  it('falls back to "Waypoint" when a waypoint has an empty title', () => {
    const r = result(2026, [
      [
        2025,
        [
          {
            kind: 'waypoint',
            date: '2025-04-25',
            year: 2025,
            item: wp({ title: '', photoUris: ['file:///x.jpg'] }),
          },
        ],
      ],
    ]);
    expect(pickOnThisDayPhoto(r)?.title).toBe('Waypoint');
  });

  it('falls back to "Untitled entry" when a journal has only whitespace title', () => {
    const r = result(2026, [
      [
        2025,
        [
          {
            kind: 'journal',
            date: '2025-04-25',
            year: 2025,
            item: je({ title: '   ', photoUris: ['file:///x.jpg'] }),
          },
        ],
      ],
    ]);
    expect(pickOnThisDayPhoto(r)?.title).toBe('Untitled entry');
  });

  it('trims surrounding whitespace from a non-empty title', () => {
    const r = result(2026, [
      [
        2025,
        [
          {
            kind: 'waypoint',
            date: '2025-04-25',
            year: 2025,
            item: wp({ title: '  Buck rub on the ridge  ', photoUris: ['file:///x.jpg'] }),
          },
        ],
      ],
    ]);
    expect(pickOnThisDayPhoto(r)?.title).toBe('Buck rub on the ridge');
  });
});

describe('hasOnThisDayPhoto — render gate', () => {
  it('returns false for an empty result', () => {
    expect(hasOnThisDayPhoto(result(2026, []))).toBe(false);
  });

  it('returns false for a result with only non-photo items', () => {
    const r = result(2026, [
      [
        2025,
        [{ kind: 'track', date: '2025-04-25', year: 2025, item: tr() }],
      ],
    ]);
    expect(hasOnThisDayPhoto(r)).toBe(false);
  });

  it('returns true when at least one waypoint or journal carries a photo', () => {
    const r = result(2026, [
      [
        2025,
        [
          {
            kind: 'waypoint',
            date: '2025-04-25',
            year: 2025,
            item: wp({ photoUris: ['file:///hello.jpg'] }),
          },
        ],
      ],
    ]);
    expect(hasOnThisDayPhoto(r)).toBe(true);
  });
});
