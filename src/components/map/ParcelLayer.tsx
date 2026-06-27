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
}

const EMPTY: ParcelFeatureCollection = { type: 'FeatureCollection', features: [] };

/**
 * Only load parcels once the viewport is small enough (~zoom 14). We gate on
 * the actual viewport SPAN rather than a zoom number, because the host screen's
 * tracked zoom only updates on the +/- buttons, not on pinch/double-tap — so a
 * zoom-number gate silently blocked fetches after a gesture zoom.
 */
const PARCEL_MAX_SPAN_DEG = 0.12;

export default function ParcelLayer({
  enabled,
  bounds,
  onSelectParcel,
}: ParcelLayerProps) {
  const [fc, setFc] = useState<ParcelFeatureCollection>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !bounds) {
      setFc(EMPTY);
      return;
    }
    const span = Math.max(
      bounds.maxLng - bounds.minLng,
      bounds.maxLat - bounds.minLat,
    );
    if (span > PARCEL_MAX_SPAN_DEG) {
      setFc(EMPTY); // too zoomed out — avoid pulling thousands of parcels
      return;
    }
    fetchParcelsInBounds(bounds).then((result) => {
      if (!cancelled) setFc(result);
    });
    return () => {
      cancelled = true;
    };
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
      {/* Light fill is mostly a tap target; the orange outline is the parcel
          line. Orange reads clearly on both the Outdoors and Satellite
          basemaps (gold at low opacity was effectively invisible). */}
      <MapboxGL.FillLayer
        id="mdParcelsFill"
        style={{
          fillColor: 'rgba(255,138,0,0.08)',
          fillOutlineColor: '#FF8A00',
        }}
      />
      <MapboxGL.LineLayer
        id="mdParcelsLine"
        style={{
          lineColor: '#FF8A00',
          lineWidth: 1.6,
          lineOpacity: 0.95,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
