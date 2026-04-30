/**
 * journalTagService.test.ts — pure-function contract for the journal
 * tag analytics + filter helpers.
 */

import {
  entriesWithTag,
  normalizeTag,
  tagFrequency,
} from '../journalTagService';
import type { JournalEntry } from '../../types/journalEntry';

function je(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    id: 'j1',
    createdAt: '2026-04-23T22:00:00.000Z',
    updatedAt: '2026-04-23T22:00:00.000Z',
    entryDate: '2026-04-23',
    mode: 'hunt',
    title: 'Evening sit',
    body: '',
    outcome: 'sighting',
    tags: [],
    photoUris: [],
    ...overrides,
  };
}

describe('normalizeTag', () => {
  it('returns "" for null / undefined / empty / whitespace', () => {
    expect(normalizeTag(null)).toBe('');
    expect(normalizeTag(undefined)).toBe('');
    expect(normalizeTag('')).toBe('');
    expect(normalizeTag('   ')).toBe('');
  });

  it('lowercases + trims', () => {
    expect(normalizeTag('  Archery  ')).toBe('archery');
  });

  it('collapses internal whitespace to single space', () => {
    expect(normalizeTag('big   buck')).toBe('big buck');
  });
});

describe('tagFrequency', () => {
  it('returns empty array when no entries', () => {
    expect(tagFrequency([])).toEqual([]);
  });

  it('returns empty array when no tags on any entry', () => {
    expect(tagFrequency([je({ tags: [] }), je({ id: 'j2', tags: [] })])).toEqual([]);
  });

  it('counts tag occurrences across entries', () => {
    const entries = [
      je({ id: 'a', tags: ['archery', 'cedar'] }),
      je({ id: 'b', tags: ['archery'] }),
      je({ id: 'c', tags: ['cedar', 'striper'] }),
    ];
    const out = tagFrequency(entries);
    const map = new Map(out.map((t) => [t.key, t.count]));
    expect(map.get('archery')).toBe(2);
    expect(map.get('cedar')).toBe(2);
    expect(map.get('striper')).toBe(1);
  });

  it('groups case-variant tags under one canonical key', () => {
    const entries = [
      je({ id: 'a', tags: ['Archery'] }),
      je({ id: 'b', tags: ['archery'] }),
      je({ id: 'c', tags: ['ARCHERY'] }),
    ];
    const out = tagFrequency(entries);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('archery');
    expect(out[0].count).toBe(3);
  });

  it('sorts by count DESC, then lastUsedAt DESC, then key ASC', () => {
    const entries = [
      je({ id: 'a', entryDate: '2026-04-01', tags: ['alpha'] }),
      je({ id: 'b', entryDate: '2026-04-22', tags: ['beta'] }),
      je({ id: 'c', entryDate: '2026-04-23', tags: ['gamma'] }),
      je({ id: 'd', entryDate: '2026-04-23', tags: ['gamma'] }),
    ];
    const out = tagFrequency(entries);
    // gamma=2 first; then alpha vs beta tied at 1 → beta is newer → beta then alpha
    expect(out.map((t) => t.key)).toEqual(['gamma', 'beta', 'alpha']);
  });

  it('display casing follows the most-recent entry', () => {
    const entries = [
      je({ id: 'old', entryDate: '2026-04-10', tags: ['Archery'] }),
      je({ id: 'new', entryDate: '2026-04-22', tags: ['archery'] }),
    ];
    const out = tagFrequency(entries);
    expect(out[0].tag).toBe('archery');
  });

  it('tracks distinct modes a tag has been applied to', () => {
    const entries = [
      je({ id: 'a', mode: 'hunt', tags: ['cedar'] }),
      je({ id: 'b', mode: 'fish', tags: ['cedar'] }),
      je({ id: 'c', mode: 'hunt', tags: ['cedar'] }),
    ];
    const out = tagFrequency(entries);
    expect(out[0].modes.sort()).toEqual(['fish', 'hunt']);
  });

  it('filters by mode strictly when opts.mode set', () => {
    const entries = [
      je({ id: 'a', mode: 'hunt', tags: ['cedar'] }),
      je({ id: 'b', mode: 'fish', tags: ['cedar', 'striper'] }),
    ];
    const huntOnly = tagFrequency(entries, { mode: 'hunt' });
    expect(huntOnly).toHaveLength(1);
    expect(huntOnly[0].key).toBe('cedar');
    expect(huntOnly[0].count).toBe(1);
  });

  it('honors limit option', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      je({ id: `e${i}`, tags: [`tag-${i}`] }),
    );
    const out = tagFrequency(entries, { limit: 3 });
    expect(out).toHaveLength(3);
  });

  it('drops empty / whitespace tag values defensively', () => {
    const entries = [je({ tags: ['', '  ', 'real'] })];
    const out = tagFrequency(entries);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('real');
  });
});

describe('entriesWithTag', () => {
  it('returns empty array for empty inputs', () => {
    expect(entriesWithTag([], 'cedar')).toEqual([]);
  });

  it('returns empty array for empty tag query', () => {
    const entries = [je({ tags: ['cedar'] })];
    expect(entriesWithTag(entries, '')).toEqual([]);
    expect(entriesWithTag(entries, '   ')).toEqual([]);
  });

  it('matches case-insensitively', () => {
    const entries = [
      je({ id: 'a', tags: ['Archery'] }),
      je({ id: 'b', tags: ['archery'] }),
      je({ id: 'c', tags: ['cedar'] }),
    ];
    const out = entriesWithTag(entries, 'ARCHERY');
    expect(out.map((e) => e.id).sort()).toEqual(['a', 'b']);
  });

  it('preserves original ordering of input array', () => {
    const entries = [
      je({ id: 'first', tags: ['cedar'] }),
      je({ id: 'second', tags: ['cedar'] }),
      je({ id: 'third', tags: ['other'] }),
    ];
    const out = entriesWithTag(entries, 'cedar');
    expect(out.map((e) => e.id)).toEqual(['first', 'second']);
  });
});
