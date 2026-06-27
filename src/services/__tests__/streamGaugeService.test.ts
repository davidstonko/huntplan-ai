/**
 * @file streamGaugeService.test.ts
 * @description Tests for the USGS NWIS stream-gauge parser/service: field
 * mapping, °C→°F conversion, no-data filtering, offline fallback, and caching.
 */

import axios from 'axios';
import {
  parseNwisResponse,
  fetchMarylandStreamGauges,
  bundledGaugeStations,
  gaugesToGeoJSON,
  _clearGaugeCache,
} from '../streamGaugeService';

jest.mock('axios');
const mockedGet = axios.get as jest.Mock;

function ts(siteCode: string, name: string, lat: number, lng: number, param: string, value: string) {
  return {
    sourceInfo: {
      siteName: name,
      siteCode: [{ value: siteCode }],
      geoLocation: { geogLocation: { latitude: lat, longitude: lng } },
    },
    variable: { variableCode: [{ value: param }], unit: { unitCode: 'x' } },
    values: [{ value: [{ value, dateTime: '2026-06-27T08:50:00.000-04:00' }] }],
  };
}

const sample = {
  value: {
    timeSeries: [
      ts('01646500', 'POTOMAC RIVER NEAR WASH DC', 38.9498, -77.1276, '00060', '2400'),
      ts('01646500', 'POTOMAC RIVER NEAR WASH DC', 38.9498, -77.1276, '00065', '4.12'),
      ts('01646500', 'POTOMAC RIVER NEAR WASH DC', 38.9498, -77.1276, '00010', '20'), // 20°C -> 68°F
      // A second site whose only reading is the USGS no-data sentinel -> dropped.
      ts('01580000', 'DEER CREEK', 39.6, -76.4, '00060', '-999999'),
    ],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  _clearGaugeCache();
});

describe('parseNwisResponse', () => {
  it('groups params per site and converts water temp C→F', () => {
    const gauges = parseNwisResponse(sample);
    expect(gauges).toHaveLength(1); // no-data site dropped
    const g = gauges[0];
    expect(g.siteCode).toBe('01646500');
    expect(g.flowCfs?.value).toBe(2400);
    expect(g.flowCfs?.unit).toBe('ft³/s');
    expect(g.gageHeightFt?.value).toBe(4.12);
    expect(g.waterTempF?.value).toBe(68);
    expect(g.usgsUrl).toContain('01646500');
  });

  it('returns [] for an empty / malformed payload', () => {
    expect(parseNwisResponse({})).toEqual([]);
    expect(parseNwisResponse({ value: { timeSeries: [] } })).toEqual([]);
  });
});

describe('fetchMarylandStreamGauges', () => {
  it('queries NWIS for active MD flow/height/temp', async () => {
    mockedGet.mockResolvedValueOnce({ data: sample });
    const gauges = await fetchMarylandStreamGauges();
    expect(gauges).toHaveLength(1);
    const params = mockedGet.mock.calls[0][1].params;
    expect(params.stateCd).toBe('md');
    expect(params.parameterCd).toBe('00060,00065,00010');
    expect(params.siteStatus).toBe('active');
  });

  it('caches within the TTL (one network call for two reads)', async () => {
    mockedGet.mockResolvedValueOnce({ data: sample });
    await fetchMarylandStreamGauges();
    await fetchMarylandStreamGauges();
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('falls back to bundled station locations when offline (never throws)', async () => {
    mockedGet.mockRejectedValueOnce(new Error('offline'));
    const gauges = await fetchMarylandStreamGauges();
    expect(gauges.length).toBeGreaterThan(100); // bundled MD stations
    expect(gauges[0].flowCfs).toBeNull(); // locations only, no live readings
  });
});

describe('bundledGaugeStations', () => {
  it('exposes the bundled MD stations with locations and no readings', () => {
    const stations = bundledGaugeStations();
    expect(stations.length).toBeGreaterThan(100);
    for (const s of stations.slice(0, 5)) {
      expect(Number.isFinite(s.latitude)).toBe(true);
      expect(Number.isFinite(s.longitude)).toBe(true);
      expect(s.usgsUrl).toContain(s.siteCode);
      expect(s.flowCfs).toBeNull();
    }
  });
});

describe('gaugesToGeoJSON', () => {
  it('builds point features with a cfs label', () => {
    const gauges = parseNwisResponse(sample);
    const fc = gaugesToGeoJSON(gauges);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features[0].geometry.type).toBe('Point');
    expect(fc.features[0].geometry.coordinates).toEqual([-77.1276, 38.9498]);
    expect(fc.features[0].properties.label).toBe('2400 cfs');
  });
});
