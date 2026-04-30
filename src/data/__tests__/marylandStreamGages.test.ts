/**
 * MARYLAND_STREAM_GAGES contract tests.
 *
 * Guards the 186 USGS stream gauges inside the MD bounding box shipped in
 * Build 7 (2026-04-19). Source: DNR-published USGS Stream Gages view.
 */

import { MARYLAND_STREAM_GAGES } from '../marylandStreamGages';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};

describe('MARYLAND_STREAM_GAGES', () => {
  it('ships the documented record count (186)', () => {
    expect(MARYLAND_STREAM_GAGES.length).toBe(186);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_STREAM_GAGES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique USGS site IDs', () => {
    const usgsIds = MARYLAND_STREAM_GAGES.map((g) => g.usgsId);
    expect(new Set(usgsIds).size).toBe(usgsIds.length);
  });

  // 0.05° buffer matches ingest
  const BUF = 0.05;
  it('every coordinate is inside MD bbox (0.05° buffer)', () => {
    for (const g of MARYLAND_STREAM_GAGES) {
      expect(g.lat).toBeGreaterThanOrEqual(MD_BBOX.latMin - BUF);
      expect(g.lat).toBeLessThanOrEqual(MD_BBOX.latMax + BUF);
      expect(g.lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin - BUF);
      expect(g.lng).toBeLessThanOrEqual(MD_BBOX.lonMax + BUF);
    }
  });

  it('every gauge has a non-empty name and USGS ID', () => {
    for (const g of MARYLAND_STREAM_GAGES) {
      expect(typeof g.name).toBe('string');
      expect(g.name.length).toBeGreaterThan(0);
      expect(typeof g.usgsId).toBe('string');
      expect(g.usgsId.length).toBeGreaterThan(0);
    }
  });

  it('USGS IDs are numeric strings (NWIS site_no format)', () => {
    // NWIS site numbers are 8-15 numeric characters.
    for (const g of MARYLAND_STREAM_GAGES) {
      expect(g.usgsId).toMatch(/^\d{8,15}$/);
    }
  });
});
