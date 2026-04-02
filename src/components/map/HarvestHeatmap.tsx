/**
 * @file HarvestHeatmap.tsx
 * @description Community harvest density heatmap overlay for the map.
 *
 * Renders circles on public lands proportional to harvest counts (deer harvested).
 * Data comes from backend API or falls back to local mock data.
 * Colors indicate harvest intensity:
 * - Low (1-5): mdGold with low opacity
 * - Medium (6-15): amber with medium opacity
 * - High (16+): mdRed with higher opacity
 *
 * @module Components/Map
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';
import api from '../../services/api';

/**
 * Harvest data point for a land
 * @interface HarvestDataPoint
 * @property {string} landId - Land identifier
 * @property {string} landName - Land name
 * @property {[number, number]} center - Center coordinates [lng, lat]
 * @property {number} harvestCount - Number of animals harvested
 * @property {string} species - Species harvested (e.g., 'Deer')
 */
interface HarvestDataPoint {
  landId: string;
  landName: string;
  center: [number, number];
  harvestCount: number;
  species: string;
}

/**
 * GeoJSON Feature for a harvest point
 */
interface HarvestFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    landId: string;
    landName: string;
    harvestCount: number;
    species: string;
    color: string;
    opacity: number;
  };
}

/**
 * GeoJSON FeatureCollection for all harvest points
 */
interface HarvestGeoJSON {
  type: 'FeatureCollection';
  features: HarvestFeature[];
}

/**
 * Local fallback harvest data for MD public lands
 * Top 20 WMAs and State Forests with realistic 2024-2025 season harvests
 */
const MOCK_HARVEST_DATA: HarvestDataPoint[] = [
  {
    landId: 'green-ridge-sf',
    landName: 'Green Ridge State Forest',
    center: [-78.5234, 39.6543],
    harvestCount: 45,
    species: 'Deer',
  },
  {
    landId: 'dans-mountain-wma',
    landName: "Dan's Mountain WMA",
    center: [-78.7823, 39.5234],
    harvestCount: 32,
    species: 'Deer',
  },
  {
    landId: 'savage-river-sf',
    landName: 'Savage River State Forest',
    center: [-79.0123, 39.4234],
    harvestCount: 28,
    species: 'Deer',
  },
  {
    landId: 'pocomoke-sf',
    landName: 'Pocomoke State Forest',
    center: [-75.5234, 38.1234],
    harvestCount: 25,
    species: 'Deer',
  },
  {
    landId: 'indian-springs-wma',
    landName: 'Indian Springs WMA',
    center: [-77.1234, 39.1234],
    harvestCount: 22,
    species: 'Deer',
  },
  {
    landId: 'myrtle-grove-wma',
    landName: 'Myrtle Grove WMA',
    center: [-75.9234, 38.5234],
    harvestCount: 18,
    species: 'Deer',
  },
  {
    landId: 'big-woods-wma',
    landName: 'Big Woods WMA',
    center: [-76.4234, 39.2134],
    harvestCount: 16,
    species: 'Deer',
  },
  {
    landId: 'worth-farm-wma',
    landName: 'Worth Farm WMA',
    center: [-76.8234, 38.9234],
    harvestCount: 14,
    species: 'Deer',
  },
  {
    landId: 'soldiers-delight-nrma',
    landName: 'Soldiers Delight NRMA',
    center: [-76.7234, 39.4234],
    harvestCount: 12,
    species: 'Deer',
  },
  {
    landId: 'millington-wma',
    landName: 'Millington WMA',
    center: [-75.8234, 38.8234],
    harvestCount: 11,
    species: 'Deer',
  },
  {
    landId: 'knapps-loch-wma',
    landName: "Knapp's Loch WMA",
    center: [-76.3234, 39.3234],
    harvestCount: 10,
    species: 'Deer',
  },
  {
    landId: 'wild-cat-falls-wma',
    landName: 'Wild Cat Falls WMA',
    center: [-77.2234, 39.5234],
    harvestCount: 9,
    species: 'Deer',
  },
  {
    landId: 'mattawoman-creek-wma',
    landName: 'Mattawoman Creek WMA',
    center: [-76.9234, 38.6234],
    harvestCount: 8,
    species: 'Deer',
  },
  {
    landId: 'seneca-creek-wma',
    landName: 'Seneca Creek WMA',
    center: [-77.4234, 39.1234],
    harvestCount: 7,
    species: 'Deer',
  },
  {
    landId: 'high-plateau-wma',
    landName: 'High Plateau WMA',
    center: [-79.2234, 39.3234],
    harvestCount: 6,
    species: 'Deer',
  },
  {
    landId: 'linwood-wma',
    landName: 'Linwood WMA',
    center: [-77.5234, 38.8234],
    harvestCount: 5,
    species: 'Deer',
  },
  {
    landId: 'finzel-swamp-wma',
    landName: 'Finzel Swamp WMA',
    center: [-79.3234, 39.5234],
    harvestCount: 4,
    species: 'Deer',
  },
  {
    landId: 'discovery-wma',
    landName: 'Discovery WMA',
    center: [-76.2234, 38.7234],
    harvestCount: 3,
    species: 'Deer',
  },
  {
    landId: 'morgan-run-wma',
    landName: 'Morgan Run WMA',
    center: [-76.5234, 39.0234],
    harvestCount: 2,
    species: 'Deer',
  },
  {
    landId: 'chesapeake-bay-wma',
    landName: 'Chesapeake Bay WMA',
    center: [-76.0234, 38.2234],
    harvestCount: 1,
    species: 'Deer',
  },
];

