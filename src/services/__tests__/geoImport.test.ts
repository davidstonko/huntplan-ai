/**
 * Tests for geoImport — V2.3 Phase A.25.
 *
 * Locks the parser surface for KML 2.2 + GPX 1.1 and the converter
 * surface that hands artifacts to the UserWaypoint / UserMarkup
 * contexts. The round-trip suite is the load-bearing one: anything we
 * can EXPORT, we must be able to RE-IMPORT into shapes that addWaypoint
 * / addMarkup will accept. A regression that breaks that contract would
 * silently strand user backups that go through a third tool.
 */

import {
  detectGeoFormat,
  parseKml,
  parseGpx,
  parseGeoFile,
  artifactToWaypointInput,
  artifactToLineInput,
  artifactToPolygonInput,
  _resetTempIdCounter,
} from '../geoImport';
import { buildKml, buildGpx } from '../geoExport';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { UserMarkup } from '../../types/userMarkup';

beforeEach(() => {
  _resetTempIdCounter();
});

// ────────────────────────── detectGeoFormat ──────────────────────────

describe('detectGeoFormat', () => {
  test('detects kml from <kml header', () => {
    const raw = `<?xml version="1.0"?>\n<kml xmlns="...">`;
    expect(detectGeoFormat(raw)).toBe('kml');
  });

  test('detects gpx from <gpx header', () => {
    const raw = `<?xml version="1.0"?>\n<gpx version="1.1">`;
    expect(detectGeoFormat(raw)).toBe('gpx');
  });

  test('returns unknown for an arbitrary text payload', () => {
    expect(detectGeoFormat('this is not xml')).toBe('unknown');
  });

  test('case-insensitive header sniff', () => {
    expect(detectGeoFormat(`<KML xmlns="...">`)).toBe('kml');
    expect(detectGeoFormat(`<GPX version="1.1">`)).toBe('gpx');
  });
});

// ────────────────────────── parseKml ──────────────────────────

describe('parseKml', () => {
  test('extracts a Point Placemark as a waypoint artifact', () => {
    const kml = `
      <kml><Document>
        <Placemark>
          <name>North Stand</name>
          <description>Rubs to east</description>
          <Point><coordinates>-77.1,39.2,0</coordinates></Point>
        </Placemark>
      </Document></kml>`;
    const r = parseKml(kml);
    expect(r.detectedFormat).toBe('kml');
    expect(r.artifacts).toHaveLength(1);
    expect(r.artifacts[0].kind).toBe('waypoint');
    expect(r.artifacts[0].title).toBe('North Stand');
    expect(r.artifacts[0].notes).toBe('Rubs to east');
    expect(r.artifacts[0].lat).toBeCloseTo(39.2);
    expect(r.artifacts[0].lng).toBeCloseTo(-77.1);
  });

  test('extracts a LineString Placemark as a line artifact', () => {
    const kml = `
      <kml><Document>
        <Placemark>
          <name>Shoot Lane</name>
          <LineString>
            <coordinates>-77.1,39.2,0 -77.09,39.21,0 -77.08,39.22,0</coordinates>
          </LineString>
        </Placemark>
      </Document></kml>`;
    const r = parseKml(kml);
    expect(r.artifacts).toHaveLength(1);
    expect(r.artifacts[0].kind).toBe('line');
    expect(r.artifacts[0].coordinates).toHaveLength(3);
    expect(r.artifacts[0].coordinates![0]).toEqual([-77.1, 39.2]);
  });

  test('extracts a Polygon Placemark (outer ring only)', () => {
    const kml = `
      <kml><Document>
        <Placemark>
          <name>Property</name>
          <Polygon>
            <outerBoundaryIs><LinearRing><coordinates>
              -77,39,0 -76.9,39,0 -76.9,39.1,0 -77,39.1,0 -77,39,0
            </coordinates></LinearRing></outerBoundaryIs>
          </Polygon>
        </Placemark>
      </Document></kml>`;
    const r = parseKml(kml);
    expect(r.artifacts).toHaveLength(1);
    expect(r.artifacts[0].kind).toBe('polygon');
    expect(r.artifacts[0].coordinates).toHaveLength(5);
    expect(r.artifacts[0].droppedInnerRings).toBeFalsy();
  });

  test('flags inner rings as dropped and surfaces a warning', () => {
    const kml = `
      <kml><Document>
        <Placemark>
          <name>Donut</name>
          <Polygon>
            <outerBoundaryIs><LinearRing><coordinates>
              -77,39,0 -76.9,39,0 -76.9,39.1,0 -77,39.1,0 -77,39,0
            </coordinates></LinearRing></outerBoundaryIs>
            <innerBoundaryIs><LinearRing><coordinates>
              -76.95,39.05,0 -76.92,39.05,0 -76.92,39.08,0 -76.95,39.08,0 -76.95,39.05,0
            </coordinates></LinearRing></innerBoundaryIs>
          </Polygon>
        </Placemark>
      </Document></kml>`;
    const r = parseKml(kml);
    expect(r.artifacts).toHaveLength(1);
    expect(r.artifacts[0].droppedInnerRings).toBe(true);
    expect(r.warnings.some((w) => /inner rings/i.test(w))).toBe(true);
  });

  test('skips Points with malformed coordinates', () => {
    const kml = `
      <kml><Document>
        <Placemark>
          <name>Bad</name>
          <Point><coordinates>not-a-coordinate</coordinates></Point>
        </Placemark>
      </Document></kml>`;
    const r = parseKml(kml);
    expect(r.artifacts).toHaveLength(0);
    expect(r.skippedCount).toBe(1);
  });

  test('skips lines with fewer than 2 valid coords', () => {
    const kml = `
      <kml><Document>
        <Placemark>
          <name>One-pt line</name>
          <LineString><coordinates>-77.1,39.2,0</coordinates></LineString>
        </Placemark>
      </Document></kml>`;
    const r = parseKml(kml);
    expect(r.artifacts).toHaveLength(0);
    expect(r.skippedCount).toBe(1);
  });

  test('falls back to "Imported" when <name> is missing', () => {
    const kml = `
      <kml><Document>
        <Placemark>
          <Point><coordinates>-77.1,39.2,0</coordinates></Point>
        </Placemark>
      </Document></kml>`;
    const r = parseKml(kml);
    expect(r.artifacts[0].title).toBe('Imported');
  });

  test('rejects out-of-bounds lat/lng silently', () => {
    const kml = `
      <kml><Document>
        <Placemark>
          <name>Mars</name>
          <Point><coordinates>500,200,0</coordinates></Point>
        </Placemark>
      </Document></kml>`;
    const r = parseKml(kml);
    expect(r.skippedCount).toBe(1);
  });
});

