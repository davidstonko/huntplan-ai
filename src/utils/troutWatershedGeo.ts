/**
 * @file troutWatershedGeo.ts
 * @description Turns the bundled MD wild-trout watershed dataset into a
 * map-ready GeoJSON overlay, classified by wild trout species present — a
 * TroutRoutes-style "stream quality" classification, but free and offline.
 *
 * Native BROOK trout are Maryland's prized wild fishery, so they take color
 * priority; the label still lists every wild species confirmed in the
 * watershed (DNR MBSS surveys).
 *
 * @module utils/troutWatershedGeo
 */

import {
  MARYLAND_TROUT_WATERSHEDS,
  TroutWatershed,
} from '../data/marylandTroutWatersheds';

/** Native brook = green; wild brown = brown/oak; wild rainbow = blue. */
export const TROUT_COLORS = {
  brook: '#2E7D32',
  brown: '#8B5E3C',
  rainbow: '#1E88E5',
  none: '#6B7280',
} as const;

export function troutTypeLabel(w: TroutWatershed): string {
  const parts: string[] = [];
  if (w.hasBrookTrout) parts.push('Brook (native)');
  if (w.hasWildBrownTrout) parts.push('Wild Brown');
  if (w.hasWildRainbowTrout) parts.push('Wild Rainbow');
  return parts.length ? parts.join(', ') : 'Trout watershed';
}

/** Color by the highest-value species present (brook > brown > rainbow). */
export function troutColor(w: TroutWatershed): string {
  if (w.hasBrookTrout) return TROUT_COLORS.brook;
  if (w.hasWildBrownTrout) return TROUT_COLORS.brown;
  if (w.hasWildRainbowTrout) return TROUT_COLORS.rainbow;
  return TROUT_COLORS.none;
}

export interface TroutWatershedGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    properties: {
      id: string;
      color: string;
      label: string;
      link: string | null;
      brook: boolean;
      brown: boolean;
      rainbow: boolean;
    };
    geometry: { type: 'Polygon'; coordinates: [number, number][][] };
  }>;
}

/**
 * Build the GeoJSON overlay. Pure (no I/O) so it's unit-testable. Skips any
 * watershed without a usable polygon ring.
 */
export function troutWatershedsToGeoJSON(
  watersheds: TroutWatershed[] = MARYLAND_TROUT_WATERSHEDS,
): TroutWatershedGeoJSON {
  return {
    type: 'FeatureCollection',
    features: watersheds
      .filter((w) => Array.isArray(w.rings) && w.rings.length > 0)
      .map((w) => ({
        type: 'Feature' as const,
        id: w.id,
        properties: {
          id: w.id,
          color: troutColor(w),
          label: troutTypeLabel(w),
          link: w.link ?? null,
          brook: w.hasBrookTrout,
          brown: w.hasWildBrownTrout,
          rainbow: w.hasWildRainbowTrout,
        },
        geometry: { type: 'Polygon' as const, coordinates: w.rings },
      })),
  };
}
