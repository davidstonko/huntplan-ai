/**
 * scentConeShape — contract tests for the Hunt-map scent-cone builder.
 *
 * Since the project ships no React renderer, we test the pure
 * shape-builder function the component uses. The component body
 * itself is a ~15-line Mapbox wrapper around this function — as long
 * as the FeatureCollection is correct, the map paint is correct.
 */

import { buildScentConeShape } from '../map/scentConeShape';
import type { WindReading } from '../../services/windService';

const treestand = (id: string, lat: number, lng: number) => ({
  id,
  lat,
  lng,
});

describe('buildScentConeShape', () => {
  it('returns empty FeatureCollection when wind is null', () => {
    const out = buildScentConeShape([treestand('a', 39.3, -76.9)], null);
    expect(out.type).toBe('FeatureCollection');
    expect(out.features).toHaveLength(0);
  });

  it('returns empty FeatureCollection when wind is calm (<3 mph)', () => {
    const wind: WindReading = {
      timeIso: '2026-04-20T12:00:00Z',
      speedMph: 2,
      directionDeg: 90,
    };
    const out = buildScentConeShape([treestand('a', 39.3, -76.9)], wind);
    expect(out.features).toHaveLength(0);
  });

  it('emits one Polygon feature per stand with metadata properties', () => {
    const wind: WindReading = {
      timeIso: '2026-04-20T12:00:00Z',
      speedMph: 10,
      directionDeg: 270,
    };
    const out = buildScentConeShape(
      [treestand('stand-1', 39.3, -76.9), treestand('stand-2', 39.32, -76.85)],
      wind,
    );
    expect(out.features).toHaveLength(2);
    for (const f of out.features) {
      expect(f.geometry.type).toBe('Polygon');
      expect(f.properties).toMatchObject({
        waypointId: expect.any(String),
        lengthMeters: expect.any(Number),
        downwindHeadingDeg: 90,
      });
    }
    const ids = out.features.map((f) => f.properties?.waypointId);
    expect(ids).toEqual(['stand-1', 'stand-2']);
  });

  it('skips stands whose individual cone would be null, keeps the rest', () => {
    const wind: WindReading = {
      timeIso: '2026-04-20T12:00:00Z',
      speedMph: 10,
      directionDeg: 0,
    };
    const out = buildScentConeShape(
      [treestand('good', 39.3, -76.9), treestand('bad-lat', NaN, -76.9)],
      wind,
    );
    expect(out.features).toHaveLength(1);
    expect(out.features[0].properties?.waypointId).toBe('good');
  });
});
