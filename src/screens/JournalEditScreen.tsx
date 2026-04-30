/**
 * JournalEditScreen — Create / edit / delete a single field-journal entry.
 *
 * Route params:
 *   - `mode`     (WaypointMode, required) — which mode opened this
 *   - `entryId?` (string) — if present, edit; if absent, create
 *
 * Form fields:
 *   - Date (YYYY-MM-DD, defaults to today, simple text input — full
 *     date-picker module deferred so this ships without adding a new
 *     dep; users routinely type "2026-04-22" faster than they'd swipe a
 *     wheel anyway)
 *   - Title (required, max 100)
 *   - Outcome (chip picker, mode-filtered via OUTCOMES_BY_MODE[mode])
 *   - Body (multiline, max 5000)
 *   - Location label (optional free-form, max 80 — "Cunningham Falls SP")
 *   - Tags (comma-separated input, parsed on commit)
 *   - Weather (optional accordion: temperatureF / windMph / windDirection /
 *     conditions — every field optional)
 *   - Photos (pickPhoto from existing imagePicker service)
 *
 * Save / Cancel / Delete buttons follow the WaypointEditScreen header
 * pattern: Cancel | Title | Save row, with Delete as a destructive footer
 * button in edit mode.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.5.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Colors from '../theme/colors';
import { useJournalEntries } from '../context/JournalEntryContext';
import { pickPhoto } from '../services/imagePicker';
import FavoriteStarButton from '../components/personal/FavoriteStarButton';
import {
  JournalEntry,
  JournalOutcome,
  JournalWeather,
  JOURNAL_OUTCOME_META,
  OUTCOMES_BY_MODE,
  todayDateLabel,
  resolveOutcomeColor,
  resolveOutcomeLetterCode,
} from '../types/journalEntry';
import type { WaypointMode } from '../types/userWaypoint';
import { isJournalSeed, type JournalSeed } from '../services/journalSeedService';
import { shareJournalEntryAsMarkdown } from '../services/journalMarkdownExportService';
import { getCurrentLocation } from '../services/locationService';
import weatherService from '../services/weatherService';
import {
  pickTodaysForecast,
  weatherForecastToQuery,
} from '../services/weatherToConditionsQuery';
import {
  templateFor,
  applyTemplateBody,
  applyTemplateTags,
} from '../services/journalTemplates';

type JournalEditParams = {
  JournalEdit: { mode: WaypointMode; entryId?: string; seed?: JournalSeed };
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a YYYY-MM-DD string by both shape and round-trip-through-Date.
 * "2026-13-40" matches the regex but isn't a real date — checking
 * `getMonth()` and `getDate()` round-trip catches that.
 */
function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map((p) => parseInt(p, 10));
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

/**
 * Parse a comma-separated tag string into a normalized array.
 * Trims whitespace, drops empties, dedupes case-insensitively while
 * keeping the user's first-seen casing.
 */
