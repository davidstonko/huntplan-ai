/**
 * PersonalHubScreen — single landing page for the V2.3 Personal Layer.
 *
 * Maps the three personal-layer features (Waypoints, Tracks, Markups) to
 * three rows so a user can reach them from the map controls without us
 * having to thread three buttons into every MapScreen's already-crowded
 * controls column.
 *
 * Mode is passed through to each child screen so a Hunt session opens
 * Hunt waypoints/tracks/markups, not the full cross-mode list.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.1, A.2, A.3, D.2 entry-point
 * landing page (the "ME" button on each MapScreen). Keeps the existing
 * modular feel: each child screen still owns its own behavior; this is
 * pure routing.
 */
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { useUserMarkups } from '../context/UserMarkupContext';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { useJournalEntries } from '../context/JournalEntryContext';
import { useGearChecklists } from '../context/GearChecklistContext';
import { totalPhotoCount } from '../services/photoGalleryService';
import { tagFrequency } from '../services/journalTagService';
import { activeDayCount } from '../services/activityCalendarService';
import {
  buildExportBundle,
  shareExportBundle,
} from '../services/exportBundleService';
import { entriesWithWeatherCount } from '../services/comparableConditionsService';
import { onThisDayCount } from '../services/onThisDayService';
import { useFavorites } from '../context/FavoritesContext';
import { liveFavoriteCount } from '../services/favoritesAggregatorService';
import { dailyBriefingHighlightCount } from '../services/dailyBriefingService';
import { computeYearInReview } from '../services/yearInReviewService';
import { loadGoals } from '../services/goalsStorage';
import {
  computeAllGoalProgress,
  pickFeaturedGoal,
} from '../services/goalsService';
import type { Goal, GoalProgress, PaceStatus } from '../types/goal';
import type { WaypointMode } from '../types/userWaypoint';
import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';
import {
  upcomingTripsCount,
  pickFeaturedTrip,
  relativeDayLabel,
  type UpcomingTripRow,
} from '../services/upcomingTripsService';

type PersonalHubParams = {
  PersonalHub: { mode: WaypointMode };
};

function modeLabel(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt':
      return 'Hunt';
    case 'fish':
      return 'Fish';
    case 'camp':
      return 'Camp';
    case 'hike':
      return 'Hike';
    default:
      return 'Mode';
  }
}

interface RowProps {
  code: string;
  title: string;
  subtitle: string;
  count: number;
  onPress: () => void;
}

