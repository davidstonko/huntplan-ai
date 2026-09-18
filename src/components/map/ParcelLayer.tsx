/**
 * @file ParcelLayer.tsx
 * @description Mapbox layer that renders Maryland property parcel boundaries for
 * the current viewport, fetched on demand from parcelService. Off unless
 * enabled, and a no-op below MIN_PARCEL_ZOOM so we never pull the whole state.
 *
 * Render inside a MapboxGL.MapView. Tapping a parcel calls onSelectParcel.
 *
 * @module components/map/ParcelLayer
 */

import React, { useEffect, useState } from 'react';
import MapboxGL from '@rnmapbox/maps';
import Colors from '../../theme/colors';
import {
  fetchParcelsInBounds,
  ParcelBounds,
  ParcelFeatureCollection,
  ParcelProperties,
} from '../../services/parcelService';

interface ParcelLayerProps {
  enabled: boolean;
  /** Current map viewport; null until the map reports its first bounds. */
  bounds: ParcelBounds | null;
  onSelectParcel: (parcel: ParcelProperties) => void;
  /**
   * Reports whether the current viewport is too wide for parcels to load
   * (true) or narrow enough (false). Host screens show the
   * "Zoom in to street level" hint from this.
   */
  onTooFarOut?: (tooFarOut: boolean) => void;
}

const EMPTY: ParcelFeatureCollection = { type: 'FeatureCollection', features: [] };

/**
 * Only load parcels once the viewport is small enough (~zoom 14). We gate on
 * the actual viewport SPAN rather than a zoom number, because the host screen's
 * tracked zoom only updates on the +/- buttons, not on pinch/double-tap — so a
 * zoom-number gate silently blocked fetches after a gesture zoom.
 */
export const PARCEL_MAX_SPAN_DEG = 0.12;

/** Copy for the host screen's hint chip when parcels cannot load yet. */
export const PARCEL_ZOOM_HINT = 'Zoom in to street level to see parcels';

/** True when the viewport is wider than the parcel loader allows. */
export function isParcelViewportTooWide(bounds: ParcelBounds | null): boolean {
  if (!bounds) return true;
  const span = Math.max(
    bounds.maxLng - bounds.minLng,
    bounds.maxLat - bounds.minLat,
  );
  return span > PARCEL_MAX_SPAN_DEG;
}

export default function ParcelLayer({
  enabled,
  bounds,
  onSelectParcel,
  onTooFarOut,
}: ParcelLayerProps) {
  const [fc, setFc] = useState<ParcelFeatureCollection>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !bounds) {
      setFc(EMPTY);
      if (enabled) onTooFarOut?.(true);
      return;
    }
    if (isParcelViewportTooWide(bounds)) {
      setFc(EMPTY); // too zoomed out: avoid pulling thousands of parcels
      onTooFarOut?.(true);
      return;
    }
    onTooFarOut?.(false);
    fetchParcelsInBounds(bounds).then((result) => {
      if (!cancelled) setFc(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, bounds]);

  if (!enabled || fc.features.length === 0) return null;

  return (
    <MapboxGL.ShapeSource
      id="mdParcels"
      shape={fc as any}
      onPress={(e: any) => {
        const f = e?.features?.[0];
        if (f?.properties) onSelectParcel(f.properties as ParcelProperties);
      }}
    >
      {/* Color by category: likely-public land (parks/forests/WMAs) green,
          private orange. Both read clearly on Outdoors + Satellite basemaps. */}
      <MapboxGL.FillLayer
        id="mdParcelsFill"
        style={{
          fillColor: [
            'match',
            ['get', 'category'],
            'public',
            'rgba(0,200,83,0.16)',
            'rgba(255,138,0,0.08)',
          ],
        }}
      />
      <MapboxGL.LineLayer
        id="mdParcelsLine"
        style={{
          lineColor: [
            'match',
            ['get', 'category'],
            'public',
            '#00C853',
            '#FF8A00',
          ],
          lineWidth: 1.6,
          lineOpacity: 0.95,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
