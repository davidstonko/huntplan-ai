/**
 * geoImport — Pure parsers for KML 2.2 and GPX 1.1.
 *
 * V2.3 Phase A.25 (switching-cost reduction).
 *
 * Inverse of geoExport.ts. Accepts a raw text payload from a `.kml` or
 * `.gpx` file the user picked via `react-native-documents`, parses out
 * the geometry primitives we model on-device (Points → waypoints,
 * LineStrings + Polygons → markups), and returns provisional rows the
 * import-preview screen can render. Commit-to-storage is the caller's
 * job — this module never writes.
 *
 * Why regex-and-not-an-XML-parser:
 *   - Adding a fast-xml-parser dep just for two file formats inflates the
 *     bundle and the native-build risk surface (we already saw what an
 *     unused/misnamed dep can do — see npm_package_phantom_2026_04_24).
 *   - The KML/GPX shapes we round-trip through our exporter are narrow
 *     enough that a small set of focused regexes covers every artifact
 *     in the wild (Garmin BaseCamp, OnX, AllTrails, Caltopo, gaiagps).
 *   - We are EXTRACTORS, not validators — when an element doesn't match
 *     our regex it's silently skipped. Honest failure mode: "we could
 *     not parse 3 of the 12 rows in your file, want to import the 9 we
 *     could?"
 *
 * Coordinate convention:
 *   - KML coordinate tokens: `lng,lat[,alt]` whitespace-separated.
 *   - GPX `wpt`/`trkpt` attrs: `lat="..."` `lon="..."`.
 *   - We always store internally as named `lat` / `lng` numbers so the
 *     shapes line up directly with NewWaypointInput / NewMarkupInput.
 *
 * Scope (intentionally narrow for v1):
 *   - KML: Point, LineString, Polygon (outer ring only — inner-ring
 *     holes are dropped with a warning in the parse result).
 *   - GPX: wpt, trk/trkseg/trkpt (treated as LineString markup), rte/rtept
 *     (treated as LineString markup).
 *   - Names from `<name>` come through as title; `<description>` /
 *     `<desc>` becomes notes. Style/color is NOT round-tripped — the
 *     receiving app's defaults take over.
 */

import type { NewWaypointInput } from '../context/UserWaypointContext';
import type { NewMarkupInput } from '../context/UserMarkupContext';
import type {
  WaypointMode,
  WaypointCategory,
} from '../types/userWaypoint';

/** What the parser determined a single row is. */
export type ImportArtifactKind = 'waypoint' | 'line' | 'polygon';

/**
 * One row in the parser's output. Carries enough metadata for the preview
 * screen to render a list, and a discriminator on `kind` so the commit
 * step routes to the right context (`addWaypoint` vs `addMarkup`).
 */
export interface ImportArtifact {
  /** Stable id within this import session (NOT the persisted id). */
  tempId: string;
  kind: ImportArtifactKind;
  /** Human title pulled from <name>; falls back to a synthesized string. */
  title: string;
  /** Free-form notes pulled from <description> / <desc>. May be empty. */
  notes: string;
  /** lat/lng for waypoints. */
  lat?: number;
  lng?: number;
  /** [lng, lat] tuples for lines and polygon outer rings. */
  coordinates?: Array<[number, number]>;
  /** True when the source had inner rings we dropped (polygon only). */
  droppedInnerRings?: boolean;
}

export interface ImportParseResult {
  /** Successfully parsed artifacts. */
  artifacts: ImportArtifact[];
  /** Rows we found but couldn't parse (malformed coordinates, etc). */
  skippedCount: number;
  /**
   * Human-readable warnings (non-fatal) — surfaced on the preview screen
   * so the user knows about dropped inner rings, malformed dates, etc.
   */
  warnings: string[];
  /** 'kml' | 'gpx' | 'unknown' — the format we detected. */
  detectedFormat: 'kml' | 'gpx' | 'unknown';
}

