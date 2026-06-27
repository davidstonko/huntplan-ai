/**
 * @file TroutWatershedLayer.tsx
 * @description Mapbox overlay of Maryland wild-trout watersheds, colored by
 * species (native brook = green, wild brown, wild rainbow). Data is bundled
 * (offline-friendly) and built once via troutWatershedsToGeoJSON. Render inside
 * a MapboxGL.MapView, beneath point markers so dots stay tappable.
 *
 * @module components/map/TroutWatershedLayer
 */

import React, { useMemo } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { troutWatershedsToGeoJSON } from '../../utils/troutWatershedGeo';

interface TroutWatershedLayerProps {
  enabled: boolean;
  onSelect?: (props: { label: string; link: string | null }) => void;
}

export default function TroutWatershedLayer({
  enabled,
  onSelect,
}: TroutWatershedLayerProps) {
  const fc = useMemo(() => troutWatershedsToGeoJSON(), []);

  if (!enabled) return null;

  return (
    <MapboxGL.ShapeSource
      id="troutWaters"
      shape={fc as any}
      onPress={(e: any) => {
        const p = e?.features?.[0]?.properties;
        if (p && onSelect) onSelect({ label: p.label, link: p.link ?? null });
      }}
    >
      <MapboxGL.FillLayer
        id="troutWatersFill"
        style={{ fillColor: ['get', 'color'], fillOpacity: 0.3 }}
      />
      <MapboxGL.LineLayer
        id="troutWatersLine"
        style={{ lineColor: ['get', 'color'], lineWidth: 2, lineOpacity: 1 }}
      />
    </MapboxGL.ShapeSource>
  );
}
