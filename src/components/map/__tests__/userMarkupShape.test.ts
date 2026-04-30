/**
 * userMarkupShape — verify the GeoJSON shape builder.
 */

import { buildUserMarkupShapes } from '../userMarkupShape';
import { UserMarkup, DEFAULT_MARKUP_COLOR } from '../../../types/userMarkup';

function makeLine(id: string, color?: string): UserMarkup {
  return {
    id,
    createdAt: '',
    updatedAt: '',
    mode: 'hunt',
    title: `line ${id}`,
    color,
    shapeType: 'LineString',
    coordinates: [
      [-77, 39],
      [-76.9, 39],
      [-76.8, 39.1],
    ],
  };
}

function makePoly(id: string): UserMarkup {
  return {
    id,
    createdAt: '',
    updatedAt: '',
    mode: 'camp',
    title: `poly ${id}`,
    shapeType: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ],
  };
}

describe('buildUserMarkupShapes', () => {
  it('returns three empty FeatureCollections for empty input', () => {
    const out = buildUserMarkupShapes([]);
    expect(out.lines.features).toHaveLength(0);
    expect(out.polygons.features).toHaveLength(0);
    expect(out.labels.features).toHaveLength(0);
  });

  it('separates LineStrings and Polygons into distinct collections', () => {
    const out = buildUserMarkupShapes([
      makeLine('L1'),
      makePoly('P1'),
      makeLine('L2'),
    ]);
    expect(out.lines.features.map((f) => f.id)).toEqual(['L1', 'L2']);
    expect(out.polygons.features.map((f) => f.id)).toEqual(['P1']);
    expect(out.labels.features).toHaveLength(3);
  });

  it('falls back to DEFAULT_MARKUP_COLOR when no override', () => {
    const out = buildUserMarkupShapes([makeLine('L1')]);
    expect(out.lines.features[0].properties?.color).toBe(DEFAULT_MARKUP_COLOR);
  });

  it('honors a per-markup color override', () => {
    const out = buildUserMarkupShapes([makeLine('L1', '#1e90ff')]);
    expect(out.lines.features[0].properties?.color).toBe('#1e90ff');
  });

  it('places polygon label at vertex-mean centroid', () => {
    const out = buildUserMarkupShapes([makePoly('P1')]);
    const label = out.labels.features.find((f) => f.id === 'P1__label')!;
    // 4 unique vertices average to (1, 1) for the (0,0)-(2,0)-(2,2)-(0,2) ring.
    expect(label.geometry.coordinates[0]).toBeCloseTo(1, 6);
    expect(label.geometry.coordinates[1]).toBeCloseTo(1, 6);
  });
});
