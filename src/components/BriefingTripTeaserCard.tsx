/**
 * @file BriefingTripTeaserCard.tsx
 * @description Daily Briefing "Trip on Deck" card — Phase A.44 + A.45.
 *
 * Surfaces the single Camp/Hike trip most worth thinking about today
 * (the soonest within a 14-day horizon).
 *
 * Phase A.45 — when the trip is linked to a real GearChecklist, the
 * card surfaces pack progress ("12/24 PACKED") inline AND swaps the
 * tap-target from "open the upcoming-trips list" to "open the linked
 * checklist directly". Two clear CTAs depending on state:
 *  - linked + packStatus: tap → checklist editor (resume packing)
 *  - unlinked / stale: tap → UpcomingTripsScreen (start packing from
 *    the PACK button there)
 *
 * Renders null when no trip qualifies (no upcoming trips, all past,
 * all beyond the horizon). Mirrors the A.39 card-renders-null pattern
 * so the briefing collapses cleanly without an empty stub.
 *
 * Composition:
 *   - Section title row.
 *   - Card body: kind chip (CAMP/HIKE) + countdown headline (TODAY /
 *     TOMORROW / IN N DAYS) on the same row, color-tiered the same
 *     way as A.41/A.42 (amber today, gold this-week, secondary
 *     further-out).
 *   - Trip name + meta line.
 *   - Pack-progress row (A.45) — "12/24 PACKED" or "START PACKING"
 *     as a single horizontal pill above the "+N more" sub-line.
 *   - "+N more upcoming" sub-line so the user knows there's more
 *     queued up beyond what's shown.
 *
 * @module Components
 * @version 2.3.0
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import type { BriefingTripTeaser } from '../services/briefingTripTeaserService';
import { relativeDayLabel } from '../services/upcomingTripsService';

interface BriefingTripTeaserCardProps {
  /**
   * The picked teaser, or `null` when no trip qualifies. The card
   * returns `null` on null so the parent doesn't have to gate the JSX.
   */
  teaser: BriefingTripTeaser | null;
}

/**
 * Day-badge color tier — same ramp as A.41 (UpcomingTripsScreen) and
 * A.42 (TripCountdownCard) so the visual language is consistent.
 *  - daysUntil === 0 → amber (act now)
 *  - daysUntil ≤ 7   → mdGold (warm — this week)
 *  - daysUntil > 7   → textSecondary (cool — further out)
 *
 * The teaser's horizon is 14 days so the past-tier branch from A.41
 * never reaches here.
 */
function dayBadgeColor(daysUntil: number): string {
  if (daysUntil === 0) return Colors.amber;
  if (daysUntil <= 7) return Colors.mdGold;
  return Colors.textSecondary;
}

export default function BriefingTripTeaserCard({
  teaser,
}: BriefingTripTeaserCardProps): JSX.Element | null {
  const navigation = useNavigation<any>();
  if (!teaser) return null;

  const { row, totalUpcoming, packStatus } = teaser;
  const accent = dayBadgeColor(row.daysUntil);
  const countdown = relativeDayLabel(row.daysUntil).toUpperCase();
  const moreCount = totalUpcoming - 1;

  // A.45 — when a checklist is linked, deep-link straight to the
  // editor; otherwise route to UpcomingTrips so the user can hit PACK
  // there. Two states, one decision at the boundary, one tap.
  const onTap = () => {
    if (packStatus) {
      navigation.navigate('GearChecklistEdit', {
        mode: row.kind,
        checklistId: packStatus.checklistId,
      });
    } else {
      navigation.navigate('UpcomingTrips');
    }
  };

  // Pack-row label — fully packed reads as "READY", in-progress as
  // "12/24 PACKED", linked-but-empty as "0/0 PACKED" (rare but
  // possible if the user removed all seeded items), and unlinked as
  // "START PACKING".
  let packLabel: string;
  let packAccent: string;
  if (!packStatus) {
    packLabel = 'START PACKING';
    packAccent = Colors.mdGold;
  } else if (packStatus.total === 0) {
    packLabel = '0/0 PACKED';
    packAccent = Colors.textSecondary;
  } else if (packStatus.checked >= packStatus.total) {
    packLabel = `READY · ${packStatus.checked}/${packStatus.total}`;
    packAccent = Colors.moss;
  } else {
    packLabel = `${packStatus.checked}/${packStatus.total} PACKED`;
    packAccent = Colors.mdGold;
  }

  const a11y = packStatus
    ? `Trip on deck — ${row.name}, ${relativeDayLabel(row.daysUntil)}, ${packLabel}. Tap to open checklist.`
    : `Trip on deck — ${row.name}, ${relativeDayLabel(row.daysUntil)}. Tap to start packing.`;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>TRIP ON DECK</Text>
      <TouchableOpacity
        style={[styles.card, { borderColor: accent }]}
        activeOpacity={0.7}
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={a11y}
      >
        <View style={styles.headerRow}>
          <View style={[styles.kindChip, { borderColor: accent }]}>
            <Text style={[styles.kindChipText, { color: accent }]}>
              {row.kind === 'camp' ? 'CAMP' : 'HIKE'}
            </Text>
          </View>
          <Text style={[styles.countdown, { color: accent }]}>{countdown}</Text>
        </View>
        <Text style={styles.tripName} numberOfLines={1}>
          {row.name}
        </Text>
        <Text style={styles.tripMeta} numberOfLines={1}>
          {row.startDate} · {row.meta}
        </Text>
        <View style={[styles.packRow, { borderColor: packAccent }]}>
          <Text style={[styles.packLabel, { color: packAccent }]}>
            {packLabel}
          </Text>
        </View>
        {moreCount > 0 ? (
          <Text style={styles.moreLine}>
            +{moreCount} more upcoming
          </Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 18 },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  kindChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  kindChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  countdown: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    flex: 1,
    textAlign: 'right',
  },
  tripName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  tripMeta: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  packRow: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  packLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
  },
  moreLine: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 6,
  },
});
