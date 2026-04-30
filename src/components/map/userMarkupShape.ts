/**
 * userMarkupShape — pure GeoJSON shape builder for user markups.
 *
 * Lives in a dependency-free file so jest tests can import it without
 * pulling in @rnmapbox/maps (which crashes at module-load in node).
 */

import { UserMarkup, resolveMarkupColor } from '../../types/userMarkup';

export interface MarkupFeatureCollections {
  /** All LineString markups, one feature each. */
  lines: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  /** All Polygon markups, one feature each. */
  polygons: GeoJSON.FeatureCollection<GeoJSON.Polygon>;
  /** Centroid points used for label rendering (one per markup). */
  labels: GeoJSON.FeatureCollection<GeoJSON.Point>;
}

function lineCentroid(
  coords: Array<[number, number]>,
): [number, number] | null {
  if (!coords.length) return null;
  // Midpoint of the polyline by vertex count — coarse but cheap and
  // gives a stable label anchor as long as the user doesn't rebuild.
  const mid = Math.floor(coords.length / 2);
  const c = coords[mid];
  if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;
  return [c[0], c[1]];
}

function polygonCentroid(
  rings: Array<Array<[number, number]>>,
): [number, number] | null {
  const outer = rings[0];
  if (!outer || outer.length < 3) return null;
  // Vertex average is an approximation of the centroid; the polygons we
  // expect (boundaries, honey-holes) are small enough that the
  // shoelace-formula version isn't worth the bytes.
  let sx = 0;
  let sy = 0;
  // Skip the duplicate closing point so it doesn't bias the average.
  const last = outer.length - 1;
  const closed = outer[0][0] === outer[last][0] && outer[0][1] === outer[last][1];
  const n = closed ? last : outer.length;
  for (let i = 0; i < n; i++) {
    sx += outer[i][0];
    sy += outer[i][1];
  }
  if (n === 0) return null;
  return [sx / n, sy / n];
}

export function buildUserMarkupShapes(
  markups: UserMarkup[],
): MarkupFeatureCollections {
  const lines: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  const polygons: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  const labels: GeoJSON.Feature<GeoJSON.Point>[] = [];

  for (const m of markups) {
    const color = resolveMarkupColor(m);
    if (m.shapeType === 'LineString') {
      lines.push({
        type: 'Feature',
        id: m.id,
        geometry: {
          type: 'LineString',
          coordinates: m.coordinates as number[][],
        },
        properties: {
          id: m.id,
          color,
          title: m.title ?? '',
        },
      });
      const c = lineCentroid(m.coordinates);
      if (c) {
        labels.push({
          type: 'Feature',
          id: `${m.id}__label`,
          geometry: { type: 'Point', coordinates: c },
          properties: { id: m.id, title: m.title ?? '', color },
        });
      }
    } else {
      polygons.push({
        type: 'Feature',
        id: m.id,
        geometry: {
          type: 'Polygon',
          // GeoJSON.Polygon coordinates are number[][][] — our
          // [number, number][] arrays satisfy that shape.
          coordinates: m.coordinates as number[][][],
        },
        properties: {
          id: m.id,
          color,
          title: m.title ?? '',
        },
      });
      const c = polygonCentroid(m.coordinates);
      if (c) {
        labels.push({
          type: 'Feature',
          id: `${m.id}__label`,
          geometry: { type: 'Point', coordinates: c },
          properties: { id: m.id, title: m.title ?? '', color },
        });
      }
    }
  }

  return {
    lines: { type: 'FeatureCollection', features: lines },
    polygons: { type: 'FeatureCollection', features: polygons },
    labels: { type: 'FeatureCollection', features: labels },
  };
}
