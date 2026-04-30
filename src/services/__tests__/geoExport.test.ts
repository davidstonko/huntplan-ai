/**
 * geoExport — KML + GPX export contract tests.
 */

import { buildKml, buildGpx, escapeXml, hexToKmlColor } from '../geoExport';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { UserMarkup } from '../../types/userMarkup';

const wp1: UserWaypoint = {
  id: 'wp1',
  createdAt: '',
  updatedAt: '',
  mode: 'hunt',
  category: 'tree-stand',
  title: 'North Stand',
  notes: 'rubs east 50m',
  lat: 39.2,
  lng: -77.1,
  photoUris: [],
};

const line: UserMarkup = {
  id: 'l1',
  createdAt: '',
  updatedAt: '',
  mode: 'hunt',
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

describe('escapeXml', () => {
  it('escapes the five reserved XML chars', () => {
    expect(escapeXml(`A & B < C > "D" 'E'`)).toBe(
      'A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;',
    );
  });
});

describe('hexToKmlColor', () => {
  it('converts #ff8800 to KML aabbggrr', () => {
    expect(hexToKmlColor('#ff8800')).toBe('ff0088ff');
  });
  it('handles missing hash', () => {
    expect(hexToKmlColor('aabbcc')).toBe('ffccbbaa');
  });
  it('falls back to grey on invalid input', () => {
    expect(hexToKmlColor('not-a-color')).toBe('ff616161');
  });
});

describe('buildKml', () => {
  it('emits a complete <kml> document with the expected structure', () => {
    const out = buildKml({ waypoints: [wp1], markups: [line, poly] });
    expect(out).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(out).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
    expect(out).toContain('<Document>');
    expect(out).toContain('</kml>');
  });
  it('includes a Point Placemark per waypoint', () => {
    const out = buildKml({ waypoints: [wp1], markups: [] });
    expect(out).toContain('<Point><coordinates>-77.1,39.2,0</coordinates></Point>');
    expect(out).toContain('<name>North Stand</name>');
  });
  it('includes a LineString Placemark per line markup', () => {
    const out = buildKml({ waypoints: [], markups: [line] });
    expect(out).toContain('<LineString>');
    expect(out).toContain('-77.1,39.2,0 -77.09,39.21,0 -77.08,39.22,0');
  });
  it('includes a Polygon Placemark with an outer ring per polygon markup', () => {
    const out = buildKml({ waypoints: [], markups: [poly] });
    expect(out).toContain('<Polygon>');
    expect(out).toContain('<outerBoundaryIs><LinearRing>');
  });
  it('escapes user-supplied title and notes', () => {
    const out = buildKml({
      waypoints: [{ ...wp1, title: 'A & B', notes: '<oops>' }],
      markups: [],
    });
    expect(out).toContain('<name>A &amp; B</name>');
    expect(out).toContain('<description>&lt;oops&gt;</description>');
  });
});

describe('buildGpx', () => {
  it('emits <gpx> with metadata and version 1.1', () => {
    const out = buildGpx({ waypoints: [wp1], markups: [line] });
    expect(out).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(out).toContain('<gpx version="1.1"');
    expect(out).toContain('<metadata>');
  });
  it('emits <wpt> per waypoint with lat/lon attributes', () => {
    const out = buildGpx({ waypoints: [wp1], markups: [] });
    expect(out).toContain('<wpt lat="39.2" lon="-77.1">');
    expect(out).toContain('<name>North Stand</name>');
  });
  it('emits a <trk> with <trkseg>/<trkpt> per LineString markup', () => {
    const out = buildGpx({ waypoints: [], markups: [line] });
    expect(out).toContain('<trk>');
    expect(out).toContain('<trkseg>');
    expect(out).toContain('<trkpt lat="39.2" lon="-77.1"></trkpt>');
  });
  it('exports a polygon as a closed <trk>', () => {
    const out = buildGpx({ waypoints: [], markups: [poly] });
    expect(out).toContain('<type>polygon</type>');
    // First and last trkpt should be the closing-ring repeat.
    const first = (out.match(/<trkpt lat="39" lon="-77"><\/trkpt>/g) || []).length;
    expect(first).toBeGreaterThanOrEqual(2);
  });
});
