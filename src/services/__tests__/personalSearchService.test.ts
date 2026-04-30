/**
 * personalSearchService.test.ts — pure-function contract for unified
 * search across the five personal-layer collections.
 */

import {
  PersonalSearchInputs,
  scoreAgainst,
  searchPersonalLayer,
  tokenizeQuery,
} from '../personalSearchService';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { RecordedTrack } from '../../types/track';
import type { UserMarkup } from '../../types/userMarkup';
import type { JournalEntry } from '../../types/journalEntry';
import type { GearChecklist } from '../../types/gearChecklist';

function emptyInputs(): PersonalSearchInputs {
  return {
    waypoints: [],
    tracks: [],
    markups: [],
    journalEntries: [],
    checklists: [],
  };
}

function wp(overrides: Partial<UserWaypoint>): UserWaypoint {
  return {
    id: 'w1',
    createdAt: '2026-04-20T08:00:00.000Z',
    updatedAt: '2026-04-20T08:00:00.000Z',
    mode: 'hunt',
    category: 'tree-stand' as any,
    title: 'Cedar Hill stand',
    notes: '',
    lat: 39.4,
    lng: -76.7,
    photoUris: [],
    ...overrides,
  };
}

function tr(overrides: Partial<RecordedTrack>): RecordedTrack {
  return {
    id: 't1',
    mode: 'hunt',
    name: 'Morning walk',
    startedAt: '2026-04-22T11:00:00.000Z',
    endedAt: '2026-04-22T12:30:00.000Z',
    state: 'idle',
    samples: [],
    distanceM: 3200,
    durationSec: 5400,
    elevationGainM: 65,
    ...overrides,
  };
}

function mk(overrides: Partial<UserMarkup>): UserMarkup {
  return {
    id: 'm1',
    createdAt: '2026-04-21T10:00:00.000Z',
    updatedAt: '2026-04-21T10:00:00.000Z',
    mode: 'hunt',
    title: 'Property line',
    shapeType: 'LineString',
    coordinates: [[-76.7, 39.4], [-76.71, 39.41]],
    ...overrides,
  } as UserMarkup;
}

function je(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    id: 'j1',
    createdAt: '2026-04-23T22:00:00.000Z',
    updatedAt: '2026-04-23T22:00:00.000Z',
    entryDate: '2026-04-23',
    mode: 'hunt',
    title: 'Evening sit',
    body: 'Saw a doe and two fawns',
    outcome: 'sighting',
    tags: ['cedar', 'archery'],
    photoUris: [],
    ...overrides,
  };
}

function gc(overrides: Partial<GearChecklist>): GearChecklist {
  return {
    id: 'c1',
    createdAt: '2026-04-19T14:00:00.000Z',
    updatedAt: '2026-04-19T14:00:00.000Z',
    mode: 'hunt',
    name: 'Opening day',
    items: [
      { id: 'i1', label: 'binoculars', category: 'optics', checked: true, isCustom: false },
      { id: 'i2', label: 'thermos', category: 'food-water', checked: false, isCustom: true },
    ],
    ...overrides,
  };
}

describe('tokenizeQuery', () => {
  it('returns empty array for empty / whitespace input', () => {
    expect(tokenizeQuery('')).toEqual([]);
    expect(tokenizeQuery('   ')).toEqual([]);
    expect(tokenizeQuery(',  ,, ')).toEqual([]);
  });

  it('lowercases and splits on whitespace + commas', () => {
    expect(tokenizeQuery('Cedar Hill, stand')).toEqual(['cedar', 'hill', 'stand']);
  });

  it('drops empty tokens between separators', () => {
    expect(tokenizeQuery('  foo   bar  ')).toEqual(['foo', 'bar']);
  });
});

describe('scoreAgainst', () => {
  it('returns 0 for empty tokens', () => {
    expect(scoreAgainst([], ['hello'])).toBe(0);
  });

  it('returns 0 when no haystacks', () => {
    expect(scoreAgainst(['cedar'], [])).toBe(0);
    expect(scoreAgainst(['cedar'], [undefined, null, ''])).toBe(0);
  });

  it('scores +3 for prefix match', () => {
    expect(scoreAgainst(['cedar'], ['Cedar Hill'])).toBe(3);
  });

  it('scores +2 for whole-word match in middle', () => {
    expect(scoreAgainst(['hill'], ['Cedar Hill stand'])).toBe(2);
  });

  it('scores +1 for substring-only match', () => {
    expect(scoreAgainst(['edar'], ['Cedar Hill'])).toBe(1);
  });

  it('drops the row when ANY token misses', () => {
    expect(scoreAgainst(['cedar', 'kayak'], ['Cedar Hill stand'])).toBe(0);
  });

  it('sums across tokens when ALL match', () => {
    // "cedar" is +3 prefix, "stand" is +2 whole-word
    expect(scoreAgainst(['cedar', 'stand'], ['Cedar Hill stand'])).toBe(5);
  });

  it('takes the BEST match per token across haystacks', () => {
    // "stand" is whole-word (+2) in haystack 1, prefix (+3) in haystack 2 → +3
    expect(scoreAgainst(['stand'], ['the stand', 'Stand-by'])).toBe(3);
  });
});

