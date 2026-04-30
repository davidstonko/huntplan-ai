/**
 * DailyBriefingScreen — single-tap "what's worth opening the app for
 * today?" dashboard.
 *
 * Layout (top → bottom):
 *   1. Greeting header — weekday + full date.
 *   2. Streak strip — current + longest active-day streak.
 *   3. Logged-today panel — journal entries written for today.
 *   4. Upcoming trips — gear checklists w/ tripDate ≥ today.
 *   5. On This Day teaser — first prior-year memory + "see all" link.
 *   6. Pick-up-where-you-left-off — most-recent activity card.
 *   7. Totals strip — at-a-glance counts.
 *
 * All deep-links re-use existing routes already registered in
 * PersonalLayerScreens(). No new screens needed for the actions.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.17.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';
import { pickBriefingTripTeaser } from '../services/briefingTripTeaserService';
import BriefingTripTeaserCard from '../components/BriefingTripTeaserCard';
import { pickRecentlyEndedTrip } from '../services/recentlyEndedTripsService';
import BriefingTripsToLogCard from '../components/BriefingTripsToLogCard';
import { pickBriefingTripDrought } from '../services/briefingTripDroughtService';
import BriefingTripDroughtCard from '../components/BriefingTripDroughtCard';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { useUserMarkups } from '../context/UserMarkupContext';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { useJournalEntries } from '../context/JournalEntryContext';
import { useGearChecklists } from '../context/GearChecklistContext';
import {
  buildDailyBriefing,
  streakAtRisk,
} from '../services/dailyBriefingService';
import type { UpcomingTripItem } from '../services/dailyBriefingService';
import { emptySeed } from '../services/journalSeedService';
import { JOURNAL_OUTCOME_META } from '../types/journalEntry';
import type { JournalEntry } from '../types/journalEntry';
import type { WaypointMode } from '../types/userWaypoint';
import SunMoonCard from '../components/SunMoonCard';
import BriefingWeatherCard from '../components/BriefingWeatherCard';
import BriefingTideCard from '../components/BriefingTideCard';
import BriefingActivityRatingCard from '../components/BriefingActivityRatingCard';
import BriefingTomorrowCard from '../components/BriefingTomorrowCard';
import BriefingBestDayCard from '../components/BriefingBestDayCard';
import BriefingGoalSpotlightCard from '../components/BriefingGoalSpotlightCard';
import { loadGoals } from '../services/goalsStorage';
import type { Goal } from '../types/goal';
import { pickBriefingGoalSpotlight } from '../services/briefingGoalSpotlightService';
import { pickBriefingLocation } from '../services/briefingLocationService';
import {
  tierFromStreak,
  shouldShowBadge,
  type StreakTierAccent,
} from '../services/streakTierService';
import { pickOnThisDayPhoto } from '../services/briefingOnThisDayPhotoService';

function modeLabel(m: WaypointMode): string {
  switch (m) {
    case 'hunt':
      return 'HUNT';
    case 'fish':
      return 'FISH';
    case 'camp':
      return 'CAMP';
    case 'hike':
      return 'HIKE';
    default:
      return 'MODE';
  }
}

function daysAwayLabel(n: number): string {
  if (n === 0) return 'TODAY';
  if (n === 1) return 'TOMORROW';
  return `IN ${n} DAYS`;
}

export default function DailyBriefingScreen() {
  const navigation = useNavigation<any>();
  const { allWaypoints } = useUserWaypoints();
  const { allMarkups } = useUserMarkups();
  const { allTracks } = useTrackRecorder();
  const { allEntries } = useJournalEntries();
  const { allChecklists } = useGearChecklists();

  const briefing = useMemo(
    () =>
      buildDailyBriefing(new Date(), {
        waypoints: allWaypoints,
        tracks: allTracks,
        markups: allMarkups,
        journalEntries: allEntries,
        checklists: allChecklists,
      }),
    [allWaypoints, allTracks, allMarkups, allEntries, allChecklists],
  );

  const { today, memories, loggedToday, upcomingTrips, recent, streak, totals } =
    briefing;

  // Phase A.31 — pick the lat/lng the Sun & Moon panel should render
  // against. Reuses the user's most recent recorded-track endpoint when
  // it's within the recency window (last 30 days); otherwise falls back
  // to the Maryland centroid that A.29 originally hardcoded. Pure
  // function, runs on every render but is cheap.
  const briefingLocation = useMemo(
    () => pickBriefingLocation(allTracks),
    [allTracks],
  );

  // Streak insurance — surfaced when the user has an active streak and
  // hasn't logged anything today across the 5 personal layers.
  const showStreakInsurance = useMemo(
    () =>
      streakAtRisk(today.ymd, streak.current, {
        waypoints: allWaypoints,
        tracks: allTracks,
        markups: allMarkups,
        journalEntries: allEntries,
        checklists: allChecklists,
      }),
    [
      today.ymd,
      streak.current,
      allWaypoints,
      allTracks,
      allMarkups,
      allEntries,
      allChecklists,
    ],
  );

  // Pick the mode for the "log to keep streak" button. Prefer the user's
  // most-recently-logged journal entry's mode — that's the strongest
  // signal of "what they're currently in the middle of doing." Fall back
  // to 'hike' as the most-general default if they have no journal yet.
  const insuranceMode: WaypointMode = useMemo<WaypointMode>(() => {
    if (allEntries.length === 0) return 'hike';
    const sorted = [...allEntries].sort((a, b) =>
      a.updatedAt < b.updatedAt ? 1 : -1,
    );
    return sorted[0].mode;
  }, [allEntries]);
  const onLogTodayToKeepStreak = () =>
    navigation.navigate('JournalEdit', {
      mode: insuranceMode,
      seed: emptySeed(insuranceMode),
    });

  const onOpenJournalEntry = (e: JournalEntry) =>
    navigation.navigate('JournalEdit', { mode: e.mode, entryId: e.id });

  const onOpenChecklist = (it: UpcomingTripItem) =>
    navigation.navigate('GearChecklistEdit', {
      mode: it.mode,
      checklistId: it.id,
    });

  const onSeeAllMemories = () => navigation.navigate('OnThisDay');
  const onOpenRecent = () => {
    if (!recent) return;
    // Each kind has a known route + id param shape (see PersonalLayerScreens).
    // We intentionally skip wiring "open this exact item" here — the
    // recent-activity card is a recall hint, the user picks a layer
    // and goes from there.
    switch (recent.kind) {
      case 'waypoint':
        navigation.navigate('WaypointList', { mode: 'hunt' });
        return;
      case 'track':
        navigation.navigate('TrackList', { mode: 'hunt' });
        return;
      case 'markup':
        navigation.navigate('MarkupList', { mode: 'hunt' });
        return;
      case 'journal':
        navigation.navigate('JournalList', { mode: 'hunt' });
        return;
      case 'checklist':
        navigation.navigate('GearChecklistList', { mode: 'hunt' });
        return;
    }
  };

  const memoryTeaser = memories.buckets[0];

  // Phase A.37 — pick a hero photo from the On This Day buckets so the
  // teaser renders an image, not just a count. Walks newest-year-first
  // and returns the first usable photo URI on a waypoint or journal.
  // Returns null when no memory carries a photo, in which case the
  // section falls back to the original text-only card.
  const memoryPhoto = useMemo(() => pickOnThisDayPhoto(memories), [memories]);

  // Phase A.39 — load annual goals once on mount and pick the single
  // most-actionable one (behind-pace > on-pace > ahead, current-year
  // only, non-complete). Goals don't have a context, so load lives
  // here. Render-gated to null when no goal qualifies, so the card
  // hides itself rather than rendering an empty stub.
  const [goals, setGoals] = useState<Goal[]>([]);
  useEffect(() => {
    let cancelled = false;
    void loadGoals().then((rows) => {
      if (!cancelled) setGoals(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const goalSpotlight = useMemo(
    () =>
      pickBriefingGoalSpotlight(goals, {
        tracks: allTracks,
        journals: allEntries,
        waypoints: allWaypoints,
      }),
    [goals, allTracks, allEntries, allWaypoints],
  );

  // Phase A.44 — load Camp + Hike trips from AsyncStorage so we can
  // surface the soonest planner-saved trip in the briefing's "Trip on
  // Deck" card. CampTripContext + HikeTripContext don't hoist to a root
  // provider (they're scoped to the planner stacks) so a direct read +
  // re-load on focus is the simplest path. Mirrors the pattern used in
  // PersonalHubScreen and UpcomingTripsScreen.
  const [campTrips, setCampTrips] = useState<CampTrip[]>([]);
  const [hikeTrips, setHikeTrips] = useState<HikeTrip[]>([]);
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
        // empty arrays on any read error is the safe default
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

  const tripTeaser = useMemo(
    () =>
      pickBriefingTripTeaser(
        { campTrips, hikeTrips },
        new Date(),
        allChecklists,
      ),
    [campTrips, hikeTrips, allChecklists],
  );

  // Phase A.46 — opposite-direction surface from the trip teaser:
  // catch trips that ENDED in the last 7 days but don't have a
  // matching journal entry yet. Surfaces a single LOG nudge that
  // taps directly into JournalEdit pre-seeded by A.27's
  // seedFromCampTrip / seedFromHikeTrip helpers.
  const recentlyEnded = useMemo(
    () =>
      pickRecentlyEndedTrip({
        campTrips,
        hikeTrips,
        journalEntries: allEntries,
      }),
    [campTrips, hikeTrips, allEntries],
  );

  // Phase A.48 — long-gap nudge. Returns null unless the user has at
  // least one past trip AND the gap to today exceeds 30 days. The
  // card renders null on null so the briefing collapses cleanly
  // when there's no drought.
  const drought = useMemo(
    () => pickBriefingTripDrought({ campTrips, hikeTrips }),
    [campTrips, hikeTrips],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* ── 1. Greeting header ────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.weekday}>{today.weekdayLabel}</Text>
        <Text style={styles.date}>{today.dateLabel}</Text>
      </View>

      {/* ── 1b. Sun & Moon panel (Phase A.29 + A.31) ── */}
      {/* Sits above the streak strip because sunrise/sunset is the most
          time-sensitive morning information — a user opens the briefing
          to decide "should I leave the house in the next 30 minutes?".
          Phase A.31: lat/lng comes from the user's most recent recorded
          track when one is within 30 days, else the MD centroid. */}
      <SunMoonCard
        ymd={today.ymd}
        latitude={briefingLocation.latitude}
        longitude={briefingLocation.longitude}
      />

      {/* ── 1c. Today's activity rating (Phase A.34) ── */}
      {/* Sits between Sun & Moon and the conditional info pair —
          the rating is computed FROM the same local solunar data
          that drives the Sun & Moon panel above, so they read as a
          natural pair. Sync, no fetch. */}
      <BriefingActivityRatingCard
        ymd={today.ymd}
        latitude={briefingLocation.latitude}
        longitude={briefingLocation.longitude}
      />

      {/* ── 1d. Weather one-liner (Phase A.32) ────── */}
      {/* Conditional info pair starts here — weather first
          ("what will the day be like?"), tide second. */}
      <BriefingWeatherCard
        latitude={briefingLocation.latitude}
        longitude={briefingLocation.longitude}
      />

      {/* ── 1e. Tide one-liner (Phase A.33) ───────── */}
      {/* Conditional info pair: weather first, tide second. The tide
          card hides itself entirely (returns null) when the lat/lng is
          inland and CO-OPS has no nearby station — Western MD users
          get no noise placeholder. */}
      <BriefingTideCard
        latitude={briefingLocation.latitude}
        longitude={briefingLocation.longitude}
      />

      {/* ── 2. Streak strip (Phase A.36 — tier badges) ── */}
      {/* Each cell shows raw count + label as before; the new third
          line is a tier badge (NEW / CONSISTENT / COMMITTED / LEGEND)
          when streak ≥ 1. Pure projection in streakTierService keeps
          the threshold table testable and the component theme-color-only. */}
      <View style={styles.streakRow}>
        <View style={styles.streakCell}>
          <Text style={styles.streakValue}>{streak.current}</Text>
          <Text style={styles.streakLabel}>DAY STREAK</Text>
          <StreakTierBadge days={streak.current} />
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakCell}>
          <Text style={styles.streakValue}>{streak.longest}</Text>
          <Text style={styles.streakLabel}>LONGEST</Text>
          <StreakTierBadge days={streak.longest} />
        </View>
      </View>

      {/* ── 2b. Streak insurance CTA (Phase A.20) ─── */}
      {showStreakInsurance ? (
        <TouchableOpacity
          style={styles.insuranceCard}
          onPress={onLogTodayToKeepStreak}
          accessibilityRole="button"
          accessibilityLabel="Log a journal entry to keep your streak"
        >
          <View style={styles.insuranceChip}>
            <Text style={styles.insuranceChipText}>!</Text>
          </View>
          <View style={styles.insuranceBody}>
            <Text style={styles.insuranceTitle}>
              Don't break your {streak.current}-day streak
            </Text>
            <Text style={styles.insuranceSubtitle}>
              You haven't logged anything today. Tap to add a quick entry.
            </Text>
          </View>
          <Text style={styles.chev}>{'\u203A'}</Text>
        </TouchableOpacity>
      ) : null}

      {/* ── 3. Logged today ───────────────────────── */}
      {loggedToday.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOGGED TODAY</Text>
          {loggedToday.slice(0, 3).map((e) => {
            const meta = JOURNAL_OUTCOME_META[e.outcome];
            return (
              <TouchableOpacity
                key={e.id}
                style={styles.card}
                onPress={() => onOpenJournalEntry(e)}
              >
                <View style={styles.cardChip}>
                  <Text style={styles.cardChipText}>JR</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>
                    {e.title || 'Untitled entry'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {meta?.label ?? e.outcome} · {modeLabel(e.mode)}
                  </Text>
                </View>
                <Text style={styles.chev}>{'\u203A'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {/* ── 3a. Trip to log (Phase A.46) ─────────── */}
      {/* Catches trips whose end date fell in the last 7 days but
          which still have no journal entry. Sits ABOVE the Trip on
          Deck card because post-trip recall fades faster than pre-
          trip prep — surfacing the LOG nudge first respects that
          asymmetry. Renders null when no trip qualifies (no recently-
          ended trips, all already logged). */}
      <BriefingTripsToLogCard trip={recentlyEnded} />

      {/* ── 3a2. Trip drought nudge (Phase A.48) ──── */}
      {/* Mutually exclusive with the trip-to-log card in practice
          (drought requires > 30 days since last trip; trip-to-log
          requires ≤ 7 days). Renders only when the user is in a
          drought state AND has at least one past trip — first-time
          users get other onboarding surfaces, not this nudge. */}
      <BriefingTripDroughtCard drought={drought} />

      {/* ── 3b. Trip on Deck (Phase A.44) ─────────── */}
      {/* Surfaces the soonest Camp/Hike planner trip when it's within
          the 14-day horizon. Tap → UpcomingTripsScreen for the full
          chronological list across both planners. Renders null when no
          trip qualifies — no empty stub. Sits ABOVE the legacy
          GearChecklist-tripDate "UPCOMING TRIPS" section because the
          planner-trip view is the source-of-truth for "what trips do I
          have on the books"; the gear-checklist section answers a
          different question ("what packing am I in the middle of"). */}
      <BriefingTripTeaserCard teaser={tripTeaser} />

      {/* ── 4. Upcoming trips ─────────────────────── */}
      {upcomingTrips.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPCOMING TRIPS</Text>
          {upcomingTrips.map((it) => (
            <TouchableOpacity
              key={it.id}
              style={styles.card}
              onPress={() => onOpenChecklist(it)}
            >
              <View style={styles.cardChip}>
                <Text style={styles.cardChipText}>GC</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{it.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {modeLabel(it.mode)} · {it.tripDate} ·{' '}
                  {it.totalCount > 0
                    ? `${it.packedCount}/${it.totalCount} packed`
                    : 'No items yet'}
                </Text>
              </View>
              <View style={styles.daysPill}>
                <Text style={styles.daysPillText}>
                  {daysAwayLabel(it.daysAway)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* ── 5. On This Day teaser ─────────────────── */}
      {/* Phase A.37: when at least one memory carries a photo, the teaser
          renders a hero image with the year + caption next to it. Falls
          back to the original text-only card when the user has memories
          but none have photos (early users, tracks-only history). The
          memoryPhoto pick is stable across renders — newest-year-first,
          first-photo-bearing item — so the briefing doesn't shuffle
          while the user looks at it. */}
      {memories.totalCount > 0 && memoryTeaser ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ON THIS DAY</Text>
            <TouchableOpacity onPress={onSeeAllMemories}>
              <Text style={styles.seeAll}>SEE ALL ({memories.totalCount})</Text>
            </TouchableOpacity>
          </View>
          {memoryPhoto ? (
            <TouchableOpacity
              style={styles.memoryCardWithPhoto}
              onPress={onSeeAllMemories}
              activeOpacity={0.85}
            >
              <View style={styles.memoryPhotoWrap}>
                <Image
                  source={{ uri: memoryPhoto.uri }}
                  style={styles.memoryPhoto}
                  resizeMode="cover"
                />
                <View style={styles.memoryPhotoChip}>
                  <Text style={styles.memoryPhotoChipText}>
                    {memoryPhoto.kind === 'waypoint' ? 'WP' : 'JR'}
                  </Text>
                </View>
              </View>
              <View style={styles.memoryCardBody}>
                <Text style={styles.memoryYears}>
                  {memoryPhoto.yearsAgo === 1
                    ? '1 YEAR AGO'
                    : `${memoryPhoto.yearsAgo} YEARS AGO`}
                </Text>
                <Text style={styles.memoryTitle} numberOfLines={2}>
                  {memoryPhoto.title}
                </Text>
                <Text style={styles.memorySubtitle}>
                  {memories.totalCount}{' '}
                  {memories.totalCount === 1 ? 'memory' : 'memories'} ·{' '}
                  {memoryPhoto.year}
                </Text>
              </View>
              <Text style={styles.chev}>{'\u203A'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.memoryCard}>
              <Text style={styles.memoryYears}>
                {memoryTeaser.yearsAgo === 1
                  ? '1 YEAR AGO'
                  : `${memoryTeaser.yearsAgo} YEARS AGO`}
              </Text>
              <Text style={styles.memoryBody}>
                {memoryTeaser.items.length}{' '}
                {memoryTeaser.items.length === 1 ? 'memory' : 'memories'} from{' '}
                {memoryTeaser.year}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* ── 6. Pick up where you left off ─────────── */}
      {recent ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PICK UP WHERE YOU LEFT OFF</Text>
          <TouchableOpacity style={styles.card} onPress={onOpenRecent}>
            <View style={styles.cardChip}>
              <Text style={styles.cardChipText}>{recent.code}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{recent.label}</Text>
              <Text style={styles.cardSubtitle}>{recent.detail}</Text>
            </View>
            <Text style={styles.chev}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── 7. Totals strip ───────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>YOUR DATA</Text>
        <View style={styles.totalsGrid}>
          <TotalCell n={totals.waypoints} label="WAYPOINTS" />
          <TotalCell n={totals.tracks} label="TRACKS" />
          <TotalCell n={totals.markups} label="MARKUPS" />
          <TotalCell n={totals.journal} label="JOURNAL" />
          <TotalCell n={totals.checklists} label="CHECKLISTS" />
          <TotalCell n={totals.photos} label="PHOTOS" />
        </View>
      </View>

      {/* ── 8. Tomorrow preview (Phase A.35) ──────── */}
      {/* Forward-looking footer — sits at the bottom so the briefing
          remains a "today" dashboard with a "should I plan?" hook,
          not the other way around. Sync — reuses the local solunar
          model for both today and tomorrow. Rewards evening opens. */}
      <BriefingTomorrowCard
        todayYmd={today.ymd}
        latitude={briefingLocation.latitude}
        longitude={briefingLocation.longitude}
      />

      {/* ── 9. Best day this week (Phase A.38) ──────── */}
      {/* One rung up from the Tomorrow card — answers "if I'm planning
          my weekend, when should I block?". The two cards are
          complementary: when they agree the day is reinforced, when
          they disagree the user gets two planning horizons in one
          glance. Sync — 7 sequential getLocalSolunarData calls. */}
      <BriefingBestDayCard
        todayYmd={today.ymd}
        latitude={briefingLocation.latitude}
        longitude={briefingLocation.longitude}
      />

      {/* ── 10. Goal Spotlight (Phase A.39) ────────── */}
      {/* Surfaces one annual goal — the most-actionable one
          (behind > on-pace > ahead) — to drive a tap → goals → log
          loop. Renders null when no eligible goal exists, so the
          briefing stays honest for users who haven't set a goal yet
          (or have only past-year history). Card itself owns the
          goal/null gate via `featured ? render : null`. */}
      <BriefingGoalSpotlightCard featured={goalSpotlight} />

      {/* Empty-state hint */}
      {loggedToday.length === 0 &&
      upcomingTrips.length === 0 &&
      memories.totalCount === 0 &&
      !recent ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Quiet day</Text>
          <Text style={styles.emptyBody}>
            Nothing scheduled and no past activity for today. Drop a waypoint
            or write a quick journal entry to get started.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function TotalCell({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.totalCell}>
      <Text style={styles.totalValue}>{n}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

/**
 * Tier badge under the streak count. Renders nothing for the 'none'
 * tier (zero streak) so the strip stays clean for new users with no
 * activity yet. Color is mapped here from the service's accent
 * bucket — service stays theme-free per the A.34 pattern.
 */
function StreakTierBadge({ days }: { days: number }) {
  const info = tierFromStreak(days);
  if (!shouldShowBadge(info)) return null;
  const color = streakBadgeColorFor(info.accent);
  return (
    <View style={[styles.streakBadge, { borderColor: color }]}>
      <Text style={[styles.streakBadgeText, { color }]}>{info.label}</Text>
    </View>
  );
}

function streakBadgeColorFor(accent: StreakTierAccent): string {
  switch (accent) {
    case 'elite':
      return Colors.mdGold;
    case 'strong':
      return Colors.mdGold;
    case 'medium':
      return Colors.amber;
    case 'muted':
    default:
      return Colors.textMuted;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },

  header: { marginBottom: 16 },
  weekday: {
    color: Colors.mdGold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  date: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },

  streakRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingVertical: 14,
    marginBottom: 16,
  },
  streakCell: { flex: 1, alignItems: 'center' },
  streakDivider: {
    width: 1,
    backgroundColor: Colors.mud,
    marginVertical: 6,
  },
  streakValue: {
    color: Colors.mdGold,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  streakLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 1,
  },
  streakBadge: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  streakBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  insuranceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.amber,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: Colors.mud,
    borderRightColor: Colors.mud,
    borderBottomColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 18,
  },
  insuranceChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.amber,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insuranceChipText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '900',
  },
  insuranceBody: { flex: 1 },
  insuranceTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  insuranceSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
  },

  section: { marginBottom: 18 },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seeAll: {
    color: Colors.mdGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  cardChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardChipText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardBody: { flex: 1 },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  chev: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginLeft: 8,
  },

  daysPill: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.mdGold,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  daysPillText: {
    color: Colors.mdGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  memoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  memoryYears: {
    color: Colors.mdGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  memoryBody: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Phase A.37 — photo-augmented teaser. Row layout: square thumbnail
  // on the left (with a small WP/JR chip overlay) and stacked caption
  // on the right. Tapping the row routes to the full On This Day list,
  // matching the existing SEE ALL behavior so there's only one
  // navigation target for the whole section.
  memoryCardWithPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  memoryPhotoWrap: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: Colors.surfaceElevated,
  },
  memoryPhoto: {
    width: '100%',
    height: '100%',
  },
  memoryPhotoChip: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  memoryPhotoChipText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  memoryCardBody: {
    flex: 1,
    paddingRight: 6,
  },
  memoryTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  memorySubtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingVertical: 8,
  },
  totalCell: {
    width: '33.3333%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  totalValue: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.8,
  },

  empty: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 18,
    marginTop: 4,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyBody: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