function HubRow({ code, title, subtitle, count, onPress }: RowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.codeChip}>
        <Text style={styles.codeChipText}>{code}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.rowCount}>{count}</Text>
        <Text style={styles.rowChev}>{'\u203A'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ────────────────────────── Phase A.30 helpers ──────────────────────────

function paceLabel(p: PaceStatus): string {
  switch (p) {
    case 'ahead':
      return 'AHEAD';
    case 'on_pace':
      return 'ON PACE';
    case 'behind':
      return 'BEHIND';
    case 'complete':
      return 'COMPLETE';
  }
}

function paceColor(p: PaceStatus): string {
  // Mirrors GoalsScreen so the teaser and the full screen agree on the
  // pace verdict's color language.
  switch (p) {
    case 'ahead':
      return Colors.success;
    case 'on_pace':
      return Colors.sage;
    case 'behind':
      return Colors.rust;
    case 'complete':
      return Colors.mdGold;
  }
}

interface FeaturedGoalCardProps {
  progress: GoalProgress;
  onPress: () => void;
}

/**
 * Closest-active-goal teaser. One-tap card that surfaces the goal most
 * worth nudging the user about (see pickFeaturedGoal). Renders a label,
 * a pace-tinted progress bar, "current of target" readout, and a pace
 * badge. Tapping navigates to GoalsScreen for the full list.
 */
function FeaturedGoalCard({ progress, onPress }: FeaturedGoalCardProps) {
  const { goal, percent, paceStatus, display } = progress;
  const label = goal.label && goal.label.trim().length > 0
    ? goal.label
    : `${goal.year} ${goal.scope === 'all' ? 'all-mode' : goal.scope} ${display.target} ${display.unit}`;
  // Bar fill width is the displayed percent, but never reads as zero
  // when there is positive progress — avoids the "I have 1 mile but the
  // bar shows nothing" footgun on tiny fractions.
  const fillPct =
    progress.current > 0 && percent < 1 ? 1 : Math.min(100, Math.max(0, percent));
  const bar = paceColor(paceStatus);
  return (
    <TouchableOpacity
      style={styles.goalCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Goal — ${label}, ${Math.round(percent)} percent, ${paceLabel(paceStatus)}`}
    >
      <View style={styles.goalHeaderRow}>
        <View style={styles.goalCodeChip}>
          <Text style={styles.goalCodeChipText}>GO</Text>
        </View>
        <Text style={styles.goalLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.paceBadge, { backgroundColor: bar }]}>
          <Text
            style={[
              styles.paceBadgeText,
              {
                color:
                  paceStatus === 'complete'
                    ? Colors.mdBlack
                    : Colors.textOnAccent,
              },
            ]}
          >
            {paceLabel(paceStatus)}
          </Text>
        </View>
      </View>
      <View style={styles.goalBarTrack}>
        <View
          style={[
            styles.goalBarFill,
            { width: `${fillPct}%`, backgroundColor: bar },
          ]}
        />
      </View>
      <View style={styles.goalRow}>
        <Text style={styles.goalRowText}>
          {display.current} of {display.target} {display.unit}
        </Text>
        <Text style={styles.goalPercent}>{Math.round(percent)}%</Text>
      </View>
    </TouchableOpacity>
  );
}

// ────────────────────────── Phase A.42 helpers ──────────────────────────

interface TripCountdownCardProps {
  row: UpcomingTripRow;
  onPress: () => void;
}

/**
 * Closest-upcoming-trip teaser. One-tap card that surfaces the soonest
 * trip across both planners (see pickFeaturedTrip). Renders a kind chip
 * (CAMP/HIKE), a countdown headline, the trip name, and the meta line.
 * Tap navigates to UpcomingTripsScreen for the full chronological list.
 *
 * Color tier mirrors the day-badge in UpcomingTripsScreen so the visual
 * language stays consistent: today=amber (act now), this-week=mdGold
 * (warm), further-out=textSecondary (cool).
 */
function TripCountdownCard({ row, onPress }: TripCountdownCardProps) {
  const accent =
    row.daysUntil === 0
      ? Colors.amber
      : row.daysUntil <= 7
        ? Colors.mdGold
        : Colors.textSecondary;
  const countdown = relativeDayLabel(row.daysUntil).toUpperCase();
  return (
    <TouchableOpacity
      style={[styles.tripCard, { borderColor: accent }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Next trip — ${row.name}, ${relativeDayLabel(row.daysUntil)}`}
    >
      <View style={styles.tripCardHeader}>
        <View style={[styles.tripKindChip, { borderColor: accent }]}>
          <Text style={[styles.tripKindChipText, { color: accent }]}>
            {row.kind === 'camp' ? 'CAMP' : 'HIKE'}
          </Text>
        </View>
        <Text style={styles.tripCardLabel}>NEXT TRIP</Text>
        <Text style={[styles.tripCardCountdown, { color: accent }]}>
          {countdown}
        </Text>
      </View>
      <Text style={styles.tripCardName} numberOfLines={1}>
        {row.name}
      </Text>
      <Text style={styles.tripCardMeta} numberOfLines={1}>
        {row.startDate} · {row.meta}
      </Text>
    </TouchableOpacity>
  );
}

export default function PersonalHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<PersonalHubParams, 'PersonalHub'>>();
  const mode: WaypointMode = route.params?.mode ?? 'hunt';

  const { waypointsForMode, allWaypoints } = useUserWaypoints();
  const { markupsForMode, allMarkups } = useUserMarkups();
  const { tracksForMode, allTracks } = useTrackRecorder();
  const { entriesForMode, allEntries } = useJournalEntries();
  const { checklistsForMode, allChecklists } = useGearChecklists();
  const { favorites } = useFavorites();

  const counts = useMemo(
    () => {
      const modeWaypoints = waypointsForMode(mode);
      const modeEntries = entriesForMode(mode);
      const modeTracks = tracksForMode(mode);
      const modeMarkups = markupsForMode(mode);
      const modeChecklists = checklistsForMode(mode);
      return {
        waypoints: modeWaypoints.length,
        tracks: modeTracks.length,
        markups: modeMarkups.length,
        journal: modeEntries.length,
        checklists: modeChecklists.length,
        photos: totalPhotoCount({
          waypoints: modeWaypoints,
          journalEntries: modeEntries,
        }),
        tags: tagFrequency(modeEntries).length,
        activeDays: activeDayCount(
          {
            waypoints: modeWaypoints,
            tracks: modeTracks,
            markups: modeMarkups,
            journalEntries: modeEntries,
            checklists: modeChecklists,
          },
        ),
        // Candidate-pool size for the Comparable Conditions search.
        // Counted across the current-mode entry subset so the badge
        // matches the default scope of the search screen.
        weatherEntries: entriesWithWeatherCount(modeEntries),
      };
    },
    [
      mode,
      waypointsForMode,
      tracksForMode,
      markupsForMode,
      entriesForMode,
      checklistsForMode,
    ],
  );

  // ── On-This-Day badge (cross-mode by design) ─────────────────────
  // Memories aggregator runs across every mode, not just the current one,
  // because the whole pitch is "what was I doing this calendar day in
  // any prior year" — surfacing a hunt entry from 2024 next to a hike
  // from 2025 is the feature. Computed in a separate memo so the
  // existing per-mode `counts` memo doesn't need all* arrays in its
  // dep list.
  const memoryCount = useMemo(
    () =>
      onThisDayCount(new Date(), {
        waypoints: allWaypoints,
        tracks: allTracks,
        markups: allMarkups,
        journalEntries: allEntries,
        checklists: allChecklists,
      }),
    [allWaypoints, allTracks, allMarkups, allEntries, allChecklists],
  );

  // ── Favorites badge (cross-mode, live join) ──────────────────────
  // We badge with the LIVE count (refs joined to existing rows) instead
  // of `favorites.length`, which would overcount stale refs whose
  // underlying row was deleted. Same separate-memo reasoning as
  // memoryCount above — keep the per-mode counts memo focused on
  // per-mode arrays.
  const favoriteCount = useMemo(
    () =>
      liveFavoriteCount({
        favorites,
        waypoints: allWaypoints,
        tracks: allTracks,
        markups: allMarkups,
        journalEntries: allEntries,
        checklists: allChecklists,
      }),
    [favorites, allWaypoints, allTracks, allMarkups, allEntries, allChecklists],
  );

  // Phase A.22 — Quick-Add FAB. Single tap → action sheet of 5 creation
  // shortcuts so the user never has to open a sublist screen first.
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const closeQuickAdd = useCallback(() => setQuickAddOpen(false), []);
  const openQuickAdd = useCallback(() => setQuickAddOpen(true), []);
  const onQuickAddWaypoint = useCallback(() => {
    setQuickAddOpen(false);
    navigation.navigate('WaypointEdit', { mode });
  }, [navigation, mode]);
  const onQuickAddTrack = useCallback(() => {
    setQuickAddOpen(false);
    navigation.navigate('TrackRecorder', { mode });
  }, [navigation, mode]);
  const onQuickAddMarkup = useCallback(() => {
    setQuickAddOpen(false);
    navigation.navigate('MarkupEdit', { mode });
  }, [navigation, mode]);
  const onQuickAddJournal = useCallback(() => {
    setQuickAddOpen(false);
    navigation.navigate('JournalEdit', { mode });
  }, [navigation, mode]);
  const onQuickAddChecklist = useCallback(() => {
    setQuickAddOpen(false);
    navigation.navigate('GearChecklistEdit', { mode });
  }, [navigation, mode]);

  const onWaypoints = () => navigation.navigate('WaypointList', { mode });
  const onTracks = () => navigation.navigate('TrackList', { mode });
  const onMarkups = () => navigation.navigate('MarkupList', { mode });
  const onRecord = () => navigation.navigate('TrackRecorder', { mode });
  const onStats = () => navigation.navigate('PersonalStats');
  const onJournal = () => navigation.navigate('JournalList', { mode });
  const onChecklists = () => navigation.navigate('GearChecklistList', { mode });
  const onSearch = () => navigation.navigate('PersonalSearch', { mode });
  const onPhotos = () => navigation.navigate('PhotoGallery', { mode });
  const onTags = () => navigation.navigate('TagExplorer', { mode });
  const onCalendar = () => navigation.navigate('ActivityCalendar', { mode });
  const onComparableConditions = () =>
    navigation.navigate('ComparableConditions', { mode });
  const onOnThisDay = () => navigation.navigate('OnThisDay');
  const onFavorites = () => navigation.navigate('Favorites');
  const onDailyBriefing = () => navigation.navigate('DailyBriefing');
  const onYearInReview = () => navigation.navigate('YearInReview');
  const onImport = () => navigation.navigate('ImportPicker', { mode });
  const onGoals = () => navigation.navigate('Goals');
  const onUpcomingTrips = () => navigation.navigate('UpcomingTrips');

  // ── Goals badge (current calendar year, cross-mode) ──────────────
  // Goals live in their own AsyncStorage key (`user_goals_v1`) and don't
  // have a context provider — direct load on mount + reload on every
  // PersonalHub focus so the badge picks up edits made on GoalsScreen.
  // The badge counts ACTIVE goals for the current year (year >= now-year);
  // closed years still show on GoalsScreen but don't drive the hub badge.
  const [goalsForYear, setGoalsForYear] = useState<Goal[]>([]);
  useEffect(() => {
    let cancelled = false;
    const reload = () =>
      void loadGoals().then((rows) => {
        if (cancelled) return;
        const currentYear = new Date().getFullYear();
        setGoalsForYear(rows.filter((g) => g.year >= currentYear));
      });
    reload();
    const unsub = navigation.addListener('focus', reload);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [navigation]);
  const goalCount = goalsForYear.length;

  // ── Upcoming Trips badge (Phase A.41 — cross-planner) ────────────
  // Camp + Hike trips live in their own AsyncStorage keys (no React
  // context provider exists for either) — direct load on mount + reload
  // on every PersonalHub focus so a save in either planner is reflected
  // here without remounting. Same shape as the goals loader above.
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
        // safe default — empty arrays on any read error
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
  const upcomingCount = useMemo(
    () => upcomingTripsCount({ campTrips, hikeTrips }),
    [campTrips, hikeTrips],
  );

  // ── Featured-trip teaser (Phase A.42) ────────────────────────────
  // Surfaces the soonest upcoming trip as a hero countdown card at the
  // top of the hub. Returns null when no upcoming trip exists — in
  // which case the slot is hidden, not stubbed (A.39 card-renders-null
  // pattern). Re-runs whenever the loaded trip arrays change.
  const featuredTrip: UpcomingTripRow | null = useMemo(
    () => pickFeaturedTrip({ campTrips, hikeTrips }),
    [campTrips, hikeTrips],
  );

  // ── Featured-goal teaser (Phase A.30) ────────────────────────────
  // The "your closest active goal" card surfaces ONE GoalProgress at the
  // top of the hub so the user gets an open-loop pull every time they
  // open Personal. Picker prefers behind-pace + highest-percent so the
  // card answers "what should I do now to keep my goal alive?". Returns
  // null when no eligible (active, incomplete) goal exists — in which
  // case the teaser slot is hidden, not stubbed.
  const featuredGoal: GoalProgress | null = useMemo(() => {
    if (goalsForYear.length === 0) return null;
    const all = computeAllGoalProgress(goalsForYear, {
      tracks: allTracks,
      journals: allEntries,
      waypoints: allWaypoints,
    });
    return pickFeaturedGoal(all);
  }, [goalsForYear, allTracks, allEntries, allWaypoints]);

  // ── Year-in-Review badge (cross-mode, current calendar year) ─────
  // Counts all artifacts logged in the current calendar year across all 5
  // personal-layer surfaces. Cheap pure aggregation — Phase A.23 service
  // is a single linear pass over the input arrays. Same separate-memo
  // discipline as memoryCount/favoriteCount/briefingCount above.
  const yearInReviewCount = useMemo(() => {
    const review = computeYearInReview(new Date().getFullYear(), {
      waypoints: allWaypoints,
      tracks: allTracks,
      markups: allMarkups,
      journalEntries: allEntries,
      checklists: allChecklists,
    });
    return (
      review.totals.waypoints +
      review.totals.tracks +
      review.totals.markups +
      review.totals.journals +
      review.totals.checklists
    );
  }, [allWaypoints, allTracks, allMarkups, allEntries, allChecklists]);

  // ── Daily Briefing badge (cross-mode highlight count) ────────────
  // Sums prior-year memories + upcoming trips + 1 if you've already
  // logged something today. Same separate-memo discipline as memoryCount
  // and favoriteCount above.
  const briefingCount = useMemo(
    () =>
      dailyBriefingHighlightCount(new Date(), {
        waypoints: allWaypoints,
        tracks: allTracks,
        markups: allMarkups,
        journalEntries: allEntries,
        checklists: allChecklists,
      }),
    [allWaypoints, allTracks, allMarkups, allEntries, allChecklists],
  );

  // ── Export ("Backup My Data") ──────────────────────────────────
  // Always exports ALL personal-layer rows (every mode), not just the
  // current-mode subset — this is a "save my whole app, my phone might
  // break" feature, not a per-mode export. The user can re-export per-mode
  // via GPX/KML if they want narrower output.
  const [exporting, setExporting] = useState(false);
  const onExportBackup = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const bundle = buildExportBundle({
        waypoints: allWaypoints,
        tracks: allTracks,
        markups: allMarkups,
        journalEntries: allEntries,
        checklists: allChecklists,
      });
      await shareExportBundle(bundle);
    } catch (err: any) {
      // Share-cancelled is the common case (user dismisses the sheet).
      // react-native-share rejects with a message containing "User did
      // not share" — we don't surface that as an error to the user.
      const msg = String(err?.message ?? err);
      if (!msg.includes('User did not share') && !msg.includes('cancelled')) {
        Alert.alert(
          'Backup failed',
          'Could not create your backup file. Please try again.',
        );
      }
    } finally {
      setExporting(false);
    }
  }, [
    exporting,
    allWaypoints,
    allTracks,
    allMarkups,
    allEntries,
    allChecklists,
  ]);

  const totalRows =
    allWaypoints.length +
    allTracks.length +
    allMarkups.length +
    allEntries.length +
    allChecklists.length;

  return (
    <View style={styles.fabHost}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My {modeLabel(mode)} Layer</Text>
        <Text style={styles.headerSub}>
          Stays on this device. Backed up via export to KML / GPX.
        </Text>
      </View>

      {/* ── Phase A.42 — Closest upcoming trip countdown ── */}
      {/* Hero card above the goal teaser because a trip in the next few
          days is more time-sensitive than a yearly target. Hidden when
          no upcoming trip exists (A.39 card-renders-null pattern). */}
      {featuredTrip ? (
        <TripCountdownCard row={featuredTrip} onPress={onUpcomingTrips} />
      ) : null}

      {/* ── Phase A.30 — Closest active goal teaser ── */}
      {/* Surfaces ONE goal — the one a "log a quick entry now" tap could
          most plausibly affect. Hidden when no eligible goal exists. */}
      {featuredGoal ? (
        <FeaturedGoalCard progress={featuredGoal} onPress={onGoals} />
      ) : null}

      <HubRow
        code="TD"
        title="Today's Briefing"
        subtitle="Memories, upcoming trips, your streak — what's worth opening the app for today."
        count={briefingCount}
        onPress={onDailyBriefing}
      />

      <TouchableOpacity style={styles.searchRow} onPress={onSearch}>
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>{'\u2315'}</Text>
        </View>
        <View style={styles.searchTextCol}>
          <Text style={styles.searchTitle}>Find anything in your layer</Text>
          <Text style={styles.searchSubtitle}>
            Search across waypoints, tracks, markups, journals, and gear lists.
          </Text>
        </View>
        <Text style={styles.rowChev}>{'\u203A'}</Text>
      </TouchableOpacity>

      <HubRow
        code="WP"
        title="Waypoints"
        subtitle="Pins you've dropped — stands, holes, ramps, landmarks."
        count={counts.waypoints}
        onPress={onWaypoints}
      />

      <HubRow
        code="TR"
        title="Tracks"
        subtitle="Recorded GPS tracks of your hunts, drifts, and hikes."
        count={counts.tracks}
        onPress={onTracks}
      />

      <HubRow
        code="MK"
        title="Markups"
        subtitle="Drawn lines and areas — boundaries, shoot lanes, zones."
        count={counts.markups}
        onPress={onMarkups}
      />

      <HubRow
        code="JR"
        title="Field Journal"
        subtitle="Per-trip diary — date, weather, outcome, notes, photos."
        count={counts.journal}
        onPress={onJournal}
      />

      <HubRow
        code="TG"
        title="Journal Tags"
        subtitle="Browse the tags you've used — tap one to find every entry."
        count={counts.tags}
        onPress={onTags}
      />

      <HubRow
        code="GC"
        title="Gear Checklists"
        subtitle="Pre-trip pack list per trip type. Build once, carry forward."
        count={counts.checklists}
        onPress={onChecklists}
      />

      <HubRow
        code="PH"
        title="Photos"
        subtitle="Every photo from your waypoints + journal in one grid."
        count={counts.photos}
        onPress={onPhotos}
      />

      <HubRow
        code="CL"
        title="Activity Calendar"
        subtitle="Heatmap of every field day. See your streak. Tap a day to revisit it."
        count={counts.activeDays}
        onPress={onCalendar}
      />

      <HubRow
        code="CC"
        title="Comparable Conditions"
        subtitle="Type today&#39;s weather; rank past trips by similarity. Find what worked the last time it looked like this."
        count={counts.weatherEntries}
        onPress={onComparableConditions}
      />

      <HubRow
        code="OD"
        title="On This Day"
        subtitle="Memories from this calendar day in past years. Across every mode."
        count={memoryCount}
        onPress={onOnThisDay}
      />

      <HubRow
        code="FV"
        title="Favorites"
        subtitle="Pinned waypoints, tracks, markups, journals, and checklists. Cross-mode."
        count={favoriteCount}
        onPress={onFavorites}
      />

      <HubRow
        code="UT"
        title="Upcoming Trips"
        subtitle="Every saved Camp + Hike trip in chronological order. See what's next, tap to open the planner."
        count={upcomingCount}
        onPress={onUpcomingTrips}
      />

      <HubRow
        code="GO"
        title="Annual Goals"
        subtitle="Set yearly targets — miles hiked, journal entries, days afield. Live progress + on-pace verdict."
        count={goalCount}
        onPress={onGoals}
      />

      <HubRow
        code="YR"
        title={`${new Date().getFullYear()} in Review`}
        subtitle="Your outdoor year — totals, top mode, top tag, longest streak, biggest day. Pick any year to revisit."
        count={yearInReviewCount}
        onPress={onYearInReview}
      />

      <HubRow
        code="ST"
        title="My Stats"
        subtitle="Lifetime tracks, miles, elevation, days active across all modes."
        count={counts.waypoints + counts.tracks + counts.markups}
        onPress={onStats}
      />

      <HubRow
        code="EX"
        title={exporting ? 'Preparing backup\u2026' : 'Backup My Data'}
        subtitle="Export every waypoint, track, markup, journal, and gear list as one JSON file. Email it to yourself or save to Files."
        count={totalRows}
        onPress={onExportBackup}
      />

      <HubRow
        code="IM"
        title="Import KML / GPX"
        subtitle="Pull pins, tracks, and shapes from Garmin, OnX, AllTrails, Caltopo, gaiagps, or any backup file. Preview before adding."
        count={0}
        onPress={onImport}
      />

      <TouchableOpacity style={styles.recordBtn} onPress={onRecord}>
        <Text style={styles.recordBtnText}>+ RECORD A NEW TRACK</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Personal data is stored locally. Export to GPX or KML to back up
        across devices.
      </Text>
      <View style={{ height: 80 }} />
    </ScrollView>

    {/* Phase A.22 — Quick-Add FAB */}
    <TouchableOpacity
      style={styles.fab}
      onPress={openQuickAdd}
      accessibilityRole="button"
      accessibilityLabel="Quick add — create a new waypoint, track, markup, journal entry, or checklist"
    >
      <Text style={styles.fabPlus}>+</Text>
    </TouchableOpacity>

    <Modal
      visible={quickAddOpen}
      animationType="fade"
      transparent
      onRequestClose={closeQuickAdd}
    >
      <Pressable style={styles.sheetBackdrop} onPress={closeQuickAdd}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            New {modeLabel(mode)} Item
          </Text>
          <Text style={styles.sheetSub}>
            Choose what to log. Opens the editor pre-set to {modeLabel(mode)} mode.
          </Text>

          <TouchableOpacity style={styles.sheetRow} onPress={onQuickAddJournal}>
            <View style={[styles.sheetChip, { borderColor: Colors.amber }]}>
              <Text style={styles.sheetChipText}>JR</Text>
            </View>
            <View style={styles.sheetRowBody}>
              <Text style={styles.sheetRowTitle}>Field Journal Entry</Text>
              <Text style={styles.sheetRowSub}>
                Quick note — date, weather, outcome, photos.
              </Text>
            </View>
            <Text style={styles.sheetChev}>{'\u203A'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetRow} onPress={onQuickAddWaypoint}>
            <View style={[styles.sheetChip, { borderColor: Colors.moss }]}>
              <Text style={styles.sheetChipText}>WP</Text>
            </View>
            <View style={styles.sheetRowBody}>
              <Text style={styles.sheetRowTitle}>Waypoint</Text>
              <Text style={styles.sheetRowSub}>
                Drop a pin — stand, hole, ramp, landmark.
              </Text>
            </View>
            <Text style={styles.sheetChev}>{'\u203A'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetRow} onPress={onQuickAddTrack}>
            <View style={[styles.sheetChip, { borderColor: Colors.oak }]}>
              <Text style={styles.sheetChipText}>TR</Text>
            </View>
            <View style={styles.sheetRowBody}>
              <Text style={styles.sheetRowTitle}>Record GPS Track</Text>
              <Text style={styles.sheetRowSub}>
                Live recorder — pause, save, view splits.
              </Text>
            </View>
            <Text style={styles.sheetChev}>{'\u203A'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetRow} onPress={onQuickAddMarkup}>
            <View style={[styles.sheetChip, { borderColor: Colors.mdGold }]}>
              <Text style={styles.sheetChipText}>MK</Text>
            </View>
            <View style={styles.sheetRowBody}>
              <Text style={styles.sheetRowTitle}>Markup (Line / Area)</Text>
              <Text style={styles.sheetRowSub}>
                Draw a boundary, shoot lane, or zone.
              </Text>
            </View>
            <Text style={styles.sheetChev}>{'\u203A'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetRow} onPress={onQuickAddChecklist}>
            <View style={[styles.sheetChip, { borderColor: Colors.textSecondary }]}>
              <Text style={styles.sheetChipText}>GC</Text>
            </View>
            <View style={styles.sheetRowBody}>
              <Text style={styles.sheetRowTitle}>Gear Checklist</Text>
              <Text style={styles.sheetRowSub}>
                Pre-trip pack list. Auto-seeded with mode defaults.
              </Text>
            </View>
            <Text style={styles.sheetChev}>{'\u203A'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetCancel}
            onPress={closeQuickAdd}
            accessibilityRole="button"
            accessibilityLabel="Cancel quick add"
          >
            <Text style={styles.sheetCancelText}>CANCEL</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  codeChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  codeChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  rowMeta: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  rowCount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  rowChev: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // ── Phase A.30 — featured-goal teaser ──
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mdGold,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalCodeChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.mdGold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  goalCodeChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.mdGold,
    letterSpacing: 0.6,
  },
  goalLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  paceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  paceBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  goalBarTrack: {
    height: 8,
    backgroundColor: Colors.mdBlack,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalRowText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  goalPercent: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // ── Phase A.42 — closest-trip countdown card ──
  tripCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tripKindChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    backgroundColor: Colors.background,
  },
  tripKindChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tripCardLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  tripCardCountdown: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tripCardName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  tripCardMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.oak,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.oak,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchIconText: {
    fontSize: 18,
    color: Colors.oak,
  },
  searchTextCol: {
    flex: 1,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  searchSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  recordBtn: {
    marginTop: 6,
    backgroundColor: Colors.moss,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  recordBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.background,
    letterSpacing: 0.5,
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
  // ── Phase A.22 Quick-Add FAB ───────────────────────────────────────
  fabHost: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.mdGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPlus: {
    color: Colors.background,
    fontSize: 32,
    fontWeight: '800',
    marginTop: -3,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: Colors.mud,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.mud,
    marginBottom: 10,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sheetSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 16,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  sheetChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetChipText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sheetRowBody: {
    flex: 1,
  },
  sheetRowTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sheetRowSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
  },
  sheetChev: {
    color: Colors.textSecondary,
    fontSize: 18,
    marginLeft: 8,
  },
  sheetCancel: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  sheetCancelText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.0,
  },
});
