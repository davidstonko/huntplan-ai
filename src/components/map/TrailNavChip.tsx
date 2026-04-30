/**
 * TrailNavChip — Hike-map overlay that tells the user where they are
 * relative to the nearest trail.
 *
 * V2_3_FEATURE_EXPANSION_PLAN §B.3.b/c:
 *
 *   - When the user is on or near a trail, shows that trail's name +
 *     progress (miles along / miles total).
 *   - When the user is off-trail (>25 m per B.3.b), shows a red "Off
 *     trail — X mi from <trail>" banner so they can course-correct.
 *   - When no location is available, renders nothing.
 *
 * The component is a thin view — all of the snap-to-polyline math
 * lives in `trailNavService`. Caller passes in the trails the user is
 * filtering to, and we pick the nearest one.
 *
 * 2026-04-26 (fork merge):
 *   - Added a close button so the user can dismiss the chip when it's
 *     covering content. Dismissed state persists in AsyncStorage.
 *   - Moved the chip below the difficulty-filter bar (top: 110) so it
 *     no longer overlaps the stats badge or the chip row above it.
 *   - "Off trail — 3,849,073 m off" → distance now formats sensibly:
 *     ≥1 mi → "X.X mi off", ≥100 m → "Xm off", else "<100m off".
 *
 * @module Components/Map
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  findNearestTrail,
  classifyTrailStatus,
  type NearestTrailCandidate,
} from '../../services/trailNavService';

const DISMISSED_KEY = '@trail_nav_chip_dismissed_v1';

interface Props {
  /** User's current lat/lng (from useLocation). Null hides the chip. */
  userLat: number | null | undefined;
  userLng: number | null | undefined;
  /** Trails in consideration. HikeMapScreen composes this from AT + state trails. */
  trails: NearestTrailCandidate[];
  /** Optional override for off-trail banner threshold (default 25 m). */
  offTrailThresholdMeters?: number;
}

function metersToMiles(m: number): number {
  return m / 1609.344;
}

/** Format a distance in meters for the off-trail banner. */
function formatOffDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters >= 1609.344) {
    const mi = metersToMiles(meters);
    // 1 decimal up to 100 mi, 0 decimals beyond
    return mi >= 100 ? `${mi.toFixed(0)} mi off` : `${mi.toFixed(1)} mi off`;
  }
  return `${Math.round(meters)} m off`;
}

export default function TrailNavChip({
  userLat,
  userLng,
  trails,
  offTrailThresholdMeters,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(DISMISSED_KEY).then((v) => {
      if (alive && v === '1') setDismissed(true);
    });
    return () => { alive = false; };
  }, []);

  const onDismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, '1').catch(() => {});
  }, []);

  // Reset hook — exposed via state if a parent ever wants to re-show.
  // Currently dismiss is one-way per session storage.
  const result = useMemo(() => {
    if (
      userLat == null ||
      userLng == null ||
      !Number.isFinite(userLat) ||
      !Number.isFinite(userLng)
    ) {
      return null;
    }
    return findNearestTrail(userLat, userLng, trails);
  }, [userLat, userLng, trails]);

  if (!result || dismissed) return null;

  const status = classifyTrailStatus(result.snap, {
    nearThresholdMeters: offTrailThresholdMeters,
  });

  const alongMi = metersToMiles(result.snap.distanceAlongTrailMeters);
  const totalMi = metersToMiles(result.snap.totalTrailMeters);
  const offFormatted = formatOffDistance(result.snap.distanceFromTrailMeters);
  const name = result.trail.name ?? 'Nearest trail';

  return (
    <View
      style={[
        styles.chip,
        status === 'off-trail' ? styles.chipOff : styles.chipOn,
      ]}
      accessibilityLabel="Trail navigation status"
    >
      <View style={styles.contentColumn}>
        <Text style={styles.titleText} numberOfLines={1}>
          {status === 'off-trail' ? 'Off trail' : 'On trail'}
        </Text>
        <Text style={styles.bodyText} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.subText} numberOfLines={1}>
          {status === 'off-trail'
            ? `${offFormatted} · ${alongMi.toFixed(1)} / ${totalMi.toFixed(1)} mi`
            : `${alongMi.toFixed(1)} / ${totalMi.toFixed(1)} mi`}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.closeBtn}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss trail navigation chip"
      >
        <Text style={styles.closeBtnText}>{'\u00D7'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    // 2026-04-26 (fork merge): bumped from top:12 → top:110 so the chip
    // sits below the difficulty-filter bar (top:58, height ~44) instead
    // of stacking on top of the stats badge and chip row.
    top: 110,
    left: 12,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: 8,
    maxWidth: 240,
    zIndex: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chipOn: {
    backgroundColor: 'rgba(16,185,129,0.9)', // emerald-500/90
    borderColor: '#065f46',
  },
  chipOff: {
    backgroundColor: 'rgba(220,38,38,0.92)', // red-600/92
    borderColor: '#7f1d1d',
  },
  contentColumn: {
    flex: 1,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bodyText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  subText: {
    color: '#e5e7eb',
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
});