function parseTags(s: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of s.split(',')) {
    const t = raw.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function defaultOutcomeFor(mode: WaypointMode): JournalOutcome {
  // First entry in OUTCOMES_BY_MODE is curated as the most-common pick:
  // hunt → harvest, fish → catch, camp/hike → completed.
  return OUTCOMES_BY_MODE[mode][0];
}

export default function JournalEditScreen() {
  const route = useRoute<RouteProp<JournalEditParams, 'JournalEdit'>>();
  const navigation = useNavigation<any>();
  const { mode, entryId, seed: rawSeed } = route.params;
  // Defensive: route params can survive odd serialization through React
  // Navigation. isJournalSeed gates malformed inputs without crashing.
  const seed: JournalSeed | null = isJournalSeed(rawSeed) ? rawSeed : null;
  const {
    getEntry,
    addEntry,
    updateEntry,
    deleteEntry,
    hydrated,
  } = useJournalEntries();

  const isEdit = !!entryId;
  const existing: JournalEntry | null = useMemo(
    () => (entryId ? getEntry(entryId) : null),
    [entryId, getEntry],
  );

  // ── Form state ──────────────────────────────────────────────────────
  // Precedence (high → low): existing entry (edit) > seed (handoff) > defaults.
  const [entryDate, setEntryDate] = useState<string>(
    existing ? existing.entryDate : seed ? seed.entryDate : todayDateLabel(),
  );
  const [title, setTitle] = useState<string>(
    existing ? existing.title : seed ? seed.title : '',
  );
  const [body, setBody] = useState<string>(
    existing ? existing.body : seed ? seed.body : '',
  );
  const [outcome, setOutcome] = useState<JournalOutcome>(
    existing ? existing.outcome : seed ? seed.outcome : defaultOutcomeFor(mode),
  );
  const [locationLabel, setLocationLabel] = useState<string>(
    existing?.locationLabel ?? seed?.locationLabel ?? '',
  );
  const [tagText, setTagText] = useState<string>(
    existing
      ? existing.tags.join(', ')
      : seed
        ? seed.tags.join(', ')
        : '',
  );
  const [photoUris, setPhotoUris] = useState<string[]>(
    existing ? existing.photoUris : [],
  );
  // Weather
  const [tempF, setTempF] = useState<string>(
    existing?.weather?.temperatureF != null
      ? String(existing.weather.temperatureF)
      : '',
  );
  const [windMph, setWindMph] = useState<string>(
    existing?.weather?.windMph != null
      ? String(existing.weather.windMph)
      : '',
  );
  const [windDir, setWindDir] = useState<string>(
    existing?.weather?.windDirection ?? '',
  );
  const [conditions, setConditions] = useState<string>(
    existing?.weather?.conditions ?? '',
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // Phase A.21 — "Use Today's Weather" autofill state. Lazy-fetched on tap so
  // opening the editor never triggers a location-permission prompt for a
  // feature the user hasn't asked for. Mirrors A.14's ComparableConditions
  // pattern: GPS → weather.gov → first daytime period → WeatherQuery.
  const [weatherFilling, setWeatherFilling] = useState(false);
  const [weatherFillSource, setWeatherFillSource] = useState<string | null>(
    null,
  );

  // Re-seed form once context hydrates if this screen mounted before
  // storage finished loading.
  useEffect(() => {
    if (!isEdit) return;
    if (!hydrated) return;
    if (!existing) return;
    setEntryDate(existing.entryDate);
    setTitle(existing.title);
    setBody(existing.body);
    setOutcome(existing.outcome);
    setLocationLabel(existing.locationLabel ?? '');
    setTagText(existing.tags.join(', '));
    setPhotoUris(existing.photoUris);
    setTempF(
      existing.weather?.temperatureF != null
        ? String(existing.weather.temperatureF)
        : '',
    );
    setWindMph(
      existing.weather?.windMph != null
        ? String(existing.weather.windMph)
        : '',
    );
    setWindDir(existing.weather?.windDirection ?? '');
    setConditions(existing.weather?.conditions ?? '');
    setDirty(false);
  }, [hydrated, existing, isEdit]);

  const modeOutcomes = OUTCOMES_BY_MODE[mode];
  const dateOk = isValidIsoDate(entryDate);
  const canSave = dateOk && title.trim().length > 0 && !saving;

  // ── Handlers ────────────────────────────────────────────────────────
  const markDirty = () => {
    if (!dirty) setDirty(true);
  };

  const onPickOutcome = (o: JournalOutcome) => {
    setOutcome(o);
    markDirty();
  };

  const onAddPhoto = async () => {
    const uri = await pickPhoto();
    if (!uri) return;
    setPhotoUris((prev) => [...prev, uri]);
    markDirty();
  };

  const onRemovePhoto = (uri: string) => {
    Alert.alert(
      'Remove photo?',
      'The photo will be detached from this entry. The file on your device is not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPhotoUris((prev) => prev.filter((u) => u !== uri));
            markDirty();
          },
        },
      ],
    );
  };

  /**
   * Phase A.21 — One-tap autofill of today's weather into the four fields.
   * Lazily acquires GPS (so screen mount never triggers a perm prompt),
   * fetches the weather.gov forecast, picks today's first daytime period,
   * and pipes through the pure A.14 adapter to produce a WeatherQuery.
   *
   * Failures surface as a clear Alert; we never silently "succeed" with
   * partial data because that would invisibly degrade the user's data.
   * Marks the form dirty so the unsaved-changes guard fires correctly.
   */
  const onUseTodaysWeather = useCallback(async () => {
    setWeatherFilling(true);
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
      let touched = false;
      if (query.temperatureF !== undefined) {
        setTempF(String(Math.round(query.temperatureF)));
        touched = true;
      }
      if (query.windMph !== undefined) {
        setWindMph(String(Math.round(query.windMph)));
        touched = true;
      }
      if (query.windDirection) {
        setWindDir(query.windDirection);
        touched = true;
      }
      if (query.conditions) {
        setConditions(query.conditions);
        touched = true;
      }
      setWeatherFillSource(today?.name ? `Filled from ${today.name}` : null);
      if (touched) markDirty();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert(
        'Could not load weather',
        `${message}. You can fill the fields manually instead.`,
      );
    } finally {
      setWeatherFilling(false);
    }
  }, []);

  /**
   * Phase A.24 — One-tap insertion of an outcome-shaped journal template.
   * Resolves a template based on the currently-selected (mode, outcome),
   * pastes its prompt body into NOTES (preserving any existing user
   * content under a separator), and merges its suggested tags into TAGS
   * (case-insensitive dedupe, user casing wins). Marks dirty so the
   * unsaved-changes guard fires correctly.
   *
   * If the user already wrote substantial body text, we confirm before
   * pasting — the template is heading-prompts, not a full document, so
   * mixing it with finished narrative would be jarring even though we
   * preserve the original below the separator. The Alert's destructive
   * variant keeps "USE TEMPLATE" from being a footgun mid-write.
   */
  const onUseTemplate = useCallback(() => {
    const t = templateFor(mode, outcome);
    const apply = () => {
      setBody(applyTemplateBody(body, t));
      setTagText(applyTemplateTags(tagText, t));
      markDirty();
    };
    if (body.trim().length > 40) {
      Alert.alert(
        'Insert template?',
        `This will paste the "${t.label}" template at the top of your notes and keep your existing text below a separator. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Insert', onPress: apply },
        ],
      );
    } else {
      apply();
    }
  }, [mode, outcome, body, tagText]);

  const onCancel = () => {
    if (!dirty) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Discard changes?',
      'Your edits to this entry will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  /**
   * Build a JournalWeather object from the four optional inputs. Returns
   * `undefined` if the user left every field blank — we don't want to
   * persist an empty weather object that JSON-stringifies to `{}`.
   */
  const buildWeather = (): JournalWeather | undefined => {
    const out: JournalWeather = {};
    const tF = parseFloat(tempF);
    if (Number.isFinite(tF)) out.temperatureF = tF;
    const wM = parseFloat(windMph);
    if (Number.isFinite(wM)) out.windMph = wM;
    if (windDir.trim().length > 0) out.windDirection = windDir.trim().toUpperCase();
    if (conditions.trim().length > 0) out.conditions = conditions.trim();
    return Object.keys(out).length === 0 ? undefined : out;
  };

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const tags = parseTags(tagText);
      const weather = buildWeather();
      const trimmedLocation = locationLabel.trim();
      if (isEdit && entryId) {
        await updateEntry(entryId, {
          entryDate,
          title: title.trim(),
          body,
          outcome,
          tags,
          locationLabel: trimmedLocation.length > 0 ? trimmedLocation : undefined,
          weather,
          photoUris,
        });
      } else {
        await addEntry({
          entryDate,
          mode,
          title: title.trim(),
          body,
          outcome,
          tags,
          locationLabel: trimmedLocation.length > 0 ? trimmedLocation : undefined,
          weather,
          photoUris,
        });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save failed', String(err));
      setSaving(false);
    }
  };

  /**
   * Phase A.49 — share the saved entry as a portable .md file via the
   * iOS Share sheet. Only available in edit mode (a fresh-but-unsaved
   * draft has no canonical entry to serialize). If the entry has
   * unsaved edits, alert the user so they can save first — we don't
   * want to silently share an out-of-date snapshot.
   */
  const onShareMarkdown = useCallback(async () => {
    if (!isEdit || !existing) return;
    if (dirty) {
      Alert.alert(
        'Unsaved changes',
        'You have unsaved edits. Save before sharing so the markdown matches what\'s in the app.',
        [{ text: 'OK', style: 'cancel' }],
      );
      return;
    }
    try {
      await shareJournalEntryAsMarkdown(existing);
    } catch (err) {
      Alert.alert('Share failed', String(err));
    }
  }, [isEdit, existing, dirty]);

  const onDelete = () => {
    if (!isEdit || !entryId) return;
    Alert.alert(
      'Delete entry?',
      'This entry will be permanently removed from this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEntry(entryId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  // Guard: deep-linked into a stale entry id.
  if (isEdit && hydrated && !existing) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={16}>
            <Text style={styles.cancelText}>BACK</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Journal</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundTitle}>Entry not found</Text>
          <Text style={styles.notFoundBody}>
            This journal entry may have been deleted, or the link you
            followed is no longer valid.
          </Text>
        </View>
      </View>
    );
  }

  const previewColor = resolveOutcomeColor(outcome);
  const previewCode = resolveOutcomeLetterCode(outcome);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={16}>
          <Text style={styles.cancelText}>CANCEL</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Entry' : 'New Entry'}
        </Text>
        <Pressable onPress={onSave} hitSlop={16} disabled={!canSave}>
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            {saving ? 'SAVING…' : 'SAVE'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview row */}
        <View style={styles.previewRow}>
          <View style={[styles.previewBadge, { backgroundColor: previewColor }]}>
            <Text style={styles.previewBadgeText}>{previewCode}</Text>
          </View>
          <View style={styles.previewBody}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {title.trim() || 'Untitled Entry'}
            </Text>
            <Text style={styles.previewMeta} numberOfLines={1}>
              {JOURNAL_OUTCOME_META[outcome]?.label ?? outcome} · {mode.toUpperCase()} · {entryDate}
            </Text>
          </View>
        </View>

        {/* Date */}
        <Text style={styles.label}>DATE</Text>
        <TextInput
          style={[styles.input, !dateOk && styles.inputError]}
          value={entryDate}
          onChangeText={(v) => {
            setEntryDate(v);
            markDirty();
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={10}
        />
        {!dateOk && (
          <Text style={styles.helperError}>Use YYYY-MM-DD (e.g. 2026-04-22).</Text>
        )}

        {/* Title */}
        <Text style={styles.label}>TITLE</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            markDirty();
          }}
          placeholder="Sat morning sit, Cunningham"
          placeholderTextColor={Colors.textMuted}
          maxLength={100}
        />

        {/* Outcome chips */}
        <Text style={styles.label}>OUTCOME</Text>
        <View style={styles.chipGrid}>
          {modeOutcomes.map((o) => {
            const meta = JOURNAL_OUTCOME_META[o];
            const selected = o === outcome;
            const chipColor = meta?.color ?? Colors.mud;
            return (
              <Pressable
                key={o}
                onPress={() => onPickOutcome(o)}
                style={[
                  styles.chip,
                  selected && {
                    backgroundColor: chipColor,
                    borderColor: chipColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                  ]}
                >
                  {meta?.label ?? o}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Body */}
        <View style={styles.notesHeaderRow}>
          <Text style={styles.label}>NOTES</Text>
          <Pressable
            style={({ pressed }) => [
              styles.templateBtn,
              pressed && styles.templateBtnPressed,
            ]}
            onPress={onUseTemplate}
            accessibilityRole="button"
            accessibilityLabel="Insert a structured template based on the selected mode and outcome"
          >
            <Text style={styles.templateBtnText}>USE TEMPLATE</Text>
          </Pressable>
        </View>
        <Text style={styles.templateHint}>
          Pre-fills prompts for {mode.toUpperCase()} ·{' '}
          {JOURNAL_OUTCOME_META[outcome]?.label ?? outcome}.
        </Text>
        <TextInput
          style={[styles.input, styles.bodyInput]}
          value={body}
          onChangeText={(v) => {
            setBody(v);
            markDirty();
          }}
          placeholder="What happened? What did you see, hear, take, miss?"
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={5000}
          textAlignVertical="top"
        />

        {/* Location label */}
        <Text style={styles.label}>LOCATION (optional)</Text>
        <TextInput
          style={styles.input}
          value={locationLabel}
          onChangeText={(v) => {
            setLocationLabel(v);
            markDirty();
          }}
          placeholder="Cunningham Falls SP, north loop"
          placeholderTextColor={Colors.textMuted}
          maxLength={80}
        />

        {/* Tags */}
        <Text style={styles.label}>TAGS (comma separated)</Text>
        <TextInput
          style={styles.input}
          value={tagText}
          onChangeText={(v) => {
            setTagText(v);
            markDirty();
          }}
          placeholder="cold front, north wind, .270"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={300}
        />

        {/* Weather (all optional) */}
        <View style={styles.weatherHeaderRow}>
          <Text style={styles.label}>WEATHER (optional)</Text>
          <Pressable
            style={({ pressed }) => [
              styles.weatherFillBtn,
              (weatherFilling || pressed) && styles.weatherFillBtnPressed,
            ]}
            onPress={onUseTodaysWeather}
            disabled={weatherFilling}
            accessibilityRole="button"
            accessibilityLabel="Use today's weather to autofill the weather fields"
          >
            {weatherFilling ? (
              <ActivityIndicator size="small" color={Colors.mdGold} />
            ) : (
              <Text style={styles.weatherFillBtnText}>USE TODAY'S WEATHER</Text>
            )}
          </Pressable>
        </View>
        {weatherFillSource ? (
          <Text style={styles.weatherFillSource}>{weatherFillSource}</Text>
        ) : null}
        <View style={styles.weatherRow}>
          <View style={styles.weatherCol}>
            <Text style={styles.weatherLabel}>°F</Text>
            <TextInput
              style={styles.weatherInput}
              value={tempF}
              onChangeText={(v) => {
                setTempF(v);
                markDirty();
              }}
              placeholder="42"
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
              onChangeText={(v) => {
                setWindMph(v);
                markDirty();
              }}
              placeholder="8"
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
              onChangeText={(v) => {
                setWindDir(v);
                markDirty();
              }}
              placeholder="NW"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={3}
            />
          </View>
        </View>
        <TextInput
          style={[styles.input, styles.weatherCondition]}
          value={conditions}
          onChangeText={(v) => {
            setConditions(v);
            markDirty();
          }}
          placeholder="Conditions: clear, light frost on grass"
          placeholderTextColor={Colors.textMuted}
          maxLength={120}
        />

        {/* Photos */}
        <Text style={styles.label}>PHOTOS</Text>
        <View style={styles.photoRow}>
          {photoUris.map((uri) => (
            <Pressable
              key={uri}
              onPress={() => onRemovePhoto(uri)}
              style={styles.photoThumbWrap}
            >
              <Image source={{ uri }} style={styles.photoThumb} />
            </Pressable>
          ))}
          <Pressable style={styles.addPhotoBtn} onPress={onAddPhoto}>
            <Text style={styles.addPhotoText}>+ ADD PHOTO</Text>
          </Pressable>
        </View>

        {/* Star toggle (edit mode only — entry must exist before pinning) */}
        {isEdit && entryId ? (
          <FavoriteStarButton kind="journal" id={entryId} />
        ) : null}

        {/* Phase A.49 — Share as Markdown (edit mode only — needs a
            saved canonical entry to serialize). Sits above DELETE so
            the safe action precedes the destructive one. Tap → iOS
            Share sheet with a .md file the user can email, drop into
            Notes, or save to Files. */}
        {isEdit && (
          <Pressable
            style={styles.shareBtn}
            onPress={() => void onShareMarkdown()}
            accessibilityRole="button"
            accessibilityLabel="Share this entry as a markdown file"
          >
            <Text style={styles.shareBtnText}>SHARE AS MARKDOWN</Text>
          </Pressable>
        )}

        {/* Delete (edit mode only) */}
        {isEdit && (
          <Pressable style={styles.deleteBtn} onPress={onDelete}>
            <Text style={styles.deleteBtnText}>DELETE ENTRY</Text>
          </Pressable>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: Colors.mud,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    width: 60,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.0,
  },
  saveText: {
    color: Colors.mdGold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    width: 60,
    textAlign: 'right',
  },
  saveTextDisabled: {
    color: Colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  previewBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewBadgeText: {
    color: Colors.textOnAccent,
    fontSize: 12,
    fontWeight: '800',
  },
  previewBody: {
    flex: 1,
  },
  previewTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  previewMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.0,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  helperError: {
    color: Colors.danger,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
  bodyInput: {
    minHeight: 120,
    paddingVertical: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 18,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: Colors.textOnAccent,
  },
  weatherHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  templateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.amber,
    backgroundColor: Colors.surface,
    minWidth: 110,
    alignItems: 'center',
  },
  templateBtnPressed: {
    opacity: 0.6,
  },
  templateBtnText: {
    color: Colors.amber,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  templateHint: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: -4,
    marginBottom: 6,
    marginLeft: 2,
  },
  weatherFillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.mdGold,
    backgroundColor: Colors.surface,
    minWidth: 110,
    alignItems: 'center',
  },
  weatherFillBtnPressed: {
    opacity: 0.6,
  },
  weatherFillBtnText: {
    color: Colors.mdGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  weatherFillSource: {
    color: Colors.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 6,
    marginLeft: 2,
  },
  weatherRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  weatherCol: {
    flex: 1,
  },
  weatherLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
    marginLeft: 2,
  },
  weatherInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
  weatherCondition: {
    marginTop: 2,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  addPhotoText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  shareBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mdGold,
    alignItems: 'center',
  },
  shareBtnText: {
    color: Colors.mdGold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.danger,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  notFoundWrap: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  notFoundBody: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
