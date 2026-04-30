/**
 * photoGalleryService.test.ts — pure-function contract for the
 * cross-layer photo aggregator.
 */

import {
  PhotoGalleryInputs,
  buildPhotoGallery,
  totalPhotoCount,
} from '../photoGalleryService';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { JournalEntry } from '../../types/journalEntry';

function emptyInputs(): PhotoGalleryInputs {
  return {
    waypoints: [],
    journalEntries: [],
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

describe('totalPhotoCount', () => {
  it('returns 0 for empty inputs', () => {
    expect(totalPhotoCount(emptyInputs())).toBe(0);
  });

  it('counts photos across both source kinds', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [
        wp({ photoUris: ['file://a.jpg', 'file://b.jpg'] }),
        wp({ id: 'w2', photoUris: ['file://c.jpg'] }),
      ],
      journalEntries: [
        je({ photoUris: ['file://d.jpg'] }),
      ],
    };
    expect(totalPhotoCount(inputs)).toBe(4);
  });

  it('ignores empty / whitespace-only URIs', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [wp({ photoUris: ['', '   ', 'file://real.jpg'] })],
      journalEntries: [],
    };
    expect(totalPhotoCount(inputs)).toBe(1);
  });
});

describe('buildPhotoGallery', () => {
  it('returns empty array when no photos exist', () => {
    expect(buildPhotoGallery(emptyInputs())).toEqual([]);
  });

  it('flattens multi-photo source rows into one item per photo', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [
        wp({ id: 'w1', photoUris: ['file://a.jpg', 'file://b.jpg', 'file://c.jpg'] }),
      ],
      journalEntries: [],
    };
    const out = buildPhotoGallery(inputs);
    expect(out).toHaveLength(3);
    expect(out.map((p) => p.uri)).toEqual([
      'file://a.jpg', 'file://b.jpg', 'file://c.jpg',
    ]);
    expect(out.map((p) => p.id)).toEqual([
      'waypoint:w1:0', 'waypoint:w1:1', 'waypoint:w1:2',
    ]);
  });

  it('mixes both source kinds into one feed', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [wp({ photoUris: ['file://wp.jpg'] })],
      journalEntries: [je({ photoUris: ['file://jr.jpg'] })],
    };
    const out = buildPhotoGallery(inputs);
    expect(out.map((p) => p.kind).sort()).toEqual(['journal', 'waypoint']);
  });

  it('sorts by source timestamp DESC (newest first)', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [
        wp({ id: 'old', updatedAt: '2026-04-01T08:00:00.000Z', photoUris: ['file://old.jpg'] }),
        wp({ id: 'new', updatedAt: '2026-04-22T08:00:00.000Z', photoUris: ['file://new.jpg'] }),
      ],
      journalEntries: [],
    };
    const out = buildPhotoGallery(inputs);
    expect(out.map((p) => p.uri)).toEqual(['file://new.jpg', 'file://old.jpg']);
  });

  it('keeps multi-photo entries in authored order even when timestamps tie', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [
        wp({ id: 'w1', updatedAt: '2026-04-22T08:00:00.000Z',
             photoUris: ['file://1.jpg', 'file://2.jpg', 'file://3.jpg'] }),
      ],
      journalEntries: [],
    };
    const out = buildPhotoGallery(inputs);
    expect(out.map((p) => p.uri)).toEqual([
      'file://1.jpg', 'file://2.jpg', 'file://3.jpg',
    ]);
  });

  it('filters by mode strictly', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [
        wp({ id: 'h', mode: 'hunt', photoUris: ['file://h.jpg'] }),
        wp({ id: 'f', mode: 'fish', photoUris: ['file://f.jpg'] }),
      ],
      journalEntries: [],
    };
    const out = buildPhotoGallery(inputs, { mode: 'hunt' });
    expect(out).toHaveLength(1);
    expect(out[0].uri).toBe('file://h.jpg');
  });

  it('filters by source kind', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [wp({ photoUris: ['file://wp.jpg'] })],
      journalEntries: [je({ photoUris: ['file://jr.jpg'] })],
    };
    const wpOnly = buildPhotoGallery(inputs, { kinds: ['waypoint'] });
    expect(wpOnly).toHaveLength(1);
    expect(wpOnly[0].kind).toBe('waypoint');

    const jrOnly = buildPhotoGallery(inputs, { kinds: ['journal'] });
    expect(jrOnly).toHaveLength(1);
    expect(jrOnly[0].kind).toBe('journal');
  });

  it('caption includes outcome label for journal photos', () => {
    const inputs: PhotoGalleryInputs = {
      ...emptyInputs(),
      journalEntries: [
        je({ title: 'Big buck', outcome: 'harvest', photoUris: ['file://b.jpg'] }),
      ],
    };
    const out = buildPhotoGallery(inputs);
    expect(out[0].caption).toBe('Big buck (Harvest)');
  });

  it('caption falls back to "Untitled entry" / "Waypoint" when blank', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [wp({ title: '', photoUris: ['file://1.jpg'] })],
      journalEntries: [
        je({ title: '   ', outcome: 'note', photoUris: ['file://2.jpg'] }),
      ],
    };
    const out = buildPhotoGallery(inputs);
    const wpItem = out.find((p) => p.kind === 'waypoint')!;
    const jrItem = out.find((p) => p.kind === 'journal')!;
    expect(wpItem.caption).toBe('Waypoint');
    expect(jrItem.caption).toBe('Untitled entry (Note)');
  });

  it('drops empty / whitespace-only URIs', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [wp({ photoUris: ['', '   ', 'file://real.jpg'] })],
      journalEntries: [],
    };
    const out = buildPhotoGallery(inputs);
    expect(out).toHaveLength(1);
    expect(out[0].uri).toBe('file://real.jpg');
  });

  it('honors limit option', () => {
    const inputs: PhotoGalleryInputs = {
      waypoints: [
        wp({ photoUris: Array.from({ length: 10 }, (_, i) => `file://${i}.jpg`) }),
      ],
      journalEntries: [],
    };
    const out = buildPhotoGallery(inputs, { limit: 3 });
    expect(out).toHaveLength(3);
  });
});
