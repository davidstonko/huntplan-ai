/**
 * @file BriefingTripsToLogCard.tsx
 * @description Phase A.46 — Daily Briefing card that nudges the user
 * to write up a trip whose end date fell in the last 7 days but
 * which has no matching journal entry yet.
 *
 * Closes the post-trip retention loop: A.43–A.45 covers the pre-trip
 * surfaces (PACK + briefing trip teaser); A.46 catches the user the
 * morning after the trip ends, before recall fades.
 *
 * Composition:
 *   - Section title row.
 *   - Card body: kind chip (CAMP/HIKE) + ended-ago headline (TODAY /
 *     YESTERDAY / N DAYS AGO).
 *   - Trip name + meta line.
 *   - "LOG TRIP" CTA pill — taps directly into JournalEdit pre-seeded
 *     by A.27's seedFromCampTrip / seedFromHikeTrip helpers.
 *
 * Renders null when no trip qualifies (no recently-ended trips, all
 * already logged). Mirrors the A.39 / A.44 card-renders-null pattern.
 *
 * @module Components
 * @version 2.3.0
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import type { RecentlyEndedTripRow } from '../services/recentlyEndedTripsService';
import { endedAgoLabel } from '../services/recentlyEndedTripsService';
import {
  seedFromCampTrip,
  seedFromHikeTrip,
} from '../services/journalSeedService';
import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';

interface BriefingTripsToLogCardProps {
  /**
   * The picked recently-ended trip, or `null` when no trip qualifies.
   * Card returns `null` on null so the parent doesn't have to gate
   * the JSX.
   */
  trip: RecentlyEndedTripRow | null;
}

export default function BriefingTripsToLogCard({
  trip,
}: BriefingTripsToLogCardProps): JSX.Element | null {
  const navigation = useNavigation<any>();
  if (!trip) return null;

  // The accent color leans amber on day-of / yesterday (warm
  // immediate-action), tan further out (still active but cooling).
  // Avoids the gold/moss tones used for trip COUNTDOWNs so the user
  // can distinguish "trip ahead" from "trip behind" at a glance.
  const accent = trip.daysSinceEnd <= 1 ? Colors.amber : Colors.tan;
  const ago = endedAgoLabel(trip.daysSinceEnd).toUpperCase();

  const onLog = () => {
    if (trip.kind === 'camp') {
      const seed = seedFromCampTrip(trip.raw as CampTrip);
      navigation.navigate('JournalEdit', { mode: 'camp', seed });
    } else {
      const seed = seedFromHikeTrip(trip.raw as HikeTrip);
      navigation.navigate('JournalEdit', { mode: 'hike', seed });
    }
  };

  const a11y = `Log trip — ${trip.name}, ended ${endedAgoLabel(trip.daysSinceEnd)}. Tap to write entry.`;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>TRIP TO LOG</Text>
      <TouchableOpacity
        style={[styles.card, { borderColor: accent }]}
        activeOpacity={0.7}
        onPress={onLog}
        accessibilityRole="button"
        accessibilityLabel={a11y}
      >
        <View style={styles.headerRow}>
          <View style={[styles.kindChip, { borderColor: accent }]}>
            <Text style={[styles.kindChipText, { color: accent }]}>
              {trip.kind === 'camp' ? 'CAMP' : 'HIKE'}
            </Text>
          </View>
          <Text style={[styles.endedAgo, { color: accent }]}>
            ENDED {ago}
          </Text>
        </View>
        <Text style={styles.tripName} numberOfLines={1}>
          {trip.name}
        </Text>
        <Text style={styles.tripMeta} numberOfLines={1}>
          {trip.startDate} → {trip.endDate} · {trip.meta}
        </Text>
        <View style={[styles.ctaPill, { borderColor: accent }]}>
          <Text style={[styles.ctaPillText, { color: accent }]}>
            LOG TRIP
          </Text>
        </View>
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
  endedAgo: {
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
  ctaPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  ctaPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
