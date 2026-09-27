/**
 * Guard: the per-mode selectors must recompute when their data changes.
 *
 * 2026-09-20 simulator pass. Tapping "Load sample data" on the Log tab
 * seeded a track, three waypoints, a journal entry and a checklist, and
 * the Waypoints badge kept reading 0. Cause: every `*ForMode` selector
 * was `useCallback((mode) => someRef.current.filter(...), [])`, so its
 * identity never changed. Consumers memoize on that identity — the Log
 * tab's badge counts, `UserWaypointLayer`, `UserMarkupLayer`,
 * `JournalListScreen` — so none of them recomputed when rows were
 * written after mount. A dropped pin did not reach the screen until the
 * screen remounted.
 *
 * tsc and the whole jest suite were green through all of it: the context
 * tests in this folder drive AsyncStorage directly and never render the
 * hook, so nothing exercised the memoization. Until a React renderer
 * lands (see UserWaypointContext.test.tsx header), this is a static
 * guard in the same style as wiringIntegrity: read the source, assert
 * the selector cannot go stale.
 */
import fs from 'fs';
import path from 'path';

const CONTEXT_DIR = path.resolve(__dirname, '..');

/** file -> the selector defined in it */
const SELECTORS: ReadonlyArray<readonly [string, string]> = [
  ['UserWaypointContext.tsx', 'waypointsForMode'],
  ['JournalEntryContext.tsx', 'entriesForMode'],
  ['TrackRecorderContext.tsx', 'tracksForMode'],
  ['UserMarkupContext.tsx', 'markupsForMode'],
  ['GearChecklistContext.tsx', 'checklistsForMode'],
];

/** The `useCallback(...)` call body for `name`, from its file's source. */
function selectorBody(source: string, name: string): string {
  const start = source.indexOf(`const ${name} = useCallback(`);
  if (start === -1) {
    throw new Error(`${name} is not a useCallback — update this guard`);
  }
  // Walk to the matching close paren of the useCallback( call.
  const open = source.indexOf('(', source.indexOf('useCallback', start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '(') depth += 1;
    else if (source[i] === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced parens around ${name}`);
}

describe.each(SELECTORS)('%s / %s stays fresh', (file, name) => {
  const source = fs.readFileSync(path.join(CONTEXT_DIR, file), 'utf8');
  const body = selectorBody(source, name);

  it('does not read through a ref (a ref read cannot invalidate the memo)', () => {
    expect(body).not.toMatch(/Ref\.current/);
  });

  it('declares a non-empty dependency array', () => {
    // The dep array is the last [...] in the useCallback call.
    const deps = body.match(/\[[^[\]]*\]\s*,?\s*\)$/);
    expect(deps).not.toBeNull();
    expect((deps as RegExpMatchArray)[0]).not.toMatch(/\[\s*\]/);
  });

  it('depends on the state array it filters', () => {
    const filtered = body.match(/(\w+)\.filter\(/);
    expect(filtered).not.toBeNull();
    const arrayName = (filtered as RegExpMatchArray)[1];
    const deps = body.slice(body.lastIndexOf('['));
    expect(deps).toContain(arrayName);
  });
});