// ────────────────────────── parseGpx ──────────────────────────

describe('parseGpx', () => {
  test('extracts <wpt> as waypoint artifact with desc as notes', () => {
    const gpx = `
      <gpx version="1.1">
        <wpt lat="39.2" lon="-77.1">
          <name>North Stand</name>
          <desc>Rubs to east</desc>
        </wpt>
      </gpx>`;
    const r = parseGpx(gpx);
    expect(r.detectedFormat).toBe('gpx');
    expect(r.artifacts).toHaveLength(1);
    expect(r.artifacts[0].kind).toBe('waypoint');
    expect(r.artifacts[0].lat).toBeCloseTo(39.2);
    expect(r.artifacts[0].lng).toBeCloseTo(-77.1);
    expect(r.artifacts[0].notes).toBe('Rubs to east');
  });

  test('extracts <trk>/<trkseg>/<trkpt> as a line artifact', () => {
    const gpx = `
      <gpx version="1.1">
        <trk>
          <name>Loop</name>
          <trkseg>
            <trkpt lat="39.20" lon="-77.10"></trkpt>
            <trkpt lat="39.21" lon="-77.09"></trkpt>
            <trkpt lat="39.22" lon="-77.08"></trkpt>
          </trkseg>
        </trk>
      </gpx>`;
    const r = parseGpx(gpx);
    expect(r.artifacts).toHaveLength(1);
    expect(r.artifacts[0].kind).toBe('line');
    expect(r.artifacts[0].title).toBe('Loop');
    expect(r.artifacts[0].coordinates).toHaveLength(3);
    expect(r.artifacts[0].coordinates![0]).toEqual([-77.1, 39.2]);
  });

  test('extracts <rte>/<rtept> as a line artifact', () => {
    const gpx = `
      <gpx version="1.1">
        <rte>
          <name>Planned Route</name>
          <rtept lat="39.20" lon="-77.10"/>
          <rtept lat="39.21" lon="-77.09"/>
        </rte>
      </gpx>`;
    const r = parseGpx(gpx);
    expect(r.artifacts).toHaveLength(1);
    expect(r.artifacts[0].kind).toBe('line');
    expect(r.artifacts[0].title).toBe('Planned Route');
    expect(r.artifacts[0].coordinates).toHaveLength(2);
  });

  test('skips <wpt> with out-of-bounds attrs', () => {
    const gpx = `
      <gpx version="1.1">
        <wpt lat="500" lon="-77.1"><name>Mars</name></wpt>
      </gpx>`;
    const r = parseGpx(gpx);
    expect(r.artifacts).toHaveLength(0);
    expect(r.skippedCount).toBe(1);
  });

  test('skips tracks with < 2 trkpts', () => {
    const gpx = `
      <gpx version="1.1">
        <trk><name>Stub</name><trkseg>
          <trkpt lat="39.2" lon="-77.1"></trkpt>
        </trkseg></trk>
      </gpx>`;
    const r = parseGpx(gpx);
    expect(r.artifacts).toHaveLength(0);
    expect(r.skippedCount).toBe(1);
  });

  test('falls back to "Imported track" when <name> is missing', () => {
    const gpx = `
      <gpx version="1.1">
        <trk><trkseg>
          <trkpt lat="39.2" lon="-77.1"></trkpt>
          <trkpt lat="39.21" lon="-77.09"></trkpt>
        </trkseg></trk>
      </gpx>`;
    const r = parseGpx(gpx);
    expect(r.artifacts[0].title).toBe('Imported track');
  });
});

