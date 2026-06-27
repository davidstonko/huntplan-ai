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
  MIN_PARCEL_ZOOM,
  ParcelBounds,
  ParcelFeatureCollection,
  ParcelProperties,
} from '../../services/parcelService';

interface ParcelLayerProps {
  enabled: boolean;
  /** Current map viewport; null until the map reports its first bounds. */
  bounds: ParcelBounds | null;
  /** Current integer zoom; parcels only load at MIN_PARCEL_ZOOM or higher. */
  zoom: number;
  onSelectParcel: (parcel: ParcelProperties) => void;
}

const EMPTY: ParcelFeatureCollection = { type: 'FeatureCollection', features: [] };

export default function ParcelLayer({
  enabled,
  bounds,
  zoom,
  onSelectParcel,
}: ParcelLayerProps) {
  const [fc, setFc] = useState<ParcelFeatureCollection>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !bounds || zoom < MIN_PARCEL_ZOOM) {
      setFc(EMPTY);
      return;
    }
    fetchParcelsInBounds(bounds).then((result) => {
      if (!cancelled) setFc(result);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, bounds, zoom]);

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
      <MapboxGL.FillLayer
        id="mdParcelsFill"
        style={{
          fillColor: 'rgba(255,215,0,0.06)',
          fillOutlineColor: Colors.mdGold,
        }}
      />
      <MapboxGL.LineLayer
        id="mdParcelsLine"
        style={{
          lineColor: Colors.mdGold,
          lineWidth: 1.2,
          lineOpacity: 0.85,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