const TEMP_ID_PREFIX = 'import-';
let tempCounter = 0;
function nextTempId(): string {
  tempCounter += 1;
  return `${TEMP_ID_PREFIX}${tempCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Reset the temp-id counter. Exposed for test isolation. */
export function _resetTempIdCounter(): void {
  tempCounter = 0;
}

/** Decode the small set of XML entities we emit on export. */
function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Extract the inner text of the FIRST `<tag>...</tag>` in a haystack. */
function firstTagText(haystack: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = re.exec(haystack);
  if (!m) return '';
  return unescapeXml(m[1].trim());
}

/**
 * Parse a KML coordinate block — whitespace-separated `lng,lat[,alt]` tokens.
 * Returns an array of `[lng, lat]` tuples; tokens that can't be parsed are
 * skipped silently (the calling site validates the result count).
 */
function parseKmlCoordsBlock(raw: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const tok of raw.split(/\s+/)) {
    if (!tok) continue;
    const parts = tok.split(',');
    if (parts.length < 2) continue;
    const lng = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) continue;
    out.push([lng, lat]);
  }
  return out;
}

/** Detect format by sniffing the first ~500 chars. */
export function detectGeoFormat(raw: string): 'kml' | 'gpx' | 'unknown' {
  const head = raw.slice(0, 500).toLowerCase();
  if (head.includes('<kml')) return 'kml';
  if (head.includes('<gpx')) return 'gpx';
  return 'unknown';
}

/**
 * Parse a KML payload into ImportArtifacts.
 *
 * Targets the Placemark wrapper. Each Placemark holds at most one
 * geometry; if the Placemark wraps multiple geometries (multigeometry),
 * we extract them as separate artifacts so the user can include/exclude
 * individually.
 */
export function parseKml(raw: string): ImportParseResult {
  const artifacts: ImportArtifact[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  // Walk every Placemark block independently.
  const placemarkRe = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = placemarkRe.exec(raw)) !== null) {
    const body = pm[1];
    const title = firstTagText(body, 'name') || 'Imported';
    const notes =
      firstTagText(body, 'description') || firstTagText(body, 'desc') || '';

    // Point
    const pointRe = /<Point[^>]*>([\s\S]*?)<\/Point>/gi;
    let pt: RegExpExecArray | null;
    while ((pt = pointRe.exec(body)) !== null) {
      const coordsText = firstTagText(pt[1], 'coordinates');
      const coords = parseKmlCoordsBlock(coordsText);
      if (coords.length === 0) {
        skipped += 1;
        continue;
      }
      const [lng, lat] = coords[0];
      artifacts.push({
        tempId: nextTempId(),
        kind: 'waypoint',
        title,
        notes,
        lat,
        lng,
      });
    }

    // LineString
    const lineRe = /<LineString[^>]*>([\s\S]*?)<\/LineString>/gi;
    let ln: RegExpExecArray | null;
    while ((ln = lineRe.exec(body)) !== null) {
      const coordsText = firstTagText(ln[1], 'coordinates');
      const coords = parseKmlCoordsBlock(coordsText);
      if (coords.length < 2) {
        skipped += 1;
        continue;
      }
      artifacts.push({
        tempId: nextTempId(),
        kind: 'line',
        title,
        notes,
        coordinates: coords,
      });
    }

    // Polygon — outer ring only, inner rings dropped with a warning.
    const polyRe = /<Polygon[^>]*>([\s\S]*?)<\/Polygon>/gi;
    let pg: RegExpExecArray | null;
    while ((pg = polyRe.exec(body)) !== null) {
      const polyBody = pg[1];
      const outerCoordsText = firstTagText(
        firstTagText(polyBody, 'outerBoundaryIs'),
        'coordinates',
      );
      const outer = parseKmlCoordsBlock(outerCoordsText);
      if (outer.length < 4) {
        skipped += 1;
        continue;
      }
      const hasInner = /<innerBoundaryIs/i.test(polyBody);
      if (hasInner) {
        warnings.push(
          `Polygon "${title}" had inner rings (holes) — dropped on import.`,
        );
      }
      artifacts.push({
        tempId: nextTempId(),
        kind: 'polygon',
        title,
        notes,
        coordinates: outer,
        droppedInnerRings: hasInner,
      });
    }
  }

  return {
    artifacts,
    skippedCount: skipped,
    warnings,
    detectedFormat: 'kml',
  };
}

/**
 * Parse a GPX payload into ImportArtifacts.
 *
 * `<wpt>` → waypoint. `<trk>` and `<rte>` both → line markup (we treat
 * routes as another flavor of recorded line — round-tripping via our
 * exporter only ever produces `<trk>` so this is mainly to absorb files
 * from other tools).
 */
export function parseGpx(raw: string): ImportParseResult {
  const artifacts: ImportArtifact[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  // Waypoints
  const wptRe = /<wpt\s+([^>]*?)>([\s\S]*?)<\/wpt>/gi;
  let wpt: RegExpExecArray | null;
  while ((wpt = wptRe.exec(raw)) !== null) {
    const attrs = wpt[1];
    const body = wpt[2];
    const lat = parseFloat(/lat\s*=\s*"([-0-9.]+)"/.exec(attrs)?.[1] ?? '');
    const lng = parseFloat(/lon\s*=\s*"([-0-9.]+)"/.exec(attrs)?.[1] ?? '');
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      skipped += 1;
      continue;
    }
    const title = firstTagText(body, 'name') || 'Imported';
    const notes = firstTagText(body, 'desc') || firstTagText(body, 'cmt') || '';
    artifacts.push({
      tempId: nextTempId(),
      kind: 'waypoint',
      title,
      notes,
      lat,
      lng,
    });
  }

  // Tracks — flatten every trkseg's trkpt into one line per <trk>.
  const trkRe = /<trk\b[^>]*>([\s\S]*?)<\/trk>/gi;
  let tk: RegExpExecArray | null;
  while ((tk = trkRe.exec(raw)) !== null) {
    const body = tk[1];
    const title = firstTagText(body, 'name') || 'Imported track';
    const notes = firstTagText(body, 'desc') || '';
    const coords: Array<[number, number]> = [];
    const trkptRe = /<trkpt\s+([^>]*?)\s*\/?>(?:[\s\S]*?<\/trkpt>)?/gi;
    let tp: RegExpExecArray | null;
    while ((tp = trkptRe.exec(body)) !== null) {
      const attrs = tp[1];
      const lat = parseFloat(/lat\s*=\s*"([-0-9.]+)"/.exec(attrs)?.[1] ?? '');
      const lng = parseFloat(/lon\s*=\s*"([-0-9.]+)"/.exec(attrs)?.[1] ?? '');
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        coords.push([lng, lat]);
      }
    }
    if (coords.length < 2) {
      skipped += 1;
      continue;
    }
    artifacts.push({
      tempId: nextTempId(),
      kind: 'line',
      title,
      notes,
      coordinates: coords,
    });
  }

  // Routes — treated like lines.
  const rteRe = /<rte\b[^>]*>([\s\S]*?)<\/rte>/gi;
  let rt: RegExpExecArray | null;
  while ((rt = rteRe.exec(raw)) !== null) {
    const body = rt[1];
    const title = firstTagText(body, 'name') || 'Imported route';
    const notes = firstTagText(body, 'desc') || '';
    const coords: Array<[number, number]> = [];
    const rteptRe = /<rtept\s+([^>]*?)\s*\/?>(?:[\s\S]*?<\/rtept>)?/gi;
    let rp: RegExpExecArray | null;
    while ((rp = rteptRe.exec(body)) !== null) {
      const attrs = rp[1];
      const lat = parseFloat(/lat\s*=\s*"([-0-9.]+)"/.exec(attrs)?.[1] ?? '');
      const lng = parseFloat(/lon\s*=\s*"([-0-9.]+)"/.exec(attrs)?.[1] ?? '');
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        coords.push([lng, lat]);
      }
    }
    if (coords.length < 2) {
      skipped += 1;
      continue;
    }
    artifacts.push({
      tempId: nextTempId(),
      kind: 'line',
      title,
      notes,
      coordinates: coords,
    });
  }

  return {
    artifacts,
    skippedCount: skipped,
    warnings,
    detectedFormat: 'gpx',
  };
}

/**
 * Format-detecting parse entry point. The screen calls this with the
 * raw text payload; the format-specific functions stay individually
 * unit-testable.
 */
export function parseGeoFile(raw: string): ImportParseResult {
  const fmt = detectGeoFormat(raw);
  if (fmt === 'kml') return parseKml(raw);
  if (fmt === 'gpx') return parseGpx(raw);
  return {
    artifacts: [],
    skippedCount: 0,
    warnings: [
      'Could not detect format. Only KML and GPX files are supported.',
    ],
    detectedFormat: 'unknown',
  };
}

/**
 * Convert a parsed waypoint artifact + chosen target mode into a
 * NewWaypointInput suitable for `addWaypoint`. Category defaults to
 * 'other' for waypoints (the user can re-categorize from the list
 * screen post-import) — guessing from the title would silently mis-
 * classify rows the user trusted us with.
 */
export function artifactToWaypointInput(
  a: ImportArtifact,
  mode: WaypointMode,
): NewWaypointInput | null {
  if (a.kind !== 'waypoint') return null;
  if (a.lat === undefined || a.lng === undefined) return null;
  const category: WaypointCategory = 'other';
  return {
    mode,
    category,
    title: a.title,
    notes: a.notes,
    lat: a.lat,
    lng: a.lng,
  };
}

/**
 * Convert a parsed line artifact + chosen target mode into a
 * NewMarkupInput. Returns null if the source coords don't satisfy
 * `isValidMarkup` minimums (already enforced upstream by the parser
 * but defensive here too).
 */
export function artifactToLineInput(
  a: ImportArtifact,
  mode: WaypointMode,
): NewMarkupInput | null {
  if (a.kind !== 'line') return null;
  if (!a.coordinates || a.coordinates.length < 2) return null;
  return {
    shapeType: 'LineString',
    mode,
    title: a.title,
    notes: a.notes,
    coordinates: a.coordinates,
  };
}

/**
 * Convert a parsed polygon artifact into a NewMarkupInput. Closes the
 * ring (appends the first vertex if the source didn't end with it) so
 * the persisted shape passes `isValidMarkup` (which requires `>= 4`
 * vertices and a closed first/last pair).
 */
export function artifactToPolygonInput(
  a: ImportArtifact,
  mode: WaypointMode,
): NewMarkupInput | null {
  if (a.kind !== 'polygon') return null;
  if (!a.coordinates || a.coordinates.length < 3) return null;
  const ring = a.coordinates.slice();
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  if (ring.length < 4) return null;
  return {
    shapeType: 'Polygon',
    mode,
    title: a.title,
    notes: a.notes,
    coordinates: [ring],
  };
}
