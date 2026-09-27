/**
 * Every screen that opens an Amazon affiliate link must disclose it on screen.
 *
 * The app carries 228 tagged product links across 147 ASINs. The Amazon
 * Associates Operating Agreement requires a conspicuous statement wherever
 * those links appear, and the FTC endorsement guides require the material
 * connection be disclosed at the point the user could act on it. Two of the
 * three screens that open tagged links had one; ATTripPlannerScreen's gear
 * bundle did not, so a hiker could tap straight through to a tagged link with
 * nothing on screen saying why.
 *
 * This is a static source check in the wiringIntegrity style rather than a
 * render test, because the failure mode is a NEW screen shipping links without
 * the sentence, which no existing render test would ever exercise.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');

/** Source markers that mean "this file sends a user to a tagged Amazon URL". */
const LINK_MARKERS = [
  'affiliateUrl',
  'amazonLink(',
  'amazonUrl(',
  'amazon.com/dp',
];

/** Any of these phrasings satisfies the disclosure. */
const DISCLOSURE_MARKERS = [
  'Amazon Associate',
  'referral commission',
  'qualifying purchases',
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/** Strip comments so a mention inside a code comment never counts as shown. */
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('Amazon affiliate disclosure', () => {
  const files = [
    ...walk(path.join(SRC, 'screens')),
    ...walk(path.join(SRC, 'components')),
  ];

  const linking = files.filter((f) => {
    const body = withoutComments(fs.readFileSync(f, 'utf8'));
    return LINK_MARKERS.some((m) => body.includes(m));
  });

  it('finds the screens that open tagged links', () => {
    // If this drops to zero the markers above have gone stale and every
    // assertion below would pass vacuously.
    expect(linking.length).toBeGreaterThan(0);
  });

  it.each(
    // Lazily resolved at describe time; each entry is one linking file.
    (() => {
      const body = [
        ...walk(path.join(SRC, 'screens')),
        ...walk(path.join(SRC, 'components')),
      ].filter((f) => {
        const s = withoutComments(fs.readFileSync(f, 'utf8'));
        return LINK_MARKERS.some((m) => s.includes(m));
      });
      return body.map((f) => [path.relative(SRC, f), f] as const);
    })(),
  )('%s discloses the affiliate relationship', (_rel, file) => {
    const body = withoutComments(fs.readFileSync(file as string, 'utf8'));
    const hasDisclosure = DISCLOSURE_MARKERS.some((m) => body.includes(m));
    expect(hasDisclosure).toBe(true);
  });

  it('never hides the disclosure in a comment', () => {
    // A disclosure that only exists in a code comment is not shown to anyone.
    for (const file of linking) {
      const raw = fs.readFileSync(file, 'utf8');
      const stripped = withoutComments(raw);
      const inRaw = DISCLOSURE_MARKERS.some((m) => raw.includes(m));
      const inStripped = DISCLOSURE_MARKERS.some((m) => stripped.includes(m));
      if (inRaw) expect(inStripped).toBe(true);
    }
  });
});
