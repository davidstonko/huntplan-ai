/**
 * Maryland Fishable Reach Stream Segments
 *
 * GeoJSON FeatureCollection of LineString features representing the fishable
 * stretches of Maryland rivers and streams. Geometries are simplified
 * (Douglas-Peucker ~50m tolerance) for efficient rendering.
 *
 * Source: MD DNR ArcGIS FeatureServer (Public Fishable Reach layer)
 *
 * Ship status (2026-04-19 audit): EMPTY BY DESIGN.
 * The upstream DNR endpoint returned HTTP 400 on all three 2026-04-18
 * ingest attempts (see auto-memory: wave2_phase5_complete_2026_04_18.md).
 * Rather than ship fabricated or approximated linework, we ship an empty
 * FeatureCollection and let the FishMap fall back to per-site LineString
 * overlays carried on AnglerAccessSite.fishableReach. When the DNR layer
 * is back online, re-run the ingest script and this file will repopulate.
 *
 * Feature count: 0
 * Generated: 2026-04-18T14:56:35.474Z
 * Audited empty: 2026-04-19
 */

export interface FishableReachProperties {
  streamName: string;
  classification?: string;
  length_mi?: number;
  regulations?: string;
}

export interface FishableReachFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: FishableReachProperties;
}

export interface FishableReachGeoJSON {
  type: 'FeatureCollection';
  features: FishableReachFeature[];
}

export const fishableReachGeoJSON: FishableReachGeoJSON = {
  "type": "FeatureCollection",
  "features": []
};