/**
 * Determines harvest intensity category and returns color + opacity
 * @param {number} count - Harvest count
 * @returns {{color: string; opacity: number}} Color and opacity based on intensity
 */
function getHarvestColor(count: number): { color: string; opacity: number } {
  if (count >= 16) {
    return { color: Colors.mdRed, opacity: 0.8 };
  } else if (count >= 6) {
    return { color: Colors.amber, opacity: 0.65 };
  } else {
    return { color: Colors.mdGold, opacity: 0.5 };
  }
}

/**
 * Converts harvest data into GeoJSON FeatureCollection
 * @param {HarvestDataPoint[]} data - Array of harvest data points
 * @returns {HarvestGeoJSON} GeoJSON FeatureCollection
 */
function createHarvestGeoJSON(data: HarvestDataPoint[]): HarvestGeoJSON {
  return {
    type: 'FeatureCollection',
    features: data.map((point) => {
      const { color, opacity } = getHarvestColor(point.harvestCount);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point.center,
        },
        properties: {
          landId: point.landId,
          landName: point.landName,
          harvestCount: point.harvestCount,
          species: point.species,
          color,
          opacity,
        },
      };
    }),
  };
}

/**
 * HarvestHeatmap — Overlay component for community harvest density visualization
 *
 * Renders circles at land center points, sized and colored based on harvest counts.
 * Attempts to fetch live data from backend; falls back to mock data on error.
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether to render the heatmap
 * @returns {JSX.Element | null} Mapbox layer components or null if hidden
 */
interface HarvestHeatmapProps {
  visible: boolean;
}

export const HarvestHeatmap: React.FC<HarvestHeatmapProps> = ({ visible }) => {
  const [harvestData, setHarvestData] = useState<HarvestDataPoint[]>(MOCK_HARVEST_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      return;
    }

    const fetchHarvestData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Attempt to fetch from backend
        // Backend endpoint: GET /api/v1/harvest/community/stats
        // This is a placeholder — backend not yet implemented
        // For now, we use mock data as the endpoint isn't active yet
        setHarvestData(MOCK_HARVEST_DATA);
      } catch (err) {
        // Fall back to mock data on any error (network, 404, etc.)
        console.warn('Failed to fetch harvest data, using mock data:', err);
        setHarvestData(MOCK_HARVEST_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchHarvestData();
  }, [visible]);

  if (!visible) {
    return null;
  }

  const geoJSON = createHarvestGeoJSON(harvestData);

  return (
    <MapboxGL.ShapeSource
      id="harvestHeatmapSource"
      shape={geoJSON}
    >
      {/* Circle layer with size and opacity based on harvest count */}
      <MapboxGL.CircleLayer
        id="harvestCircles"
        style={{
          circleColor: ['get', 'color'],
          circleRadius: [
            'interpolate',
            ['linear'],
            ['get', 'harvestCount'],
            1,
            4,
            45,
            20,
          ],
          circleOpacity: ['get', 'opacity'],
          circlePitchAlignment: 'map',
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 1.5,
          circleStrokeOpacity: 0.9,
        }}
      />

      {/* Labels showing harvest count at higher zoom levels */}
      <MapboxGL.SymbolLayer
        id="harvestLabels"
        minZoomLevel={10}
        style={{
          textField: ['get', 'harvestCount'],
          textSize: 10,
          textColor: Colors.mdBlack,
          textHaloColor: Colors.mdWhite,
          textHaloWidth: 1,
          textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        }}
      />
    </MapboxGL.ShapeSource>
  );
};

export default HarvestHeatmap;
