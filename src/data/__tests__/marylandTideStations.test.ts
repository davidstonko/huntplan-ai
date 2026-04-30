/**
 * MARYLAND_TIDE_STATIONS contract tests.
 *
 * Guards the 105 NOAA CO-OPS tide prediction stations (MD + DC) shipped in
 * Build 7 (2026-04-19). Source: NOAA metadata API, filtered by state.
 */

import { MARYLAND_TIDE_STATIONS } from '../marylandTideStations';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};

describe('MARYLAND_TIDE_STATIONS', () => {
  it('ships the documented record count (105)', () => {
    expect(MARYLAND_TIDE_STATIONS.length).toBe(105);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_TIDE_STATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique NOAA ids', () => {
    const noaa = MARYLAND_TIDE_STATIONS.map((s) => s.noaaId);
    expect(new Set(noaa).size).toBe(noaa.length);
  });

  it('every station has state of MD or DC', () => {
    for (const s of MARYLAND_TIDE_STATIONS) {
      expect(['MD', 'DC']).toContain(s.state);
    }
  });

  const BUF = 0.05;
  it('every coordinate is inside MD bbox (0.05° buffer)', () => {
    for (const s of MARYLAND_TIDE_STATIONS) {
      expect(s.lat).toBeGreaterThanOrEqual(MD_BBOX.latMin - BUF);
      expect(s.lat).toBeLessThanOrEqual(MD_BBOX.latMax + BUF);
      expect(s.lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin - BUF);
      expect(s.lng).toBeLessThanOrEqual(MD_BBOX.lonMax + BUF);
    }
  });

  it('every station has a non-empty name', () => {
    for (const s of MARYLAND_TIDE_STATIONS) {
      expect(typeof s.name).toBe('string');
      expect(s.name.length).toBeGreaterThan(0);
    }
  });

  it('NOAA ids are 7-digit numeric strings', () => {
    for (const s of MARYLAND_TIDE_STATIONS) {
      expect(s.noaaId).toMatch(/^\d{7}$/);
    }
  });

  it('stationType is R or S', () => {
    for (const s of MARYLAND_TIDE_STATIONS) {
      expect(['R', 'S']).toContain(s.stationType);
    }
  });
});
