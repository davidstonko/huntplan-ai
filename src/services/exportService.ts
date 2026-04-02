/**
 * exportService — On-device GPX/KML/CSV export for Scout plans, tracks, and camps.
 * Generates standards-compliant XML and shares via iOS share sheet or clipboard.
 * No external dependencies required — uses native React Native Share API.
 */

import { Share, Alert, Platform } from 'react-native';
import { HuntPlan, RecordedTrack, Waypoint, Route, DrawnArea, WAYPOINT_ICONS } from '../types/scout';
import { DeerCamp, SharedAnnotation } from '../types/deercamp';

/**
 * ── GPX 1.1 Export ──
 */

/**
 * Convert a single waypoint to GPX <wpt> element.
 */
function waypointToGPX(wp: Waypoint): string {
  const lat = wp.lat.toFixed(6);
  const lng = wp.lng.toFixed(6);
  const name = escapeXML(wp.label || wp.icon);
  const desc = escapeXML(wp.notes || `${wp.icon} waypoint`);
  const icon = WAYPOINT_ICONS[wp.icon] || '📌';

  return `  <wpt lat="${lat}" lon="${lng}">
    <name>${name}</name>
    <desc>${desc} ${icon}</desc>
    <type>${wp.icon}</type>
  </wpt>`;
}

/**
 * Convert a route to GPX <rte> element.
 */
function routeToGPX(route: Route): string {
  const name = escapeXML(route.label || 'Route');
  const rtepts = route.points
    .map(([lng, lat]) => {
      const latStr = lat.toFixed(6);
      const lngStr = lng.toFixed(6);
      return `    <rtept lat="${latStr}" lon="${lngStr}" />`;
    })
    .join('\n');

  return `  <rte>
    <name>${name}</name>
    <desc>Distance: ${Math.round(route.distanceMeters)}m, Style: ${route.style}</desc>
${rtepts}
  </rte>`;
}

/**
 * Convert a drawn area (polygon) to GPX <rte> element (closed loop).
 */
function areaToGPX(area: DrawnArea): string {
  const name = escapeXML(area.label || 'Area');
  const rtepts = area.polygon
    .map(([lng, lat]) => {
      const latStr = lat.toFixed(6);
      const lngStr = lng.toFixed(6);
      return `    <rtept lat="${latStr}" lon="${lngStr}" />`;
    })
    .concat([
      // Close the polygon by adding first point at end
      (() => {
        const [lng, lat] = area.polygon[0];
        return `    <rtept lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}" />`;
      })(),
    ])
    .join('\n');

  return `  <rte>
    <name>${name}</name>
    <desc>Area: ${area.areaAcres.toFixed(2)}ac (closed polygon)</desc>
${rtepts}
  </rte>`;
}

/**
 * Convert a GPS track to GPX <trk> element.
 */
function trackToGPXElement(track: RecordedTrack): string {
  const name = escapeXML(track.name || 'Recorded Track');
  const trkpts = track.points
    .map((pt) => {
      const lat = pt.lat.toFixed(6);
      const lng = pt.lng.toFixed(6);
      const time = new Date(pt.timestamp).toISOString();
      const ele = pt.altitude ? `\n      <ele>${pt.altitude.toFixed(1)}</ele>` : '';
      return `      <trkpt lat="${lat}" lon="${lng}">
        <time>${time}</time>${ele}
      </trkpt>`;
    })
    .join('\n');

  return `  <trk>
    <name>${name}</name>
    <desc>Date: ${track.date}, Distance: ${Math.round(track.distanceMeters)}m, Duration: ${Math.round(track.durationSeconds)}s</desc>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>`;
}

/**
 * Generate GPX 1.1 XML string from a hunt plan.
 */
