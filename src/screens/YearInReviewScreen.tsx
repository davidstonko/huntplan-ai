/**
 * YearInReviewScreen — "Spotify Wrapped" for the user's outdoor year.
 *
 * V2_3 Phase A.23 (retention surface).
 *
 * Reads ALL 5 personal-layer contexts (cross-mode by design — the year is
 * the user's whole outdoor calendar, not one mode), runs the pure
 * `computeYearInReview` aggregator, and renders:
 *   - Year-picker chip row at top (descending, current year first)
 *   - Hero card: days active + total artifacts + active months
 *   - Headline number row: distance / elevation / hours
 *   - Top mode + top tag pills
 *   - Per-layer count grid
 *   - Per-mode breakdown rows
 *   - Streak + biggest day cards
 *   - First / last activity footer
 *
 * No network, no I/O. The screen is pure-routing-of-data.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { useUserMarkups } from '../context/UserMarkupContext';
import { useJournalEntries } from '../context/JournalEntryContext';
import { useGearChecklists } from '../context/GearChecklistContext';
import {
  computeYearInReview,
  computeYearInReviewTrips,
  availableYearsWithActivity,
  YearInReview,
} from '../services/yearInReviewService';
import {
  formatStatDistance,
  formatElevationFt,
  formatStatDuration,
  modeCode,
  modeLabel,
} from '../services/personalStatsService';
import type { WaypointMode } from '../types/userWaypoint';
import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatYmdLabel(ymd: string | null): string {
  if (!ymd) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const month = MONTH_LABELS[parseInt(m[2], 10) - 1] ?? '';
  const day = parseInt(m[3], 10);
  return `${month} ${day}`;
}

function HeroNumber({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.heroBlock}>
      <Text style={styles.heroNum}>{value}</Text>
      <Text style={styles.heroLab}>{label}</Text>
    </View>
  );
}

function StatTile({
  code,
  label,
  value,
}: {
  code: string;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileChip}>
        <Text style={styles.tileChipText}>{code}</Text>
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

export default function YearInReviewScreen() {
  const { allWaypoints } = useUserWaypoints();
  const { allTracks } = useTrackRecorder();
  const { allMarkups } = useUserMarkups();
  const { allEntries } = useJournalEntries();
  const { allChecklists } = useGearChecklists();

  const inputs = useMemo(
    () => ({
      waypoints: allWaypoints,
      tracks: allTracks,
      markups: allMarkups,
      journalEntries: allEntries,
      checklists: allChecklists,
    }),
    [allWaypoints, allTracks, allMarkups, allEntries, allChecklists],
  );

  const years = useMemo(
    () => availableYearsWithActivity(inputs, new Date()),
    [inputs],
  );

  const [selectedYear, setSelectedYear] = useState<number>(
    () => years[0] ?? new Date().getFullYear(),
  );

  const review: YearInReview = useMemo(
    () => computeYearInReview(selectedYear, inputs),
    [selectedYear, inputs],
  );

  // Phase A.51 — load Camp + Hike trips for the TRIPS sub-section.
  // Same direct-AsyncStorage-on-mount pattern as PersonalStats (A.47)
  // / DailyBriefing (A.44) since the trip contexts aren't hoisted.
  const [campTrips, setCampTrips] = useState<CampTrip[]>([]);
  const [hikeTrips, setHikeTrips] = useState<HikeTrip[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [campRaw, hikeRaw] = await Promise.all([
          AsyncStorage.getItem('camp_trips_v1'),
          AsyncStorage.getItem('hike_trips_v1'),
        ]);
        if (cancelled) return;
        setCampTrips(campRaw ? (JSON.parse(campRaw) as CampTrip[]) : []);
        setHikeTrips(hikeRaw ? (JSON.parse(hikeRaw) as HikeTrip[]) : []);
      } catch {
        // empty arrays on any read error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const yearTrips = useMemo(
    () =>
      computeYearInReviewTrips(selectedYear, { campTrips, hikeTrips }),
    [selectedYear, campTrips, hikeTrips],
  );

  const totalArtifacts =
    review.totals.waypoints +
    review.totals.tracks +
    review.totals.markups +
    review.totals.journals +
    review.totals.checklists;

  const isEmpty = totalArtifacts === 0;

  const monthChips = MONTH_LABELS.map((label, i) => ({
    label,
    active: review.monthsActive.includes(i),
  }));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      {/* Year picker */}
      <Text style={styles.yearLabel}>YEAR</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.yearRow}
      >
        {years.map((y) => {
          const active = y === selectedYear;
          return (
            <TouchableOpacity
              key={y}
              onPress={() => setSelectedYear(y)}
              style={[styles.yearChip, active && styles.yearChipActive]}
            >
              <Text
                style={[
                  styles.yearChipText,
                  active && styles.yearChipTextActive,
                ]}
              >
                {y}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Hero */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Your {selectedYear}</Text>
        {isEmpty ? (
          <Text style={styles.heroEmpty}>
            No activity yet for {selectedYear}. Log a journal, drop a
            waypoint, or record a track to fill this out.
          </Text>
        ) : (
          <View style={styles.heroRow}>
            <HeroNumber value={review.totals.daysActive} label="days afield" />
            <HeroNumber value={totalArtifacts} label="things logged" />
            <HeroNumber
              value={review.monthsActive.length}
              label="months active"
            />
          </View>
        )}
      </View>

      {/* Months strip */}
      {!isEmpty && (
        <View style={styles.monthsStrip}>
          {monthChips.map((m) => (
            <View
              key={m.label}
              style={[styles.monthDot, m.active && styles.monthDotActive]}
            >
              <Text
                style={[
                  styles.monthDotText,
                  m.active && styles.monthDotTextActive,
                ]}
              >
                {m.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Headline numbers */}
      {!isEmpty && (
        <View style={styles.tileGrid}>
          <StatTile
            code="MI"
            label="distance"
            value={formatStatDistance(review.totals.distanceM)}
          />
          <StatTile
            code="EL"
            label="elevation"
            value={formatElevationFt(review.totals.elevationGainM)}
          />
          <StatTile
            code="HR"
            label="moving time"
            value={formatStatDuration(review.totals.durationSec)}
          />
        </View>
      )}

      {/* Top mode + top tag */}
      {!isEmpty && (
        <View style={styles.row2}>
          <View style={styles.pillCard}>
            <Text style={styles.pillLabel}>TOP MODE</Text>
            <Text style={styles.pillValue}>
              {review.topMode ? modeLabel(review.topMode) : '—'}
            </Text>
            <Text style={styles.pillSub}>
              {review.topMode
                ? `${review.byMode.find((b) => b.mode === review.topMode)?.count ?? 0} artifacts`
                : 'no activity'}
            </Text>
          </View>
          <View style={styles.pillCard}>
            <Text style={styles.pillLabel}>TOP TAG</Text>
            <Text style={styles.pillValue}>{review.topTag?.tag ?? '—'}</Text>
            <Text style={styles.pillSub}>
              {review.topTag
                ? `${review.topTag.count} entr${review.topTag.count === 1 ? 'y' : 'ies'}`
                : 'no journal tags'}
            </Text>
          </View>
        </View>
      )}

      {/* Per-layer counts */}
      {!isEmpty && (
        <>
          <Text style={styles.sectionLabel}>BY LAYER</Text>
          <View style={styles.tileGrid}>
            <StatTile code="WP" label="waypoints" value={review.totals.waypoints} />
            <StatTile code="TR" label="tracks" value={review.totals.tracks} />
            <StatTile code="MK" label="markups" value={review.totals.markups} />
          </View>
          <View style={styles.tileGrid}>
            <StatTile code="JR" label="journals" value={review.totals.journals} />
            <StatTile code="GC" label="checklists" value={review.totals.checklists} />
            <StatTile code="PH" label="photos" value={review.totals.photos} />
          </View>
        </>
      )}

      {/* Per-mode breakdown */}
      {!isEmpty && (
        <>
          <Text style={styles.sectionLabel}>BY MODE</Text>
          {review.byMode.map((b) => (
            <ModeBreakdownRow key={b.mode} mode={b.mode} count={b.count} days={b.daysActive} />
          ))}
        </>
      )}

      {/* Phase A.51 — Trips section. Renders independently of `isEmpty`
          because trips live outside the personal-layer artifact set:
          a user might plan trips for the year without yet recording
          any tracks/waypoints. Hidden when there are no trips for the
          year either. */}
      {yearTrips.total > 0 && (
        <>
          <Text style={styles.sectionLabel}>TRIPS</Text>
          <View style={styles.tripsCard}>
            <View style={styles.tripsRow}>
              <View style={styles.tripsCol}>
                <Text style={styles.tripsValue}>{yearTrips.total}</Text>
                <Text style={styles.tripsLabel}>
                  total · {yearTrips.camp} camp · {yearTrips.hike} hike
                </Text>
              </View>
            </View>
            {yearTrips.busiestMonth ? (
              <View style={styles.tripsFooter}>
                <Text style={styles.tripsFooterLabel}>busiest month</Text>
                <Text style={styles.tripsFooterValue}>
                  {yearTrips.busiestMonth}
                </Text>
              </View>
            ) : null}
            {yearTrips.longestGapDaysInYear !== null ? (
              <View style={styles.tripsFooter}>
                <Text style={styles.tripsFooterLabel}>longest gap</Text>
                <Text style={styles.tripsFooterValue}>
                  {yearTrips.longestGapDaysInYear} day
                  {yearTrips.longestGapDaysInYear === 1 ? '' : 's'}
                </Text>
              </View>
            ) : null}
          </View>
        </>
      )}

      {/* Streak + biggest day */}
      {!isEmpty && (
        <View style={styles.row2}>
          <View style={styles.pillCard}>
            <Text style={styles.pillLabel}>LONGEST STREAK</Text>
            <Text style={styles.pillValue}>
              {review.longestStreakInYear}
              <Text style={styles.pillUnit}>{' days'}</Text>
            </Text>
            <Text style={styles.pillSub}>
              consecutive in {selectedYear}
            </Text>
          </View>
          <View style={styles.pillCard}>
            <Text style={styles.pillLabel}>BIGGEST DAY</Text>
            <Text style={styles.pillValue}>
              {review.biggestDay
                ? `${review.biggestDay.count}`
                : '—'}
              <Text style={styles.pillUnit}>{' logged'}</Text>
            </Text>
            <Text style={styles.pillSub}>
              {review.biggestDay
                ? formatYmdLabel(review.biggestDay.date)
                : 'no activity'}
            </Text>
          </View>
        </View>
      )}

      {/* Footer */}
      {!isEmpty && (
        <Text style={styles.footer}>
          From {formatYmdLabel(review.firstActivityDate)} to{' '}
          {formatYmdLabel(review.lastActivityDate)} · {selectedYear}
        </Text>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function ModeBreakdownRow({
  mode,
  count,
  days,
}: {
  mode: WaypointMode;
  count: number;
  days: number;
}) {
  const empty = count === 0;
  return (
    <View style={[styles.modeRow, empty && styles.modeRowEmpty]}>
      <View style={[styles.modeChip, empty && styles.modeChipEmpty]}>
        <Text
          style={[styles.modeChipText, empty && styles.modeChipTextEmpty]}
        >
          {modeCode(mode)}
        </Text>
      </View>
      <Text style={[styles.modeLabel, empty && styles.modeLabelEmpty]}>
        {modeLabel(mode)}
      </Text>
      <View style={styles.modeMeta}>
        <Text style={styles.modeCount}>{count}</Text>
        <Text style={styles.modeDays}>
          {days} day{days === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  yearLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.0,
    marginBottom: 6,
  },
  yearRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 6,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  yearChipActive: {
    backgroundColor: Colors.mdGold,
    borderColor: Colors.mdGold,
  },
  yearChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  yearChipTextActive: {
    color: Colors.background,
  },
  heroCard: {
    marginTop: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroBlock: {
    flex: 1,
    alignItems: 'center',
  },
  heroNum: {
    color: Colors.mdGold,
    fontSize: 28,
    fontWeight: '900',
  },
  heroLab: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  heroEmpty: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  monthsStrip: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  monthDot: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    minWidth: 36,
    alignItems: 'center',
  },
  monthDotActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  monthDotText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  monthDotTextActive: {
    color: Colors.background,
  },
  tileGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tileChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.oak,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileChipText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  tileValue: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  tileLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  row2: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  pillCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  pillLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.0,
    marginBottom: 6,
  },
  pillValue: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  pillUnit: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  tripsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  tripsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  tripsCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  tripsValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tripsLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  tripsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  tripsFooterLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tripsFooterValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.0,
    marginTop: 18,
    marginBottom: 6,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  modeRowEmpty: {
    opacity: 0.55,
  },
  modeChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.moss,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modeChipEmpty: {
    borderColor: Colors.mud,
  },
  modeChipText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modeChipTextEmpty: {
    color: Colors.textMuted,
  },
  modeLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  modeLabelEmpty: {
    color: Colors.textMuted,
  },
  modeMeta: {
    alignItems: 'flex-end',
  },
  modeCount: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  modeDays: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  footer: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 16,
    textAlign: 'center',
  },
});
