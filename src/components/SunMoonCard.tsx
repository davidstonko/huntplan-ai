/**
 * @file SunMoonCard.tsx
 * @description Daily Briefing Sun & Moon panel — Phase A.29.
 *
 * Compact, offline-first card that shows the most time-sensitive morning
 * information for hunters/anglers/hikers/campers: legal-light window,
 * sunrise/sunset, day length, moon phase + illumination.
 *
 * @module Components
 * @version 2.3.0
 *
 * Composition:
 *  - Header row: SECTION TITLE + date.
 *  - Sun ribbon: 4 stacked time chips (LEGAL START, SUNRISE, SUNSET,
 *    LEGAL END) so the legal-light bookends are obvious next to civil
 *    sunrise/sunset.
 *  - Day length pill.
 *  - Moon block: View-shape disc (no SVG, no emoji), phase name,
 *    illumination %.
 *
 * Data source: synchronous `getLocalSolunarData` from solunarService —
 * same offline model already powering Best Times. No network on mount.
 *
 * Why not the async `getSolunarData`? The Daily Briefing renders
 * immediately on app open; awaiting a fetch would either flash an
 * empty card or block paint. The local model is accurate enough for
 * a "time-of-day at-a-glance" surface (±1 min for sunrise; phase is
 * astronomical and identical to the backend).
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '../theme/colors';
import { getLocalSolunarData } from '../services/solunarService';

/**
 * Format a "HH:MM" 24h time string as "h:MM AM/PM". Returns the input
 * unchanged if it doesn't parse — the local solunar model always emits
 * a valid HH:MM, so this is a defensive guard rather than an expected
 * branch.
 */
export function formatTime12(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h24 = Number(m[1]);
  const mins = m[2];
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mins} ${period}`;
}

/**
 * Compute day length in "Hh MMm" form from HH:MM sunrise/sunset strings.
 * Treats sunset as same-day; the local solunar model never returns
 * crossing-midnight times for Maryland latitudes.
 */
export function computeDayLength(sunrise: string, sunset: string): string {
  const r = /^(\d{2}):(\d{2})$/.exec(sunrise);
  const s = /^(\d{2}):(\d{2})$/.exec(sunset);
  if (!r || !s) return '';
  const rMin = Number(r[1]) * 60 + Number(r[2]);
  const sMin = Number(s[1]) * 60 + Number(s[2]);
  const total = Math.max(0, sMin - rMin);
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${h}h ${String(mm).padStart(2, '0')}m`;
}

/**
 * Discrete moon phase → left-half / right-half brightness in [0, 1].
 *
 * Northern-hemisphere convention: the moon waxes right-to-left.
 *   New (0)   → both dark
 *   1st Q (.25) → right half lit
 *   Full (.5)  → both lit
 *   Last Q (.75) → left half lit
 *
 * Crescent / gibbous phases interpolate the relevant half's brightness
 * so the disc transitions smoothly through the synodic month.
 */
export function moonHalfBrightness(phaseFraction: number): {
  left: number;
  right: number;
} {
  // Wrap into [0, 1) to be safe against tiny floating-point drift.
  const p = ((phaseFraction % 1) + 1) % 1;
  if (p < 0.25) return { left: 0, right: p / 0.25 };
  if (p < 0.5) return { left: (p - 0.25) / 0.25, right: 1 };
  if (p < 0.75) return { left: 1, right: 1 - (p - 0.5) / 0.25 };
  return { left: 1 - (p - 0.75) / 0.25, right: 0 };
}

interface SunMoonCardProps {
  /** YYYY-MM-DD; same string the briefing service already computes. */
  ymd: string;
  /** Decimal latitude (Maryland centroid is a sane default). */
  latitude: number;
  /** Decimal longitude (negative in Maryland). */
  longitude: number;
}

/**
 * SunMoonCard — Daily Briefing Sun & Moon panel (Phase A.29).
 *
 * Pure presentational + tiny synchronous service call. Safe to mount
 * anywhere; no GPS permission, no fetch, no AsyncStorage.
 */