export function planToGPX(plan: HuntPlan): string {
  const gpxElements: string[] = [];

  // Parking point (if exists)
  if (plan.parkingPoint) {
    gpxElements.push(waypointToGPX(plan.parkingPoint));
  }

  // Regular waypoints
  plan.waypoints.forEach((wp) => {
    gpxElements.push(waypointToGPX(wp));
  });

  // Routes
  plan.routes.forEach((route) => {
    gpxElements.push(routeToGPX(route));
  });

  // Areas (as closed route polygons)
  plan.areas.forEach((area) => {
    gpxElements.push(areaToGPX(area));
  });

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MDHuntFishOutdoors"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXML(plan.name)}</name>
    <desc>${escapeXML(plan.notes || 'Hunt plan')}</desc>
    <time>${new Date(plan.updatedAt).toISOString()}</time>
  </metadata>`;

  const footer = `
</gpx>`;

  return header + '\n' + gpxElements.join('\n') + footer;
}

/**
 * Generate GPX 1.1 XML string from a recorded track.
 */
export function trackToGPX(track: RecordedTrack): string {
  const gpxElements: string[] = [trackToGPXElement(track)];

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MDHuntFishOutdoors"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXML(track.name)}</name>
    <desc>Recorded GPS track</desc>
    <time>${new Date(track.date).toISOString()}</time>
  </metadata>`;

  const footer = `
</gpx>`;

  return header + '\n' + gpxElements.join('\n') + footer;
}

/**
 * ── KML 2.2 Export ──
 */

/**
 * Convert a waypoint to KML <Placemark><Point>.
 */
function waypointToKML(wp: Waypoint, color: string = 'ff0000ff'): string {
  const name = escapeXML(wp.label || wp.icon);
  const desc = escapeXML(wp.notes || `${wp.icon} waypoint`);

  return `    <Placemark>
      <name>${name}</name>
      <description>${desc}</description>
      <Point>
        <coordinates>${wp.lng.toFixed(6)},${wp.lat.toFixed(6)},0</coordinates>
      </Point>
      <Style>
        <IconStyle>
          <color>${color}</color>
          <scale>1.0</scale>
        </IconStyle>
      </Style>
    </Placemark>`;
}

/**
 * Convert a route to KML <Placemark><LineString>.
 */
function routeToKML(route: Route, color: string = 'ff00ff00'): string {
  const name = escapeXML(route.label || 'Route');
  const desc = escapeXML(`Distance: ${Math.round(route.distanceMeters)}m, Style: ${route.style}`);
  const coordinates = route.points
    .map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)},0`)
    .join('\n          ');

  return `    <Placemark>
      <name>${name}</name>
      <description>${desc}</description>
      <LineString>
        <coordinates>
          ${coordinates}
        </coordinates>
      </LineString>
      <Style>
        <LineStyle>
          <color>${color}</color>
          <width>3</width>
        </LineStyle>
      </Style>
    </Placemark>`;
}

/**
 * Convert a drawn area (polygon) to KML <Placemark><Polygon>.
 */
function areaToKML(area: DrawnArea, color: string = 'ff00ffff'): string {
  const name = escapeXML(area.label || 'Area');
  const desc = escapeXML(`Area: ${area.areaAcres.toFixed(2)}ac`);

  // Close the polygon
  const ringCoordinates = area.polygon
    .map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)},0`)
    .concat([`${area.polygon[0][0].toFixed(6)},${area.polygon[0][1].toFixed(6)},0`])
    .join('\n          ');

  return `    <Placemark>
      <name>${name}</name>
      <description>${desc}</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${ringCoordinates}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
      <Style>
        <PolyStyle>
          <color>${color}</color>
          <fill>1</fill>
          <outline>1</outline>
        </PolyStyle>
        <LineStyle>
          <color>ff000000</color>
          <width>2</width>
        </LineStyle>
      </Style>
    </Placemark>`;
}

/**
 * Convert a recorded track to KML <Placemark><LineString>.
 */
function trackToKMLElement(track: RecordedTrack, color: string = 'ffff0000'): string {
  const name = escapeXML(track.name || 'Track');
  const desc = escapeXML(`Date: ${track.date}, Distance: ${Math.round(track.distanceMeters)}m`);
  const coordinates = track.points
    .map((pt) => `${pt.lng.toFixed(6)},${pt.lat.toFixed(6)},${(pt.altitude || 0).toFixed(1)}`)
    .join('\n          ');

  return `    <Placemark>
      <name>${name}</name>
      <description>${desc}</description>
      <LineString>
        <coordinates>
          ${coordinates}
        </coordinates>
      </LineString>
      <Style>
        <LineStyle>
          <color>${color}</color>
          <width>3</width>
        </LineStyle>
      </Style>
    </Placemark>`;
}