// ────────────────────────── parseGeoFile ──────────────────────────

describe('parseGeoFile', () => {
  test('dispatches to parseKml on a kml payload', () => {
    const r = parseGeoFile(
      `<kml><Document><Placemark><Point><coordinates>-77,39,0</coordinates></Point></Placemark></Document></kml>`,
    );
    expect(r.detectedFormat).toBe('kml');
    expect(r.artifacts).toHaveLength(1);
  });

  test('dispatches to parseGpx on a gpx payload', () => {
    const r = parseGeoFile(
      `<gpx version="1.1"><wpt lat="39" lon="-77"><name>x</name></wpt></gpx>`,
    );
    expect(r.detectedFormat).toBe('gpx');
    expect(r.artifacts).toHaveLength(1);
  });

  test('returns unknown-format with a helpful warning', () => {
    const r = parseGeoFile('hello world');
    expect(r.detectedFormat).toBe('unknown');
    expect(r.artifacts).toHaveLength(0);
    expect(r.warnings[0]).toMatch(/KML and GPX/);
  });
});

// ────────────────────────── converters ──────────────────────────

describe('artifactToWaypointInput', () => {
  test('produces a NewWaypointInput with mode propagated and category=other', () => {
    const r = parseKml(
      `<kml><Document><Placemark><name>North Stand</name><Point><coordinates>-77.1,39.2,0</coordinates></Point></Placemark></Document></kml>`,
    );
    const wp = artifactToWaypointInput(r.artifacts[0], 'hunt');
    expect(wp).not.toBeNull();
    expect(wp!.mode).toBe('hunt');
    expect(wp!.category).toBe('other');
    expect(wp!.title).toBe('North Stand');
    expect(wp!.lat).toBeCloseTo(39.2);
    expect(wp!.lng).toBeCloseTo(-77.1);
  });

  test('returns null on a non-waypoint artifact', () => {
    const r = parseKml(
      `<kml><Document><Placemark><LineString><coordinates>-77.1,39.2,0 -77.09,39.21,0</coordinates></LineString></Placemark></Document></kml>`,
    );
    expect(artifactToWaypointInput(r.artifacts[0], 'hunt')).toBeNull();
  });
});

describe('artifactToLineInput', () => {
  test('produces a NewMarkupInput LineString with mode propagated', () => {
    const r = parseKml(
      `<kml><Document><Placemark><name>Lane</name><LineString><coordinates>-77.1,39.2,0 -77.09,39.21,0</coordinates></LineString></Placemark></Document></kml>`,
    );
    const ln = artifactToLineInput(r.artifacts[0], 'hike');
    expect(ln).not.toBeNull();
    expect(ln!.shapeType).toBe('LineString');
    expect(ln!.mode).toBe('hike');
    if (ln!.shapeType === 'LineString') {
      expect(ln!.coordinates).toHaveLength(2);
    }
  });
});

