/**
 * @file journalMarkdownExportService.test.ts
 * @description Locks Phase A.49 — markdown serializer layout +
 * filename safety. The async share wrapper isn't tested here (it
 * crosses the RNFS+Share native boundaries; mocking matches the
 * exportBundleService test pattern of trusting the wrapper once
 * the pure body is exercised).
 *
 * The service module imports `react-native-fs` and `react-native-share`
 * at the top of the file even though we only exercise the pure body
 * here. The jest preset for react-native does not ship default mocks
 * for these modules — re-use the same minimal stubs as
 * exportBundleService.test.ts so the import doesn't crash.
 */

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    TemporaryDirectoryPath: '/tmp/test-tmp',
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue(undefined),
  },
}));

import {
  journalEntryToMarkdown,
  journalMarkdownFileName,
} from '../journalMarkdownExportService';
import type { JournalEntry } from '../../types/journalEntry';

const NOW = new Date(2026, 3, 25, 10, 30, 0); // 2026-04-25 10:30 local

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'j-1',
    createdAt: '2026-04-22T10:00:00.000Z',
    updatedAt: '2026-04-22T11:00:00.000Z',
    entryDate: '2026-04-22',
    mode: 'hunt',
    title: 'Saturday morning sit',
    body: 'Saw three deer crossing the field at first light.',
    outcome: 'sighting',
    tags: ['deer', 'frosty', 'cunningham'],
    photoUris: [],
    ...overrides,
  };
}

describe('journalMarkdownFileName', () => {
  it('builds a date-and-title slug', () => {
    expect(
      journalMarkdownFileName(
        entry({ entryDate: '2026-04-22', title: 'Saturday morning sit' }),
      ),
    ).toBe('journal-2026-04-22-saturday-morning-sit.md');
  });

  it('falls back to "untitled" for empty title', () => {
    expect(
      journalMarkdownFileName(entry({ title: '' })),
    ).toBe('journal-2026-04-22-untitled.md');
  });

  it('strips filesystem-hostile characters', () => {
    expect(
      journalMarkdownFileName(
        entry({ title: 'Cunningham Falls / SP — back trail!' }),
      ),
    ).toBe('journal-2026-04-22-cunningham-falls-sp-back-trail.md');
  });

  it('truncates very long titles to 40 chars', () => {
    expect(
      journalMarkdownFileName(
        entry({
          title: 'a'.repeat(80),
        }),
      ).length,
    ).toBeLessThanOrEqual('journal-2026-04-22-'.length + 40 + '.md'.length);
  });

  it('strips non-numeric chars from a malformed entryDate', () => {
    expect(
      journalMarkdownFileName(
        entry({ entryDate: 'garbage-date', title: 'note' }),
      ),
    ).toMatch(/^journal-/);
  });
});

describe('journalEntryToMarkdown — required sections', () => {
  it('starts with the title as h1 + date/mode/outcome metadata', () => {
    const md = journalEntryToMarkdown(
      entry({ title: 'Cunningham Hunt', mode: 'hunt', outcome: 'sighting', entryDate: '2026-04-22' }),
      NOW,
    );
    expect(md.split('\n')[0]).toBe('# Cunningham Hunt');
    expect(md).toContain('- **Date:** 2026-04-22');
    expect(md).toContain('- **Mode:** Hunt');
    expect(md).toContain('- **Outcome:** Sighting');
  });

  it('falls back to "Untitled entry" when title is empty', () => {
    const md = journalEntryToMarkdown(entry({ title: '' }), NOW);
    expect(md.split('\n')[0]).toBe('# Untitled entry');
  });

  it('always emits a Notes section (even when body is empty)', () => {
    const md = journalEntryToMarkdown(entry({ body: '' }), NOW);
    expect(md).toContain('## Notes');
    expect(md).toContain('_No notes recorded._');
  });

  it('emits the body verbatim under Notes when present', () => {
    const md = journalEntryToMarkdown(
      entry({
        body: 'First line.\n\nSecond paragraph with a *bullet*:\n- one\n- two',
      }),
      NOW,
    );
    expect(md).toContain('## Notes\nFirst line.\n\nSecond paragraph');
    expect(md).toContain('- one\n- two');
  });
});