describe('searchPersonalLayer', () => {
  it('returns empty array for empty inputs', () => {
    expect(searchPersonalLayer('cedar', emptyInputs())).toEqual([]);
  });

  it('finds matching waypoints by title', () => {
    const inputs: PersonalSearchInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'a', title: 'Cedar Hill stand' }),
        wp({ id: 'b', title: 'River bend ramp' }),
      ],
    };
    const out = searchPersonalLayer('cedar', inputs);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');
    expect(out[0].kind).toBe('waypoint');
  });

  it('searches across all five layers in one call', () => {
    const inputs: PersonalSearchInputs = {
      waypoints: [wp({ id: 'a', title: 'Cedar Hill stand' })],
      tracks: [tr({ id: 'b', name: 'Cedar ridge loop' })],
      markups: [mk({ id: 'c', title: 'Cedar property line' })],
      journalEntries: [je({ id: 'd', title: 'Cedar Run scout' })],
      checklists: [gc({ id: 'e', name: 'Cedar weekend' })],
    };
    const out = searchPersonalLayer('cedar', inputs);
    expect(out.map((r) => r.kind).sort()).toEqual([
      'checklist', 'journal', 'markup', 'track', 'waypoint',
    ]);
  });

  it('filters by mode strictly when opts.mode is set', () => {
    const inputs: PersonalSearchInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'h', mode: 'hunt', title: 'Cedar Hill' }),
        wp({ id: 'f', mode: 'fish', title: 'Cedar Pond' }),
      ],
    };
    const out = searchPersonalLayer('cedar', inputs, { mode: 'hunt' });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('h');
  });

  it('filters by kinds when opts.kinds is set', () => {
    const inputs: PersonalSearchInputs = {
      waypoints: [wp({ id: 'a', title: 'Cedar' })],
      tracks: [tr({ id: 'b', name: 'Cedar' })],
      markups: [],
      journalEntries: [je({ id: 'c', title: 'Cedar' })],
      checklists: [],
    };
    const out = searchPersonalLayer('cedar', inputs, {
      kinds: ['waypoint', 'track'],
    });
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.kind).sort()).toEqual(['track', 'waypoint']);
  });

  it('ranks prefix matches above substring matches', () => {
    const inputs: PersonalSearchInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'sub', title: 'Eastern Cedar grove' }),  // substring
        wp({ id: 'pre', title: 'Cedar Hill stand' }),     // prefix
      ],
    };
    const out = searchPersonalLayer('cedar', inputs);
    expect(out[0].id).toBe('pre');
    expect(out[1].id).toBe('sub');
  });

  it('breaks score ties by most-recent timestamp first', () => {
    const inputs: PersonalSearchInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'old', title: 'Cedar A', updatedAt: '2026-04-10T08:00:00.000Z' }),
        wp({ id: 'new', title: 'Cedar B', updatedAt: '2026-04-22T08:00:00.000Z' }),
      ],
    };
    const out = searchPersonalLayer('cedar', inputs);
    expect(out[0].id).toBe('new');
    expect(out[1].id).toBe('old');
  });

  it('searches journal body and tags, not just title', () => {
    const inputs: PersonalSearchInputs = {
      ...emptyInputs(),
      journalEntries: [
        je({ id: 'a', title: 'Untitled', body: 'archery practice was sharp' }),
        je({ id: 'b', title: 'Untitled', body: '', tags: ['kayak', 'striper'] }),
        je({ id: 'c', title: 'Untitled', body: '', tags: [] }),
      ],
    };
    const a = searchPersonalLayer('archery', inputs);
    expect(a.map((r) => r.id)).toEqual(['a']);

    const b = searchPersonalLayer('striper', inputs);
    expect(b.map((r) => r.id)).toEqual(['b']);
  });

  it('searches checklist item labels', () => {
    const inputs: PersonalSearchInputs = {
      ...emptyInputs(),
      checklists: [
        gc({ id: 'a', name: 'Day 1', items: [
          { id: 'i', label: 'thermos of coffee', category: 'food-water', checked: false, isCustom: true },
        ]}),
        gc({ id: 'b', name: 'Day 2', items: [
          { id: 'j', label: 'water bottle', category: 'food-water', checked: false, isCustom: false },
        ]}),
      ],
    };
    const out = searchPersonalLayer('thermos', inputs);
    expect(out.map((r) => r.id)).toEqual(['a']);
  });

  it('honors limit option', () => {
    const inputs: PersonalSearchInputs = {
      ...emptyInputs(),
      waypoints: Array.from({ length: 10 }, (_, i) =>
        wp({ id: `w${i}`, title: `Cedar ${i}` }),
      ),
    };
    const out = searchPersonalLayer('cedar', inputs, { limit: 3 });
    expect(out).toHaveLength(3);
  });

  it('rejects rows when ANY query token misses', () => {
    const inputs: PersonalSearchInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'a', title: 'Cedar Hill stand' }),
        wp({ id: 'b', title: 'Cedar Hill kayak put-in' }),
      ],
    };
    const out = searchPersonalLayer('cedar kayak', inputs);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('b');
  });

  it('returns recently-touched listing for empty query (sorted by timestamp)', () => {
    const inputs: PersonalSearchInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'old', title: 'old', updatedAt: '2026-04-10T08:00:00.000Z' }),
        wp({ id: 'new', title: 'new', updatedAt: '2026-04-22T08:00:00.000Z' }),
      ],
    };
    const out = searchPersonalLayer('', inputs, { limit: 10 });
    expect(out.map((r) => r.id)).toEqual(['new', 'old']);
  });
});
