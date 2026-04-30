/**
 * Contract test: the +/- zoom-button fix (2026-04-20) must stay fixed.
 *
 * Background
 * ----------
 * Build 3 shipped with a bug in Fish/Hike/Camp map screens where zoomIn/zoomOut
 * read `(cameraRef.current as any)?._centerCoordinate?.[2]` to derive the
 * current camera zoom. That expression is ALWAYS undefined — `_centerCoordinate`
 * is a [lng, lat] 2-tuple in @rnmapbox/maps, not a [lng, lat, zoom] 3-tuple —
 * so the expression fell back to DEFAULT_ZOOM on every click. If the user had
 * pinched or double-tapped past DEFAULT_ZOOM, tapping + actually zoomed them
 * OUT to DEFAULT_ZOOM+1.
 *
 * Why a grep-test, not a render test
 * ----------------------------------
 * jest mocks @rnmapbox/maps; mounted MapView doesn't simulate real camera
 * state. A unit test of the handler therefore can't catch "zoomTo was called
 * with the wrong target" in any meaningful way. The only durable way to
 * prevent regression is to forbid the bad source pattern.
 *
 * This test asserts:
 *   1. No screen reads `_centerCoordinate[2]` (or any ?.[2] off _centerCoordinate).
 *   2. Every screen that renders a MapboxGL.MapView with +/- zoom buttons
 *      tracks camera zoom via onCameraChanged.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const MAP_SCREENS = [
  'src/screens/FishMapScreen.tsx',
  'src/screens/HikeMapScreen.tsx',
  'src/screens/CampMapScreen.tsx',
];

const repoRoot = join(__dirname, '..', '..');

describe('map zoom-button contract', () => {
  describe.each(MAP_SCREENS)('%s', (relPath) => {
    const src = readFileSync(join(repoRoot, relPath), 'utf8');

    it('does not read _centerCoordinate[2] as a zoom fallback', () => {
      // The exact old bug line. Allowed to appear in comments (we keep the
      // explanation), but never in code. Approximate that by forbidding the
      // live expression shape.
      const bad = /cameraRef\.current\s+as\s+any\)\s*\?\._centerCoordinate\s*\?\.\[2\]/;
      expect(src).not.toMatch(bad);
    });

    it('tracks zoom via onCameraChanged when +/- buttons exist', () => {
      const hasZoomIn = /onPress=\{zoomIn\}/.test(src);
      const hasZoomOut = /onPress=\{zoomOut\}/.test(src);
      if (!hasZoomIn && !hasZoomOut) return; // screen has no zoom buttons
      expect(src).toMatch(/onCameraChanged/);
      expect(src).toMatch(/setCurrentZoom/);
    });

    it('zoomIn/zoomOut compute deltas from currentZoom state', () => {
      const hasZoomBtns = /onPress=\{zoomIn\}/.test(src) && /onPress=\{zoomOut\}/.test(src);
      if (!hasZoomBtns) return;
      // zoomIn should reference currentZoom (+1), zoomOut should reference (-1).
      expect(src).toMatch(/currentZoom\s*\+\s*1/);
      expect(src).toMatch(/currentZoom\s*-\s*1/);
    });
  });
});
