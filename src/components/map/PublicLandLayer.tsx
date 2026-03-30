import React from 'react';
import MapboxGL from '@rnmapbox/maps';

interface PublicLand {
  id: string;
  name: string;
  acres: number;
  coordinates: [number, number]; // [lon, lat]
}

interface PublicLandLayerProps {
  lands: PublicLand[];
}

const MARYLAND_WMA_SAMPLE: PublicLand[] = [
  {
    id: '1',
    name: 'Savage Mill WMA',
    acres: 1200,
    coordinates: [-76.8, 39.1],
  },
  {
    id: '2',
    name: 'Patuxent River WMA',
    acres: 1850,
    coordinates: [-76.7, 38.9],
  },
  {
    id: '3',
    name: 'Gunpowder Falls State Park',
    acres: 6500,
    coordinates: [-76.4, 39.3],
  },
];

export default function PublicLandLayer({
  lands = MARYLAND_WMA_SAMPLE,
}: PublicLandLayerProps) {
  const geoJSON = {
    type: 'FeatureCollection' as const,
    features: lands.map((land) => ({
      type: 'Feature' as const,
      id: land.id,
      properties: {
        name: land.name,
        acres: land.acres,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: land.coordinates,
      },
    })),
  };

  return (
    <MapboxGL.ShapeSource id="publicLands" shape={geoJSON}>
      <MapboxGL.CircleLayer
        id="publicLandsLayer"
        style={{
          circleRadius: 10,
          circleColor: '#4CAF50',
          circleOpacity: 0.7,
          circleStrokeColor: '#2E7D32',
          circleStrokeWidth: 2,
        }}
      />

      <MapboxGL.SymbolLayer
        id="publicLandsLabels"
        style={{
          textField: ['get', 'name'],
          textSize: 12,
          textColor: '#fff',
          textHaloColor: '#000',
          textHaloWidth: 1,
          textOffset: [0, 1.5],
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
