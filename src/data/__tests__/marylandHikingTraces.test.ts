/**
 * marylandHikingTraces contract tests.
 *
 * Codifies the data-quality gate so no future ingestion regression can ship
 * polylines that violate the IS_APPROXIMATE UX contract. Mirrors the checks the
 * independent auditor ran on 2026-04-19 when 4 AT segments were caught with
 * confidence=high, isApproximate=false despite length ratios outside 0.5-2.0x.
 */

import {
  HIKING_TRACES,
  AT_SEGMENT_TRACES,
  HIKING_TRACE_GAPS,
  HIKING_TRACE_SUMMARY,
} from '../marylandHikingTraces';
import type { HikingTrace } from '../marylandHikingTraces';

// Maryland bbox with a small buffer for the AT (runs along the PA border and
// dips briefly into WV at Harpers Ferry).
const MD_BBOX = {
  latMin: 37.7,
  latMax: 39.9,
  lonMin: -79.6,
  lonMax: -74.9,
};

function haversineMi(a: number[], b: number[]): number {
  const R = 6371000;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return (2 * R * Math.asin(Math.sqrt(x))) / 1609.344;
}

function polylineLengthMi(coords: number[][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineMi(coords[i - 1], coords[i]);
  }
  return total;
}

const ALL_TRACES: HikingTrace[] = [
  ...Object.values(HIKING_TRACES),
  ...Object.values(AT_SEGMENT_TRACES),
];

describe('marylandHikingTraces — data-quality contract', () => {
  describe('Bbox sanity', () => {
    it.each(ALL_TRACES)('$id stays within Maryland bbox', (trace) => {
      for (const [lon, lat] of trace.coordinates) {
        expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
        expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax);
        expect(lon).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
        expect(lon).toBeLessThanOrEqual(MD_BBOX.lonMax);
      }
    });
  });

  describe('Coordinate shape', () => {
    it.each(ALL_TRACES)('$id has at least 2 points', (trace) => {
      expect(trace.coordinates.length).toBeGreaterThanOrEqual(2);
    });

    it.each(ALL_TRACES)('$id has [lon, lat] pairs', (trace) => {
      for (const pt of trace.coordinates) {
        expect(pt.length).toBe(2);
        expect(typeof pt[0]).toBe('number');
        expect(typeof pt[1]).toBe('number');
      }
    });
  });

  describe('IS_APPROXIMATE contract (0.5-2.0x gate)', () => {
    it.each(ALL_TRACES)(
      '$id: any trace outside 0.5-2.0x published must be isApproximate=true',
      (trace) => {
        if (!trace.publishedMi || trace.publishedMi <= 0) {
          return;
        }
        const ratio = trace.lengthMi / trace.publishedMi;
        if (ratio < 0.5 || ratio > 2.0) {
          expect(trace.isApproximate).toBe(true);
        }
      },
    );

    it.each(ALL_TRACES)(
      '$id: any trace outside 0.25-4.0x published must not ship (would be "none")',
      (trace) => {
        if (!trace.publishedMi || trace.publishedMi <= 0) {
          return;
        }
        const ratio = trace.lengthMi / trace.publishedMi;
        expect(ratio).toBeGreaterThanOrEqual(0.25);
        expect(ratio).toBeLessThanOrEqual(4.0);
      },
    );

    it.each(ALL_TRACES)(
      '$id: high confidence means length within 0.5-2.0x published',
      (trace) => {
        if (trace.confidence !== 'high') {
          return;
        }
        if (!trace.publishedMi || trace.publishedMi <= 0) {
          return;
        }
        const ratio = trace.lengthMi / trace.publishedMi;
        expect(ratio).toBeGreaterThanOrEqual(0.5);
        expect(ratio).toBeLessThanOrEqual(2.0);
      },
    );

    it.each(ALL_TRACES)(
      '$id: high confidence means isApproximate=false',
      (trace) => {
        if (trace.confidence !== 'high') {
          return;
        }
        expect(trace.isApproximate).toBe(false);
      },
    );
  });

  describe('Length integrity', () => {
    it.each(ALL_TRACES)(
      '$id: stored lengthMi matches computed polyline length within 5%',
      (trace) => {
        const computed = polylineLengthMi(trace.coordinates);
        const stored = trace.lengthMi;
        // Allow 5% tolerance for rounding.
        const diff = Math.abs(computed - stored);
        expect(diff).toBeLessThan(Math.max(0.05, stored * 0.05));
      },
    );
  });

  describe('Source attribution', () => {
    it.each(ALL_TRACES)('$id has a non-empty source string', (trace) => {
      expect(trace.source).toBeTruthy();
      expect(typeof trace.source).toBe('string');
    });

    it.each(ALL_TRACES)('$id has a source URL', (trace) => {
      expect(trace.sourceUrl).toBeTruthy();
      expect(trace.sourceUrl).toMatch(/^https?:\/\//);
    });

    it.each(ALL_TRACES)('$id has a datePulled ISO date', (trace) => {
      expect(trace.datePulled).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Summary consistency', () => {
    it('totalTrails equals geometry + gaps', () => {
      expect(HIKING_TRACE_SUMMARY.totalTrails).toBe(
        HIKING_TRACE_SUMMARY.withGeometry + HIKING_TRACE_SUMMARY.withoutGeometry,
      );
    });

    it('withGeometry equals count of HIKING_TRACES + AT_SEGMENT_TRACES', () => {
      expect(HIKING_TRACE_SUMMARY.withGeometry).toBe(
        Object.keys(HIKING_TRACES).length + Object.keys(AT_SEGMENT_TRACES).length,
      );
    });

    it('withoutGeometry equals HIKING_TRACE_GAPS length', () => {
      expect(HIKING_TRACE_SUMMARY.withoutGeometry).toBe(HIKING_TRACE_GAPS.length);
    });

    it('byConfidence sums to withGeometry', () => {
      const sum = Object.values(HIKING_TRACE_SUMMARY.byConfidence).reduce(
        (a: number, b: number) => a + b,
        0,
      );
      expect(sum).toBe(HIKING_TRACE_SUMMARY.withGeometry);
    });
  });
});
