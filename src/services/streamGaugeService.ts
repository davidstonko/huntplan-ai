/**
 * @file streamGaugeService.ts
 * @description Live Maryland stream/river conditions from the USGS NWIS
 * Instantaneous Values API (public domain, no key). Powers a TroutRoutes-style
 * "live gauges" layer: real-time discharge (CFS), gage height (ft), and water
 * temperature for active Maryland USGS stations.
 *
 * Parameter codes: 00060 = discharge (ft³/s), 00065 = gage height (ft),
 * 00010 = water temperature (°C, converted to °F here).
 *
 * Offline-first: any failure returns the last cached set or an empty array —
 * never throws.
 *
 * Attribution: "Stream gauges: USGS NWIS".
 *
 * @module services/streamGaugeService
 */

import axios from 'axios';
import { MARYLAND_STREAM_GAGES } from '../data/marylandStreamGages';

const NWIS_IV_URL = 'https://waterservices.usgs.gov/nwis/iv/';
const CACHE_TTL_MS = 15 * 60 * 1000; // gauges report roughly hourly
const REQUEST_TIMEOUT_MS = 15000;
/** USGS no-data sentinel returned in place of a reading. */
const NO_DATA = '-999999';

export const GAUGE_ATTRIBUTION = 'Stream gauges: USGS NWIS';

export interface GaugeReading {
  value: number;
  unit: string;
  /** ISO timestamp of the reading. */
  at: string;
}

export interface StreamGauge {
  siteCode: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Discharge in ft³/s (00060). */
  flowCfs: GaugeReading | null;
  /** Gage height in ft (00065). */
  gageHeightFt: GaugeReading | null;
  /** Water temperature in °F (converted from the API's °C, 00010). */
  waterTempF: GaugeReading | null;
  /** USGS site page for "more info". */
  usgsUrl: string;
}

let memCache: { ts: number; data: StreamGauge[] } | null = null;

/**
 * Offline fallback: the 186 bundled MD USGS station locations with no live
 * readings, so the gauge layer still shows WHERE gauges are with no signal.
 */
export function bundledGaugeStations(): StreamGauge[] {
  return MARYLAND_STREAM_GAGES.map((s) => ({
    siteCode: s.usgsId,
    name: s.name,
    latitude: s.lat,
    longitude: s.lng,
    flowCfs: null,
    gageHeightFt: null,
    waterTempF: null,
    usgsUrl: `https://waterdata.usgs.gov/monitoring-location/${s.usgsId}/`,
  }));
}

function latestReading(ts: any): { value: number; unit: string; at: string } | null {
  const unit = ts?.variable?.unit?.unitCode ?? '';
  const point = ts?.values?.[0]?.value?.[0];
  if (!point) return null;
  const raw = point.value;
  if (raw == null || raw === NO_DATA) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return { value: num, unit, at: point.dateTime ?? '' };
}

/** Parse a raw NWIS IV JSON payload into a per-site gauge list. */
export function parseNwisResponse(json: any): StreamGauge[] {
  const series: any[] = json?.value?.timeSeries ?? [];
  const bySite = new Map<string, StreamGauge>();

  for (const ts of series) {
    const siteCode = ts?.sourceInfo?.siteCode?.[0]?.value;
    if (!siteCode) continue;
    const paramCode = ts?.variable?.variableCode?.[0]?.value;
    const reading = latestReading(ts);

    let gauge = bySite.get(siteCode);
    if (!gauge) {
      const geo = ts?.sourceInfo?.geoLocation?.geogLocation ?? {};
      gauge = {
        siteCode,
        name: ts?.sourceInfo?.siteName ?? siteCode,
        latitude: Number(geo.latitude),
        longitude: Number(geo.longitude),
        flowCfs: null,
        gageHeightFt: null,
        waterTempF: null,
        usgsUrl: `https://waterdata.usgs.gov/monitoring-location/${siteCode}/`,
      };
      bySite.set(siteCode, gauge);
    }

    if (!reading) continue;
    if (paramCode === '00060') {
      gauge.flowCfs = { value: reading.value, unit: 'ft³/s', at: reading.at };
    } else if (paramCode === '00065') {
      gauge.gageHeightFt = { value: reading.value, unit: 'ft', at: reading.at };
    } else if (paramCode === '00010') {
      // API reports Celsius; convert to Fahrenheit for the audience.
      const f = Math.round((reading.value * 9) / 5 + 32);
      gauge.waterTempF = { value: f, unit: '°F', at: reading.at };
    }
  }

  // Keep only sites with a valid location and at least one live reading.
  return Array.from(bySite.values()).filter(
    (g) =>
      Number.isFinite(g.latitude) &&
      Number.isFinite(g.longitude) &&
      (g.flowCfs || g.gageHeightFt || g.waterTempF),
  );
}

/**
 * Fetch live Maryland stream gauges (statewide, cached 15 min). Never throws.
 * Falls back to the bundled station locations (no live readings) when offline
 * or when the API returns nothing, so the layer is useful with no signal.
 */
export async function fetchMarylandStreamGauges(): Promise<StreamGauge[]> {
  if (memCache && Date.now() - memCache.ts < CACHE_TTL_MS) {
    return memCache.data;
  }
  try {
    const response = await axios.get(NWIS_IV_URL, {
      timeout: REQUEST_TIMEOUT_MS,
      params: {
        format: 'json',
        stateCd: 'md',
        parameterCd: '00060,00065,00010',
        siteStatus: 'active',
      },
    });
    const gauges = parseNwisResponse(response.data);
    if (gauges.length > 0) {
      memCache = { ts: Date.now(), data: gauges };
      return gauges;
    }
    return memCache ? memCache.data : bundledGaugeStations();
  } catch {
    return memCache ? memCache.data : bundledGaugeStations();
  }
}

/** Render gauges as a GeoJSON FeatureCollection for a Mapbox ShapeSource. */
export function gaugesToGeoJSON(gauges: StreamGauge[]): {
  type: 'FeatureCollection';
  features: any[];
} {
  return {
    type: 'FeatureCollection',
    features: gauges.map((g) => ({
      type: 'Feature',
      id: g.siteCode,
      properties: {
        siteCode: g.siteCode,
        name: g.name,
        flow: g.flowCfs?.value ?? null,
        label: g.flowCfs ? `${Math.round(g.flowCfs.value)} cfs` : g.name,
      },
      geometry: { type: 'Point', coordinates: [g.longitude, g.latitude] },
    })),
  };
}

/** Test/maintenance helper — clears the in-memory cache. */
export function _clearGaugeCache(): void {
  memCache = null;
}