describe('journalEntryToMarkdown — weather block', () => {
  it('omits the Weather header when no weather is set', () => {
    const md = journalEntryToMarkdown(entry({ weather: undefined }), NOW);
    expect(md).not.toContain('## Weather');
  });

  it('omits when weather object is present but empty', () => {
    const md = journalEntryToMarkdown(entry({ weather: {} }), NOW);
    expect(md).not.toContain('## Weather');
  });

  it('renders all weather fields when present', () => {
    const md = journalEntryToMarkdown(
      entry({
        weather: {
          temperatureF: 38,
          windMph: 8,
          windDirection: 'NW',
          conditions: 'clear',
        },
      }),
      NOW,
    );
    expect(md).toContain('## Weather');
    expect(md).toContain('- **Temp:** 38 °F');
    expect(md).toContain('- **Wind:** 8 mph from NW');
    expect(md).toContain('- **Conditions:** clear');
  });

  it('handles wind direction without speed', () => {
    const md = journalEntryToMarkdown(
      entry({ weather: { windDirection: 'SE' } }),
      NOW,
    );
    expect(md).toContain('- **Wind:** from SE');
  });
});

describe('journalEntryToMarkdown — location block', () => {
  it('omits when neither label nor coords present', () => {
    const md = journalEntryToMarkdown(
      entry({ locationLabel: undefined, lat: undefined, lng: undefined }),
      NOW,
    );
    expect(md).not.toContain('## Location');
  });

  it('renders just the place when coords are missing', () => {
    const md = journalEntryToMarkdown(
      entry({ locationLabel: 'Cunningham Falls SP', lat: undefined, lng: undefined }),
      NOW,
    );
    expect(md).toContain('## Location');
    expect(md).toContain('- **Place:** Cunningham Falls SP');
    expect(md).not.toContain('- **Coords:**');
  });

  it('renders both place and coords when both present (5 dp)', () => {
    const md = journalEntryToMarkdown(
      entry({
        locationLabel: 'Cunningham Falls SP',
        lat: 39.62345678,
        lng: -77.44567,
      }),
      NOW,
    );
    expect(md).toContain('- **Coords:** 39.62346, -77.44567');
  });
});

describe('journalEntryToMarkdown — tags + photos + footer', () => {
  it('omits Tags section when tags array is empty', () => {
    const md = journalEntryToMarkdown(entry({ tags: [] }), NOW);
    expect(md).not.toContain('## Tags');
  });

  it('renders tags as backticked dot-separated chips', () => {
    const md = journalEntryToMarkdown(
      entry({ tags: ['deer', 'frosty', 'cunningham'] }),
      NOW,
    );
    expect(md).toContain('## Tags');
    expect(md).toContain('`deer` · `frosty` · `cunningham`');
  });

  it('omits Photos section when photoUris is empty', () => {
    const md = journalEntryToMarkdown(entry({ photoUris: [] }), NOW);
    expect(md).not.toContain('## Photos');
  });

  it('renders each photoUri as a list item', () => {
    const md = journalEntryToMarkdown(
      entry({
        photoUris: [
          'file:///var/mobile/Containers/Data/Application/abc/Documents/01.jpg',
          'file:///var/mobile/Containers/Data/Application/abc/Documents/02.jpg',
        ],
      }),
      NOW,
    );
    expect(md).toContain('## Photos');
    expect(md).toMatch(/- file:\/\/\/var\/mobile\/.+\/01\.jpg/);
    expect(md).toMatch(/- file:\/\/\/var\/mobile\/.+\/02\.jpg/);
  });

  it('always includes the provenance footer with today\'s date', () => {
    const md = journalEntryToMarkdown(entry(), NOW);
    expect(md).toContain('---');
    expect(md).toMatch(
      /_Exported from MDHuntFishOutdoors .+ \(build .+\) on \d{4}-\d{2}-\d{2}\._/,
    );
  });
});

describe('journalEntryToMarkdown — section order is stable', () => {
  it('keeps Title → Meta → Notes → Weather → Location → Tags → Photos → Footer', () => {
    const md = journalEntryToMarkdown(
      entry({
        title: 'Sample',
        body: 'body',
        weather: { temperatureF: 50 },
        locationLabel: 'Place',
        tags: ['tag'],
        photoUris: ['file:///photo.jpg'],
      }),
      NOW,
    );
    const idxNotes = md.indexOf('## Notes');
    const idxWeather = md.indexOf('## Weather');
    const idxLocation = md.indexOf('## Location');
    const idxTags = md.indexOf('## Tags');
    const idxPhotos = md.indexOf('## Photos');
    const idxFooter = md.indexOf('---');
    expect(idxNotes).toBeGreaterThan(0);
    expect(idxWeather).toBeGreaterThan(idxNotes);
    expect(idxLocation).toBeGreaterThan(idxWeather);
    expect(idxTags).toBeGreaterThan(idxLocation);
    expect(idxPhotos).toBeGreaterThan(idxTags);
    expect(idxFooter).toBeGreaterThan(idxPhotos);
  });
});