describe('artifactToPolygonInput', () => {
  test('produces a NewMarkupInput Polygon and closes the ring if open', () => {
    // Hand-craft an OPEN polygon artifact (parser already accepts open
    // outer rings as long as they have >= 4 vertices) — converter should
    // close it.
    const r = parseKml(
      `<kml><Document><Placemark><name>Open</name><Polygon><outerBoundaryIs><LinearRing><coordinates>
        -77,39,0 -76.9,39,0 -76.9,39.1,0 -77,39.1,0
      </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`,
    );
    expect(r.artifacts[0].coordinates).toHaveLength(4);
    const pg = artifactToPolygonInput(r.artifacts[0], 'camp');
    expect(pg).not.toBeNull();
    expect(pg!.shapeType).toBe('Polygon');
    if (pg!.shapeType === 'Polygon') {
      const ring = pg!.coordinates[0];
      expect(ring).toHaveLength(5);
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
  });

  test('returns null for a degenerate polygon (< 3 vertices)', () => {
    // Build the artifact directly — the parser rejects < 4 vertices, but
    // we want defense-in-depth on the converter too.
    const a = {
      tempId: 't1',
      kind: 'polygon' as const,
      title: 't',
      notes: '',
      coordinates: [
        [-77, 39] as [number, number],
        [-76.9, 39] as [number, number],
      ],
    };
    expect(artifactToPolygonInput(a, 'camp')).toBeNull();
  });
});

// ────────────────────────── round-trip ──────────────────────────

describe('round-trip identity (export → import)', () => {
  const wp: UserWaypoint = {
    id: 'wp1',
    createdAt: '',
    updatedAt: '',
    mode: 'hunt',
    category: 'tree-stand',
    title: 'North Stand',
    notes: 'rubs to east',
    lat: 39.2,
    lng: -77.1,
    photoUris: [],
  };
  const line: UserMarkup = {
    id: 'l1',
    createdAt: '',
    updatedAt: '',
    mode: 'hike',
    title: 'Shoot Lane',
    shapeType: 'LineString',
    coordinates: [
      [-77.1, 39.2],
      [-77.09, 39.21],
      [-77.08, 39.22],
    ],
  };
  const poly: UserMarkup = {
    id: 'p1',
    createdAt: '',
    updatedAt: '',
    mode: 'camp',
    title: 'Property',
    shapeType: 'Polygon',
    coordinates: [
      [
        [-77, 39],
        [-76.9, 39],
        [-76.9, 39.1],
        [-77, 39.1],
        [-77, 39],
      ],
    ],
  };

  test('KML round-trip preserves count, kinds, and titles', () => {
    const kml = buildKml({ waypoints: [wp], markups: [line, poly] });
    const r = parseKml(kml);
    expect(r.artifacts).toHaveLength(3);
    const titles = r.artifacts.map((a) => a.title).sort();
    expect(titles).toEqual(['North Stand', 'Property', 'Shoot Lane']);
    const kinds = r.artifacts.map((a) => a.kind).sort();
    expect(kinds).toEqual(['line', 'polygon', 'waypoint']);
  });

  test('KML round-trip preserves waypoint coords within tolerance', () => {
    const kml = buildKml({ waypoints: [wp], markups: [] });
    const r = parseKml(kml);
    const out = r.artifacts.find((a) => a.kind === 'waypoint')!;
    expect(out.lat).toBeCloseTo(wp.lat, 5);
    expect(out.lng).toBeCloseTo(wp.lng, 5);
  });

  test('GPX round-trip preserves <wpt> + <trk> as waypoint + line', () => {
    const gpx = buildGpx({ waypoints: [wp], markups: [line] });
    const r = parseGpx(gpx);
    expect(r.artifacts).toHaveLength(2);
    const wpA = r.artifacts.find((a) => a.kind === 'waypoint');
    const lnA = r.artifacts.find((a) => a.kind === 'line');
    expect(wpA).toBeDefined();
    expect(lnA).toBeDefined();
    expect(wpA!.lat).toBeCloseTo(wp.lat, 5);
    expect(lnA!.coordinates!.length).toBe(line.coordinates.length);
  });

  test('GPX round-trip turns polygon into a line (lossy by design)', () => {
    // GPX has no native polygon — buildGpx writes polygons as <trk> with
    // <type>polygon</type> for human readers, but we re-import them as
    // a line artifact (the round-trip note in geoExport.ts).
    const gpx = buildGpx({ waypoints: [], markups: [poly] });
    const r = parseGpx(gpx);
    expect(r.artifacts).toHaveLength(1);
    expect(r.artifacts[0].kind).toBe('line');
    // The closed ring's last vertex equals the first.
    const c = r.artifacts[0].coordinates!;
    expect(c[0]).toEqual(c[c.length - 1]);
  });
});
