/**
 * ComparableConditionsScreen — "what happened the last time it looked
 * like this outside?"
 *
 * Form for today's weather (4 fields, all optional) + ranked list of
 * past JournalEntry rows that match. Per-axis breakdown chips on each
 * result row so the user sees *why* a match scored where it did.
 *
 * Tap any result row to deep-link to the JournalEdit screen for the
 * full narrative + photos.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.13.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  FlatList,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Colors from '../theme/colors';
import { useJournalEntries } from '../context/JournalEntryContext';
import {
  entriesWithWeatherCount,
  findComparableEntries,
  ScoredJournalMatch,
  WeatherQuery,
} from '../services/comparableConditionsService';
import {
  JOURNAL_OUTCOME_META,
} from '../types/journalEntry';
import type { WaypointMode } from '../types/userWaypoint';
import { getCurrentLocation } from '../services/locationService';
import weatherService from '../services/weatherService';
import {
  pickTodaysForecast,
  weatherForecastToQuery,
} from '../services/weatherToConditionsQuery';

type ComparableConditionsParams = {
  ComparableConditions: { mode: WaypointMode };
};

const MODE_LABELS: Record<WaypointMode, string> = {
  hunt: 'Hunt',
  fish: 'Fish',
  camp: 'Camp',
  hike: 'Hike',
};

type ScopeMode = WaypointMode | 'all';

export default function ComparableConditionsScreen() {
  const navigation = useNavigation<any>();
  const route =
    useRoute<RouteProp<ComparableConditionsParams, 'ComparableConditions'>>();
  const initialMode: WaypointMode = route.params?.mode ?? 'hunt';

  const { allEntries } = useJournalEntries();

  // ─── Form state (all strings; parse on submit) ───
  const [tempF, setTempF] = useState('');
  const [windMph, setWindMph] = useState('');
  const [windDir, setWindDir] = useState('');
  const [conditions, setConditions] = useState('');
  const [scope, setScope] = useState<ScopeMode>(initialMode);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillSource, setAutoFillSource] = useState<string | null>(null);

  /**
   * One-tap auto-fill of today's weather. We deliberately do this lazily
   * (on tap, not on screen mount) so opening the screen doesn't trigger
   * a location-permission prompt for a feature the user hasn't asked for.
   *
   * Pulls GPS → weather.gov forecast → first daytime period → 4-axis
   * WeatherQuery via the pure adapter. Failures fall back to a clear
   * Alert; we never silently "succeed" with junk data because that
   * would invisibly degrade match quality.
   */
  const onAutofillFromToday = useCallback(async () => {
    setAutoFilling(true);
    try {
      const loc = await getCurrentLocation();
      const periods = await weatherService.getForecast(
        loc.latitude,
        loc.longitude,
      );
      if (periods.length === 0) {
        Alert.alert(
          'Weather unavailable',
          'Could not load a forecast for your location. Try again or fill the fields manually.',
        );
        return;
      }
      const today = pickTodaysForecast(periods);
      const query = weatherForecastToQuery(today);
      // Format numbers without trailing .0 noise; the form expects strings.
      if (query.temperatureF !== undefined) {
        setTempF(String(Math.round(query.temperatureF)));
      }
      if (query.windMph !== undefined) {
        // Wind midpoints can be x.5 — round so the field stays clean.
        setWindMph(String(Math.round(query.windMph)));
      }
      if (query.windDirection) setWindDir(query.windDirection);
      if (query.conditions) setConditions(query.conditions);
      setAutoFillSource(today?.name ? `Filled from ${today.name}` : null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error';
      Alert.alert(
        'Could not load weather',
        `${message}. You can fill the fields manually instead.`,
      );
    } finally {
      setAutoFilling(false);
    }
  }, []);

  const onClearForm = useCallback(() => {
    setTempF('');
    setWindMph('');
    setWindDir('');
    setConditions('');
    setAutoFillSource(null);
  }, []);

  // Total entries that have ANY usable weather data — surfaced in the
  // empty-state copy so the user understands why no results appear.
  const weatherEntryCount = useMemo(
    () => entriesWithWeatherCount(allEntries),
    [allEntries],
  );

  // Reactive derivation: every keystroke re-ranks the journal. With
  // typical journal sizes (a few hundred entries max) this is well
  // under a frame budget, and the live feedback is much more
  // satisfying than a tap-to-search flow.
  const matches: ScoredJournalMatch[] = useMemo(() => {
    const query: WeatherQuery = {
      temperatureF: parseNumberOrUndefined(tempF),
      windMph: parseNumberOrUndefined(windMph),
      windDirection: windDir.trim() || undefined,
      conditions: conditions.trim() || undefined,
    };

    // If the user hasn't entered anything yet, don't waste space
    // showing every entry with score 0.
    const anyAxis =
      query.temperatureF !== undefined ||
      query.windMph !== undefined ||
      query.windDirection !== undefined ||
      query.conditions !== undefined;
    if (!anyAxis) return [];

    return findComparableEntries(query, allEntries, {
      mode: scope === 'all' ? undefined : scope,
      limit: 25,
      minAxes: 1,
    });
  }, [tempF, windMph, windDir, conditions, scope, allEntries]);

  const onTapMatch = (match: ScoredJournalMatch) => {
    navigation.navigate('JournalEdit', {
      mode: match.entry.mode,
      entryId: match.entry.id,
    });
  };

  const ScopeChip = ({ value, label }: { value: ScopeMode; label: string }) => {
    const active = scope === value;
    return (
      <TouchableOpacity
        style={[styles.scopeChip, active && styles.scopeChipActive]}
        onPress={() => setScope(value)}
      >
        <Text
          style={[
            styles.scopeChipText,
            active && styles.scopeChipTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comparable Conditions</Text>
        <Text style={styles.headerSub}>
          Type today&apos;s weather. We&apos;ll rank past trips by how
          close their conditions were.
        </Text>
      </View>

      {/* Auto-fill toolbar — one-tap pull from weather.gov via GPS */}
      <View style={styles.autofillRow}>
        <TouchableOpacity
          style={[styles.autofillBtn, autoFilling && styles.autofillBtnBusy]}
          onPress={onAutofillFromToday}
          disabled={autoFilling}
          accessibilityLabel="Use today's weather"
        >
          {autoFilling ? (
            <ActivityIndicator
              size="small"
              color={Colors.background}
              style={styles.autofillSpinner}
            />
          ) : null}
          <Text style={styles.autofillBtnText}>
            {autoFilling ? 'LOADING…' : "USE TODAY'S WEATHER"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={onClearForm}
          disabled={autoFilling}
          accessibilityLabel="Clear weather form"
        >
          <Text style={styles.clearBtnText}>CLEAR</Text>
        </TouchableOpacity>
      </View>
      {autoFillSource ? (
        <Text style={styles.autofillSource}>{autoFillSource}</Text>
      ) : null}

      {/* Weather form */}
      <Text style={styles.label}>TODAY&apos;S WEATHER</Text>
      <View style={styles.weatherRow}>
        <View style={styles.weatherCol}>
          <Text style={styles.weatherLabel}>°F</Text>
          <TextInput
            style={styles.weatherInput}
            value={tempF}
            onChangeText={setTempF}
            placeholder="45"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <View style={styles.weatherCol}>
          <Text style={styles.weatherLabel}>Wind MPH</Text>
          <TextInput
            style={styles.weatherInput}
            value={windMph}
            onChangeText={setWindMph}
            placeholder="10"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            maxLength={4}
          />
        </View>
        <View style={styles.weatherCol}>
          <Text style={styles.weatherLabel}>Wind Dir</Text>
          <TextInput
            style={styles.weatherInput}
            value={windDir}
            onChangeText={setWindDir}
            placeholder="NW"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
          />
        </View>
      </View>
      <TextInput
        style={styles.condInput}
        value={conditions}
        onChangeText={setConditions}
        placeholder="Sky / precip (e.g. clear, light rain, overcast)"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={120}
      />

      {/* Scope filter */}
      <Text style={[styles.label, styles.labelSpaced]}>SEARCH IN</Text>
      <View style={styles.scopeRow}>
        <ScopeChip value="all" label="All" />
        <ScopeChip value="hunt" label="Hunt" />
        <ScopeChip value="fish" label="Fish" />
        <ScopeChip value="camp" label="Camp" />
        <ScopeChip value="hike" label="Hike" />
      </View>

      {/* Results */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>MATCHES</Text>
        <Text style={styles.resultsCount}>{matches.length}</Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.empty}>
          {weatherEntryCount === 0 ? (
            <Text style={styles.emptyText}>
              No journal entries with weather data yet. Add a few entries
              with temperature, wind, or sky conditions and they&apos;ll
              show up here.
            </Text>
          ) : (
            <Text style={styles.emptyText}>
              {`Type any weather field above to rank your ${weatherEntryCount} weather-tagged entr${weatherEntryCount === 1 ? 'y' : 'ies'}.`}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.entry.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <MatchRow match={item} onPress={() => onTapMatch(item)} />
          )}
        />
      )}
    </ScrollView>
  );
}

function MatchRow({
  match,
  onPress,
}: {
  match: ScoredJournalMatch;
  onPress: () => void;
}) {
  const pct = Math.round(match.score * 100);
  const meta = JOURNAL_OUTCOME_META[match.entry.outcome];

  return (
    <TouchableOpacity style={styles.matchRow} onPress={onPress}>
      <View style={styles.matchHeader}>
        <View style={styles.scorePill}>
          <Text style={styles.scorePillText}>{pct}%</Text>
        </View>
        <View style={styles.matchTitleCol}>
          <Text style={styles.matchTitle} numberOfLines={1}>
            {match.entry.title || '(untitled entry)'}
          </Text>
          <Text style={styles.matchSub}>
            {match.entry.entryDate} · {MODE_LABELS[match.entry.mode]}
          </Text>
        </View>
        <View
          style={[
            styles.outcomeChip,
            { borderColor: meta?.color ?? Colors.mud },
          ]}
        >
          <Text
            style={[
              styles.outcomeChipText,
              { color: meta?.color ?? Colors.textPrimary },
            ]}
          >
            {meta?.letterCode ?? '—'}
          </Text>
        </View>
      </View>
      <View style={styles.deltaRow}>
        {(['temperatureF', 'windMph', 'windDirection', 'conditions'] as const)
          .map((key) => match.breakdown[key])
          .filter((axis) => axis.applied)
          .map((axis, idx) => (
            <View key={idx} style={styles.deltaChip}>
              <Text style={styles.deltaChipText}>{axis.delta}</Text>
            </View>
          ))}
      </View>
    </TouchableOpacity>
  );
}

function parseNumberOrUndefined(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
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
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  labelSpaced: {
    marginTop: 16,
  },
  autofillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  autofillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.moss,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  autofillBtnBusy: {
    opacity: 0.7,
  },
  autofillBtnText: {
    color: Colors.background,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  autofillSpinner: {
    marginRight: 8,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  autofillSource: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  weatherRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  weatherCol: {
    flex: 1,
  },
  weatherLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  weatherInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  condInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scopeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.mud,
    backgroundColor: Colors.surface,
  },
  scopeChipActive: {
    borderColor: Colors.moss,
    backgroundColor: Colors.moss,
  },
  scopeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scopeChipTextActive: {
    color: Colors.background,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 20,
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  empty: {
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  matchRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scorePill: {
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.moss,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: 12,
  },
  scorePillText: {
    color: Colors.background,
    fontWeight: '800',
    fontSize: 13,
  },
  matchTitleCol: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  matchSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  outcomeChip: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  outcomeChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deltaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  deltaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  deltaChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