/**
 * Generate KML 2.2 XML string from a hunt plan.
 */
export function planToKML(plan: HuntPlan): string {
  const placemarks: string[] = [];
  const planColor = plan.color.replace('#', 'ff').padStart(8, 'ff');

  // Parking point
  if (plan.parkingPoint) {
    placemarks.push(waypointToKML(plan.parkingPoint, 'ff00ff00'));
  }

  // Waypoints
  plan.waypoints.forEach((wp) => {
    placemarks.push(waypointToKML(wp, planColor));
  });

  // Routes
  plan.routes.forEach((route) => {
    placemarks.push(routeToKML(route, planColor));
  });

  // Areas
  plan.areas.forEach((area) => {
    placemarks.push(areaToKML(area, planColor));
  });

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXML(plan.name)}</name>
    <description>${escapeXML(plan.notes || 'Hunt plan')}</description>
    <Folder>
      <name>Annotations</name>`;

  const footer = `
    </Folder>
  </Document>
</kml>`;

  return header + '\n' + placemarks.join('\n') + footer;
}

/**
 * Generate KML 2.2 XML string from a recorded track.
 */
export function trackToKML(track: RecordedTrack): string {
  const placemark = trackToKMLElement(track, 'ff4444ff');

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXML(track.name)}</name>
    <description>Recorded GPS track</description>
    <Folder>
      <name>Track</name>`;

  const footer = `
    </Folder>
  </Document>
</kml>`;

  return header + '\n    ' + placemark + footer;
}

/**
 * ── CSV Export (for harvest logs, activity data) ──
 */

export interface HarvestEntry {
  species: string;
  date: string;
  weapon: string;
  county: string;
  landName?: string;
  antlerPoints?: number;
  weight?: number;
  gameCheckNumber?: string;
}

/**
 * Convert harvest entries to CSV format.
 */