export default function SunMoonCard({
  ymd,
  latitude,
  longitude,
}: SunMoonCardProps): JSX.Element {
  const data = useMemo(
    () => getLocalSolunarData(latitude, longitude, ymd),
    [latitude, longitude, ymd],
  );

  const { sun, moon } = data;
  const dayLength = useMemo(
    () => computeDayLength(sun.sunrise, sun.sunset),
    [sun.sunrise, sun.sunset],
  );
  const halves = useMemo(
    () => moonHalfBrightness(moon.phase_fraction),
    [moon.phase_fraction],
  );

  return (
    <View style={styles.section} accessibilityLabel="Today's sun and moon">
      <Text style={styles.sectionTitle}>TODAY'S SUN &amp; MOON</Text>

      {/* ── Sun ribbon — 4 chips: legal start / sunrise / sunset / legal end ── */}
      <View style={styles.ribbon}>
        <SunChip label="LEGAL START" time={sun.legal_start} accent={false} />
        <SunChip label="SUNRISE" time={sun.sunrise} accent />
        <SunChip label="SUNSET" time={sun.sunset} accent />
        <SunChip label="LEGAL END" time={sun.legal_end} accent={false} />
      </View>

      {/* ── Day length pill (right-aligned, subtle) ── */}
      {dayLength !== '' ? (
        <View style={styles.dayLengthRow}>
          <View style={styles.dayLengthPill}>
            <Text style={styles.dayLengthLabel}>DAY LENGTH</Text>
            <Text style={styles.dayLengthValue}>{dayLength}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Moon block — disc + phase + illumination ── */}
      <View style={styles.moonRow}>
        <MoonDisc leftBrightness={halves.left} rightBrightness={halves.right} />
        <View style={styles.moonText}>
          <Text style={styles.moonPhase}>{moon.phase_name}</Text>
          <Text style={styles.moonIllum}>
            {moon.illumination_pct}% illuminated
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * One time chip in the sun ribbon. Accent variant (sunrise/sunset) uses
 * the gold ring/text for emphasis — those are the events users are most
 * likely to set their watch by. Legal-light bookends use the muted ring
 * since they're a derived ±30 min of the bookended event.
 */
function SunChip({
  label,
  time,
  accent,
}: {
  label: string;
  time: string;
  accent: boolean;
}) {
  return (
    <View
      style={[
        styles.sunChip,
        { borderColor: accent ? Colors.mdGold : Colors.mud },
      ]}
    >
      <Text
        style={[
          styles.sunChipLabel,
          { color: accent ? Colors.mdGold : Colors.textMuted },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.sunChipTime,
          { color: accent ? Colors.textPrimary : Colors.textSecondary },
        ]}
      >
        {formatTime12(time)}
      </Text>
    </View>
  );
}

/**
 * View-only moon disc. Two absolutely-positioned semicircle halves
 * overlay a dark base disc; each half's opacity is set from the
 * synodic-phase brightness. No SVG, no emoji.
 */
function MoonDisc({
  leftBrightness,
  rightBrightness,
}: {
  leftBrightness: number;
  rightBrightness: number;
}) {
  return (
    <View style={moonStyles.disc} accessibilityElementsHidden>
      {/* Left half — circular left side via border-radius corners */}
      <View
        style={[
          moonStyles.half,
          {
            left: 0,
            opacity: leftBrightness,
            borderTopLeftRadius: MOON_SIZE,
            borderBottomLeftRadius: MOON_SIZE,
          },
        ]}
      />
      {/* Right half */}
      <View
        style={[
          moonStyles.half,
          {
            right: 0,
            opacity: rightBrightness,
            borderTopRightRadius: MOON_SIZE,
            borderBottomRightRadius: MOON_SIZE,
          },
        ]}
      />
    </View>
  );
}

const MOON_SIZE = 44;

const moonStyles = StyleSheet.create({
  disc: {
    width: MOON_SIZE,
    height: MOON_SIZE,
    borderRadius: MOON_SIZE / 2,
    backgroundColor: Colors.mdBlack,
    borderWidth: 1,
    borderColor: Colors.mud,
    overflow: 'hidden',
    position: 'relative',
  },
  half: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: Colors.fawn,
  },
});

const styles = StyleSheet.create({
  section: { marginBottom: 18 },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  ribbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 6,
  },
  sunChip: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  sunChipLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
    textAlign: 'center',
  },
  sunChipTime: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  dayLengthRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  dayLengthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dayLengthLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dayLengthValue: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  moonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  moonText: {
    marginLeft: 14,
    flex: 1,
  },
  moonPhase: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  moonIllum: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
