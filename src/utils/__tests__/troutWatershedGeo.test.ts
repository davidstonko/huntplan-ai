/**
 * @file troutWatershedGeo.test.ts
 * @description Tests the wild-trout classification overlay builder.
 */

import {
  troutWatershedsToGeoJSON,
  troutColor,
  troutTypeLabel,
  TROUT_COLORS,
} from '../troutWatershedGeo';
import { MARYLAND_TROUT_WATERSHEDS } from '../../data/marylandTroutWatersheds';

const make = (over: any) => ({
  id: 't1',
  dnr12dig: '0',
  hasBrookTrout: false,
  hasWildBrownTrout: false,
  hasWildRainbowTrout: false,
  rings: [[[-79, 39] as [number, number], [-78.9, 39], [-78.9, 39.1], [-79, 39]]],
  dnrObjectId: 1,
  link: 'http://example',
  ...over,
});

describe('classification color + label', () => {
  it('prioritizes native brook trout for color', () => {
    expect(troutColor(make({ hasBrookTrout: true, hasWildBrownTrout: true }))).toBe(
      TROUT_COLORS.brook,
    );
  });
  it('falls back brown -> rainbow', () => {
    expect(troutColor(make({ hasWildBrownTrout: true }))).toBe(TROUT_COLORS.brown);
    expect(troutColor(make({ hasWildRainbowTrout: true }))).toBe(TROUT_COLORS.rainbow);
  });
  it('labels every species present', () => {
    const lbl = troutTypeLabel(make({ hasBrookTrout: true, hasWildRainbowTrout: true }));
    expect(lbl).toContain('Brook');
    expect(lbl).toContain('Rainbow');
  });
});

describe('troutWatershedsToGeoJSON', () => {
  it('builds polygon features with color/label/species props', () => {
    const fc = troutWatershedsToGeoJSON([make({ hasBrookTrout: true })]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(1);
    const f = fc.features[0];
    expect(f.geometry.type).toBe('Polygon');
    expect(f.properties.color).toBe(TROUT_COLORS.brook);
    expect(f.properties.brook).toBe(true);
  });

  it('drops watersheds without rings', () => {
    const fc = troutWatershedsToGeoJSON([make({ rings: [] })]);
    expect(fc.features).toHaveLength(0);
  });

  it('renders the real bundled MD dataset without throwing', () => {
    const fc = troutWatershedsToGeoJSON();
    expect(fc.features.length).toBeGreaterThan(100);
    // Every feature carries a color and a polygon.
    for (const f of fc.features) {
      expect(typeof f.properties.color).toBe('string');
      expect(f.geometry.coordinates.length).toBeGreaterThan(0);
    }
  });
});
