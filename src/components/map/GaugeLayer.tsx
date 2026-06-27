/**
 * @file GaugeLayer.tsx
 * @description Mapbox layer of live USGS stream gauges (Maryland). Loads on
 * enable from streamGaugeService and renders a dot + cfs label per station.
 * Tapping a gauge calls onSelect. Render inside a MapboxGL.MapView.
 *
 * @module components/map/GaugeLayer
 */

import React, { useEffect, useState } from 'react';
import MapboxGL from '@rnmapbox/maps';
import Colors from '../../theme/colors';
import {
  fetchMarylandStreamGauges,
  gaugesToGeoJSON,
  StreamGauge,
} from '../../services/streamGaugeService';

interface GaugeLayerProps {
  enabled: boolean;
  onSelect: (gauge: StreamGauge) => void;
}

export default function GaugeLayer({ enabled, onSelect }: GaugeLayerProps) {
  const [gauges, setGauges] = useState<StreamGauge[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setGauges([]);
      return;
    }
    fetchMarylandStreamGauges().then((g) => {
      if (!cancelled) setGauges(g);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || gauges.length === 0) return null;

  const fc = gaugesToGeoJSON(gauges);

  return (
    <MapboxGL.ShapeSource
      id="usgsGauges"
      shape={fc as any}
      onPress={(e: any) => {
        const code = e?.features?.[0]?.properties?.siteCode;
        const g = gauges.find((x) => x.siteCode === code);
        if (g) onSelect(g);
      }}
    >
      <MapboxGL.CircleLayer
        id="usgsGaugesDot"
        style={{
          circleRadius: 8,
          circleColor: '#1E88E5',
          circleStrokeColor: Colors.mdWhite,
          circleStrokeWidth: 2,
        }}
      />
      <MapboxGL.SymbolLayer
        id="usgsGaugesLabel"
        minZoomLevel={9}
        style={{
          textField: ['get', 'label'],
          textSize: 10,
          textColor: Colors.mdWhite,
          textHaloColor: '#0B2545',
          textHaloWidth: 1,
          textOffset: [0, 1.2],
          textAnchor: 'top',
          textAllowOverlap: false,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
