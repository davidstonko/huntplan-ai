/**
 * geoExport — Pure XML formatters for KML 2.2 and GPX 1.1.
 *
 * Builds export strings for `UserWaypoint` (Point), `UserMarkup`
 * (LineString, Polygon), and arbitrary mixed bundles. The platform
 * write-to-file step lives in a separate caller (Share/RNFS) so this
 * module remains node-friendly and unit-testable.
 *
 * Conformance notes:
 *
 *   - KML: documents wrap Placemarks. Each waypoint is a Point Placemark;
 *     each LineString and Polygon is a Placemark with the matching
 *     geometry. Color is encoded both as a per-Placemark `<Style>` (so
 *     viewers without a style table render the right hue) and as a
 *     short style id reference.
 *
 *   - GPX 1.1: only Points and LineStrings have first-class geometries
 *     (`<wpt>` and `<trk>/<trkseg>` respectively). Polygons are exported
 *     as a closed `<trk>` so the user does not lose the geometry when
 *     round-tripping through a GPS unit. KML is the lossless format.
 *
 * Per V2_3_FEATURE_EXPANSION_PLAN §D.2 ("Export as KML + GPX").
 */

import type { UserWaypoint } from '../types/userWaypoint';
import type { UserMarkup } from '../types/userMarkup';
import { resolveMarkupColor } from '../types/userMarkup';
import { resolveWaypointColor } from '../types/userWaypoint';

/** XML-escape a string. */
export function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Convert a hex color (`#rrggbb`) to KML's `aabbggrr` byte order.
 * Falls back to fully opaque grey when the input isn't a recognizable
 * 6-digit hex.
 */
export function hexToKmlColor(hex: string, alpha: number = 0xff): string {
  if (typeof hex !== 'string') return 'ff616161';
  const cleaned = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return 'ff616161';
  const rr = cleaned.slice(0, 2).toLowerCase();
  const gg = cleaned.slice(2, 4).toLowerCase();
  const bb = cleaned.slice(4, 6).toLowerCase();
  const aa = alpha.toString(16).padStart(2, '0');
  return `${aa}${bb}${gg}${rr}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Format a coordinate pair as KML's `lng,lat,0` token. */
function kmlCoord([lng, lat]: [number, number]): string {
  return `${lng},${lat},0`;
}

/**
 * Build a KML Document containing every waypoint and markup passed in.
 * The returned string is a complete, self-contained .kml file.
 */
export function buildKml(
  bundle: { waypoints: UserWaypoint[]; markups: UserMarkup[] },
  opts: { documentName?: string } = {},
): string {
  const docName = escapeXml(opts.documentName ?? 'MDHuntFishOutdoors Export');

  // Style table: deduplicate styles by their KML color string so a
  // 100-waypoint export doesn't repeat the same color block 100 times.
  const styleColors = new Set<string>();
  for (const wp of bundle.waypoints) {
    styleColors.add(hexToKmlColor(resolveWaypointColor(wp)));
  }
  for (const m of bundle.markups) {
    styleColors.add(hexToKmlColor(resolveMarkupColor(m)));
  }

  const styleBlocks = [...styleColors]
    .map(
      (c) => `<Style id="s_${c}">
  <IconStyle><color>${c}</color><scale>1.0</scale></IconStyle>
  <LineStyle><color>${c}</color><width>3</width></LineStyle>
  <PolyStyle><color>40${c.slice(2)}</color></PolyStyle>
</Style>`,
    )
    .join('\n');

  const waypointPlacemarks = bundle.waypoints.map((wp) => {
    const color = hexToKmlColor(resolveWaypointColor(wp));
    return `<Placemark>
  <name>${escapeXml(wp.title || 'Waypoint')}</name>
  <description>${escapeXml(wp.notes || '')}</description>
  <styleUrl>#s_${color}</styleUrl>
  <Point><coordinates>${wp.lng},${wp.lat},0</coordinates></Point>
</Placemark>`;
  }).join('\n');

  const markupPlacemarks = bundle.markups.map((m) => {
    const color = hexToKmlColor(resolveMarkupColor(m));
    if (m.shapeType === 'LineString') {
      const coords = m.coordinates.map(kmlCoord).join(' ');
      return `<Placemark>
  <name>${escapeXml(m.title || 'Line')}</name>
  <description>${escapeXml(m.notes || '')}</description>
  <styleUrl>#s_${color}</styleUrl>
  <LineString>
    <tessellate>1</tessellate>
    <coordinates>${coords}</coordinates>
  </LineString>
</Placemark>`;
    }
    // Polygon: KML uses outerBoundaryIs / innerBoundaryIs. We export the
    // outer ring and any holes the markup may carry.
    const rings = m.coordinates;
    const outer = rings[0]?.map(kmlCoord).join(' ') ?? '';
    const innerRings = rings
      .slice(1)
      .map(
        (ring) =>
          `<innerBoundaryIs><LinearRing><coordinates>${ring
            .map(kmlCoord)
            .join(' ')}</coordinates></LinearRing></innerBoundaryIs>`,
      )
      .join('\n    ');
    return `<Placemark>
  <name>${escapeXml(m.title || 'Polygon')}</name>
  <description>${escapeXml(m.notes || '')}</description>
  <styleUrl>#s_${color}</styleUrl>
  <Polygon>
    <outerBoundaryIs><LinearRing><coordinates>${outer}</coordinates></LinearRing></outerBoundaryIs>
    ${innerRings}
  </Polygon>
</Placemark>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>${docName}</name>
${styleBlocks}
${waypointPlacemarks}
${markupPlacemarks}
</Document>
</kml>
`;
}

/**
 * Build a GPX 1.1 document containing every waypoint and markup.
 * Polygons round-trip as closed tracks (GPX has no native polygon).
 */
export function buildGpx(
  bundle: { waypoints: UserWaypoint[]; markups: UserMarkup[] },
  opts: { creator?: string } = {},
): string {
  const creator = escapeXml(opts.creator ?? 'MDHuntFishOutdoors');
  const time = nowIso();

  const wpts = bundle.waypoints
    .map(
      (wp) => `<wpt lat="${wp.lat}" lon="${wp.lng}">
  <name>${escapeXml(wp.title || 'Waypoint')}</name>
  <desc>${escapeXml(wp.notes || '')}</desc>
  <type>${escapeXml(wp.category)}</type>
</wpt>`,
    )
    .join('\n');

  const trks = bundle.markups
    .map((m) => {
      const seg =
        m.shapeType === 'LineString'
          ? m.coordinates
              .map(([lng, lat]) => `<trkpt lat="${lat}" lon="${lng}"></trkpt>`)
              .join('\n')
          : m.coordinates[0]
              .map(([lng, lat]) => `<trkpt lat="${lat}" lon="${lng}"></trkpt>`)
              .join('\n');
      return `<trk>
  <name>${escapeXml(m.title || (m.shapeType === 'Polygon' ? 'Polygon' : 'Line'))}</name>
  <desc>${escapeXml(m.notes || '')}</desc>
  <type>${m.shapeType === 'Polygon' ? 'polygon' : 'line'}</type>
  <trkseg>
${seg}
  </trkseg>
</trk>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${creator}"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
<metadata>
  <name>${creator} Export</name>
  <time>${time}</time>
</metadata>
${wpts}
${trks}
</gpx>
`;
}
