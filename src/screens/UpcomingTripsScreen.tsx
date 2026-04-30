/**
 * @file UpcomingTripsScreen.tsx
 * @description Phase A.41 — single chronological list of every saved
 * trip across the Camp + Hike planners. Surfaces "what's next" so the
 * user can tap directly into the planner that owns the trip without
 * having to open each planner tab and remember what they had saved.
 *
 * Phase A.43 — added a per-row PACK button that either opens the
 * trip's linked GearChecklist (when `gearChecklistId` resolves) or
 * eager-creates a fresh checklist + writes the link back to the
 * parent trip + opens the editor. When linked, the button label
 * swaps to a "checked/total" progress chip so the user can see at a
 * glance how packed they are without opening the editor.
 *
 * Data flow:
 *   - Loads `camp_trips_v1` + `hike_trips_v1` from AsyncStorage on
 *     mount + on every screen focus (so a fresh save in either
 *     planner is reflected without remounting).
 *   - Aggregator (`listUpcomingTrips`) computes daysUntil + sorts
 *     chronologically across both types.
 *   - "Show past trips" toggle re-renders with includePast=true.
 *
 * Tap (card) → cross-tab navigate to the planner that owns the trip.
 * Tap (PACK button) → open or create the linked GearChecklist editor.
 *
 * @module Screens
 * @version 2.3.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';
import {
  listUpcomingTrips,
  relativeDayLabel,
  tripChecklistDate,
  tripChecklistMode,
  tripChecklistName,
  type UpcomingTripRow,
} from '../services/upcomingTripsService';
import { persistTripChecklistLink } from '../services/tripChecklistLinkStorage';
import { useGearChecklists } from '../context/GearChecklistContext';
import { countItems } from '../types/gearChecklist';

export default function UpcomingTripsScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const { addChecklist, getChecklist } = useGearChecklists();
  const [campTrips, setCampTrips] = useState<CampTrip[]>([]);
  const [hikeTrips, setHikeTrips] = useState<HikeTrip[]>([]);
  const [includePast, setIncludePast] = useState(false);

  // Load trips on mount + on every focus so a save in either planner
  // is reflected when the user navigates back here.
  useEffect(() => {
    let cancelled = false;
    const reload = async () => {
      try {
        const [campRaw, hikeRaw] = await Promise.all([
          AsyncStorage.getItem('camp_trips_v1'),
          AsyncStorage.getItem('hike_trips_v1'),
        ]);
        if (cancelled) return;
        setCampTrips(campRaw ? (JSON.parse(campRaw) as CampTrip[]) : []);
        setHikeTrips(hikeRaw ? (JSON.parse(hikeRaw) as HikeTrip[]) : []);
      } catch {
        // empty arrays is the safe default for any read error
      }
    };
    void reload();
    const unsub = navigation.addListener('focus', () => {
      void reload();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [navigation]);

  const rows = useMemo(
    () => listUpcomingTrips({ campTrips, hikeTrips }, new Date(), { includePast }),
    [campTrips, hikeTrips, includePast],
  );

  const upcomingCount = useMemo(
    () => listUpcomingTrips({ campTrips, hikeTrips }, new Date()).length,
    [campTrips, hikeTrips],
  );

  /**
   * Cross-tab navigation back to the planner that owns this trip.
   * Uses the nested `screen` + `params` shape so the right tab's
   * inner stack receives the planner-main route.
   *
   * The planner UI doesn't currently auto-scroll to a specific trip
   * row — but the saved-trips block is auto-expandable from a fresh
   * save and the row count is short enough that a scan is cheap.
   * Future: add a `focusTripId` route param to the planners that
   * scrolls + highlights the row.
   */
  const onTrip = useCallback(
    (row: UpcomingTripRow) => {
      if (row.kind === 'camp') {
        navigation.navigate('CampTripPlannerTab', {
          screen: 'CampTripPlannerMain',
        });
      } else {
        navigation.navigate('HikeTripPlannerTab', {
          screen: 'HikeTripPlannerMain',
        });
      }
    },
    [navigation],
  );

  /**
   * PACK handler — open (or eager-create + link) the GearChecklist for
   * this trip. Three branches:
   *   1) trip already has a checklistId AND the checklist is still
   *      present in storage → open the editor on it.
   *   2) trip has a checklistId but the checklist was deleted (stale
   *      ref) → create a fresh checklist, re-link the trip, open editor.
   *   3) trip has no checklistId → create a fresh checklist, link the
   *      trip, open editor.
   *
   * The eager-create-and-link pattern (mirrors A.6's eager-create draft)
   * means the user lands directly on the editor with a real id rather
   * than seeing a "create" intermediate step. Cancel from the editor
   * leaves an empty linked checklist, which is a fine default.
   */
  const onPack = useCallback(
    async (row: UpcomingTripRow) => {
      const existingId = row.raw.gearChecklistId ?? null;
      const existingChecklist = existingId ? getChecklist(existingId) : null;

      if (existingChecklist) {
        navigation.navigate('GearChecklistEdit', {
          mode: existingChecklist.mode,
          checklistId: existingChecklist.id,
        });
        return;
      }

      try {
        const created = await addChecklist({
          mode: tripChecklistMode(row),
          name: tripChecklistName(row),
          tripDate: tripChecklistDate(row),
        });
        const patched = await persistTripChecklistLink(
          row.kind,
          row.id,
          created.id,
        );
        // Reflect the new link locally so the next render shows progress.
        if (patched) {
          if (row.kind === 'camp') {
            setCampTrips((prev) =>
              prev.map((t) => (t.id === row.id ? (patched as CampTrip) : t)),
            );
          } else {
            setHikeTrips((prev) =>
              prev.map((t) => (t.id === row.id ? (patched as HikeTrip) : t)),
            );
          }
        }
        navigation.navigate('GearChecklistEdit', {
          mode: created.mode,
          checklistId: created.id,
        });
      } catch (e) {
        Alert.alert(
          'Pack list',
          "Couldn't create a pack list for this trip. Please try again.",
        );
      }
    },
    [addChecklist, getChecklist, navigation],
  );

  /**
   * Pack-progress projection for a row — returns null when the trip
   * has no linked checklist (or the link is stale), or {checked,total}
   * when it does. Used to swap the PACK button label between
   * "PACK" (start fresh) and "12/24" (resume packing).
   */
  const packProgressFor = (row: UpcomingTripRow):
    | { checked: number; total: number }
    | null => {
    const id = row.raw.gearChecklistId ?? null;
    if (!id) return null;
    const list = getChecklist(id);
    if (!list) return null;
    return countItems(list.items);
  };

  const dayBadgeColor = (daysUntil: number): string => {
    if (daysUntil < 0) return Colors.textMuted;
    if (daysUntil === 0) return Colors.amber; // today — act now
    if (daysUntil <= 7) return Colors.mdGold; // this week
    return Colors.textSecondary;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Upcoming Trips</Text>
      <Text style={styles.subheading}>
        Every saved trip across your Camp and Hike planners, in
        chronological order.
      </Text>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {upcomingCount} upcoming
        </Text>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setIncludePast(!includePast)}
          accessibilityLabel={
            includePast ? 'Hide past trips' : 'Show past trips'
          }
        >
          <Text style={styles.toggleBtnText}>
            {includePast ? 'HIDE PAST' : 'SHOW PAST'}
          </Text>
        </TouchableOpacity>
      </View>

      {rows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No trips planned yet.</Text>
          <Text style={styles.emptyBody}>
            Open the Camp or Hike Trip Planner tab to save your first
            trip — it'll show up here so you always know what's next.
          </Text>
        </View>
      ) : (
        rows.map((row) => {
          const progress = packProgressFor(row);
          const packLabel = progress
            ? `${progress.checked}/${progress.total}`
            : 'PACK';
          const packA11y = progress
            ? `Open pack list — ${progress.checked} of ${progress.total} packed`
            : `Create pack list for ${row.name}`;
          return (
            <TouchableOpacity
              key={`${row.kind}-${row.id}`}
              style={styles.tripCard}
              onPress={() => onTrip(row)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Open ${row.kind} planner for ${row.name}`}
            >
              <View style={styles.tripHeader}>
                <View style={styles.kindChip}>
                  <Text style={styles.kindChipText}>
                    {row.kind === 'camp' ? 'CAMP' : 'HIKE'}
                  </Text>
                </View>
                <Text style={styles.tripDate}>{row.startDate}</Text>
                <Text
                  style={[
                    styles.tripDay,
                    { color: dayBadgeColor(row.daysUntil) },
                  ]}
                >
                  {relativeDayLabel(row.daysUntil).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.tripName} numberOfLines={1}>
                {row.name}
              </Text>
              <View style={styles.tripFooter}>
                <Text style={styles.tripMeta} numberOfLines={1}>
                  {row.meta}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.packBtn,
                    progress && styles.packBtnLinked,
                  ]}
                  onPress={() => {
                    void onPack(row);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={packA11y}
                >
                  <Text
                    style={[
                      styles.packBtnText,
                      progress && styles.packBtnTextLinked,
                    ]}
                  >
                    {packLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 16,
    lineHeight: 17,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: Colors.mud,
    borderWidth: 1,
    borderColor: Colors.tan,
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.tan,
    letterSpacing: 0.8,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyBody: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  tripCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  kindChip: {
    backgroundColor: Colors.mud,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  kindChipText: {
    color: Colors.tan,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tripDate: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  tripDay: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    flex: 1,
    marginRight: 8,
  },
  tripFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  packBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: Colors.mud,
    borderWidth: 1,
    borderColor: Colors.mdGold,
    minWidth: 56,
    alignItems: 'center',
  },
  packBtnLinked: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.moss,
  },
  packBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.mdGold,
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
  },
  packBtnTextLinked: {
    color: Colors.moss,
  },
});