export function harvestsToCSV(harvests: HarvestEntry[]): string {
  const headers = ['Species', 'Date', 'Weapon', 'County', 'Land Name', 'Antler Points', 'Weight (lbs)', 'Game Check #'];
  const rows = harvests.map((h) => [
    escapeCSVField(h.species),
    escapeCSVField(h.date),
    escapeCSVField(h.weapon),
    escapeCSVField(h.county),
    escapeCSVField(h.landName || ''),
    h.antlerPoints?.toString() || '',
    h.weight?.toString() || '',
    escapeCSVField(h.gameCheckNumber || ''),
  ]);

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

/**
 * ── Share Functions ──
 */

/**
 * Share a hunt plan as GPX or KML via iOS share sheet.
 * Falls back to copying to clipboard if Share API is not available.
 */
export async function sharePlan(plan: HuntPlan, format: 'gpx' | 'kml'): Promise<void> {
  try {
    const content = format === 'gpx' ? planToGPX(plan) : planToKML(plan);
    const fileExtension = format === 'gpx' ? 'gpx' : 'kml';
    const filename = `${sanitizeFilename(plan.name)}.${fileExtension}`;

    // Share API with MIME type
    const message = `Hunt plan: ${plan.name}`;
    await Share.share(
      {
        message: content,
        title: filename,
        url: Platform.OS === 'ios' ? undefined : content,
      },
      { dialogTitle: filename }
    );
  } catch (err: any) {
    if (err.message && err.message.includes('dismissal')) {
      // User cancelled — no action needed
      return;
    }
    throw err;
  }
}

/**
 * Share a recorded track as GPX or KML via iOS share sheet.
 */
export async function shareTrack(track: RecordedTrack, format: 'gpx' | 'kml'): Promise<void> {
  try {
    const content = format === 'gpx' ? trackToGPX(track) : trackToKML(track);
    const fileExtension = format === 'gpx' ? 'gpx' : 'kml';
    const filename = `${sanitizeFilename(track.name)}.${fileExtension}`;

    const message = `GPS Track: ${track.name}`;
    await Share.share(
      {
        message: content,
        title: filename,
        url: Platform.OS === 'ios' ? undefined : content,
      },
      { dialogTitle: filename }
    );
  } catch (err: any) {
    if (err.message && err.message.includes('dismissal')) {
      return;
    }
    throw err;
  }
}

/**
 * Export a Deer Camp (all shared annotations) as GPX or KML.
 */
export async function shareCamp(camp: DeerCamp, format: 'gpx' | 'kml'): Promise<void> {
  try {
    let content = '';

    if (format === 'gpx') {
      content = campToGPX(camp);
    } else {
      content = campToKML(camp);
    }

    const fileExtension = format === 'gpx' ? 'gpx' : 'kml';
    const filename = `${sanitizeFilename(camp.name)}.${fileExtension}`;

    const message = `Deer Camp: ${camp.name}`;
    await Share.share(
      {
        message: content,
        title: filename,
        url: Platform.OS === 'ios' ? undefined : content,
      },
      { dialogTitle: filename }
    );
  } catch (err: any) {
    if (err.message && err.message.includes('dismissal')) {
      return;
    }
    throw err;
  }
}

/**
 * ── Camp Export Helpers ──
 */

/**
 * Convert a camp's shared annotations to GPX.
 */
export function campToGPX(camp: DeerCamp): string {
  const gpxElements: string[] = [];

  // Extract annotations and render them
  camp.annotations.forEach((annotation) => {
    if (annotation.type === 'waypoint' && 'label' in annotation.data) {
      const wp = annotation.data as Waypoint;
      gpxElements.push(waypointToGPX(wp));
    } else if (annotation.type === 'route' && 'points' in annotation.data) {
      const route = annotation.data as Route;
      gpxElements.push(routeToGPX(route));
    } else if (annotation.type === 'area' && 'polygon' in annotation.data) {
      const area = annotation.data as DrawnArea;
      gpxElements.push(areaToGPX(area));
    } else if (annotation.type === 'track' && 'points' in annotation.data) {
      const track = annotation.data as RecordedTrack;
      gpxElements.push(trackToGPXElement(track));
    }
  });

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MDHuntFishOutdoors"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXML(camp.name)}</name>
    <desc>Deer Camp with shared annotations</desc>
    <time>${new Date(camp.createdAt).toISOString()}</time>
  </metadata>`;

  const footer = `
</gpx>`;

  return header + '\n' + gpxElements.join('\n') + footer;
}

/**
 * Convert a camp's shared annotations to KML.
 */
export function campToKML(camp: DeerCamp): string {
  const placemarks: string[] = [];

  camp.annotations.forEach((annotation) => {
    if (annotation.type === 'waypoint' && 'label' in annotation.data) {
      const wp = annotation.data as Waypoint;
      placemarks.push(waypointToKML(wp));
    } else if (annotation.type === 'route' && 'points' in annotation.data) {
      const route = annotation.data as Route;
      placemarks.push(routeToKML(route));
    } else if (annotation.type === 'area' && 'polygon' in annotation.data) {
      const area = annotation.data as DrawnArea;
      placemarks.push(areaToKML(area));
    } else if (annotation.type === 'track' && 'points' in annotation.data) {
      const track = annotation.data as RecordedTrack;
      placemarks.push(trackToKMLElement(track));
    }
  });

  const header = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXML(camp.name)}</name>
    <description>Deer Camp with shared annotations</description>
    <Folder>
      <name>Annotations</name>`;

  const footer = `
    </Folder>
  </Document>
</kml>`;

  return header + '\n' + placemarks.join('\n') + footer;
}

/**
 * ── Utility Functions ──
 */

/**
 * Escape XML special characters.
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape CSV fields (wrap in quotes and escape quotes).
 */
function escapeCSVField(field: string): string {
  if (!field) return '""';
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Sanitize filename for compatibility.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
}
