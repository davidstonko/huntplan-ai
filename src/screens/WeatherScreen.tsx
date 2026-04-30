/**
 * WeatherScreen — Unified, safety-focused weather view for MDHuntFishOutdoors.
 *
 * Accepts a location (lat/lon + optional label) via route params. Renders:
 *   - Current conditions block (temp, wind, short forecast)
 *   - 7-day forecast scroller
 *   - Four toggleable safety overlays:
 *       \u00B7 Lightning & Severe (default ON, can turn off)
 *       \u00B7 NWS Alerts (default OFF, can turn on)
 *       \u00B7 Marine / Water Safety (default OFF, auto-ON for fish mode)
 *       \u00B7 Hunter Metrics (default ON for hunt, OFF for fish)
 *
 * Toggle state is sourced from SettingsContext and overlay auto-on rules
 * from useEffectiveWeatherSafety. Per-visit changes are local and don't
 * mutate defaults (users change defaults in SettingsScreen).
 *
 * Built 2026-04-17 for V2.2.0.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Colors from '../theme/colors';
import weatherService, {
  type WeatherForecast,
  type WeatherAlert,
  type LightningStatus,
  type MarineConditions,
} from '../services/weatherService';
import { getSolunarData, type SolunarData } from '../services/solunarService';
import { useActivityMode } from '../context/ActivityModeContext';
import { useEffectiveWeatherSafety } from '../context/SettingsContext';
import { isValidCoord } from '../utils/validateCoord';

type WeatherRouteParams = {
  Weather: {
    lat: number;
    lon: number;
    label?: string;
  };
};

// Fallback to Annapolis, MD (State House) if coords missing
const FALLBACK_LAT = 38.978;
const FALLBACK_LON = -76.49;
const FALLBACK_LABEL = 'Annapolis, MD';

export default function WeatherScreen() {
  const route = useRoute<RouteProp<WeatherRouteParams, 'Weather'>>();
  const navigation = useNavigation<any>();
  const { activeMode } = useActivityMode();
  const effectivePrefs = useEffectiveWeatherSafety(activeMode);

  const lat = isValidCoord(route.params?.lat, route.params?.lon)
    ? route.params!.lat
    : FALLBACK_LAT;
  const lon = isValidCoord(route.params?.lat, route.params?.lon)
    ? route.params!.lon
    : FALLBACK_LON;
  const label = route.params?.label || FALLBACK_LABEL;

  // Per-session overlay overrides (start from the effective prefs)
  const [showLightning, setShowLightning] = useState(effectivePrefs.lightning);
  const [showAlerts, setShowAlerts] = useState(effectivePrefs.alerts);
  const [showMarine, setShowMarine] = useState(effectivePrefs.marine);
  const [showHunterMetrics, setShowHunterMetrics] = useState(effectivePrefs.hunterMetrics);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [lightning, setLightning] = useState<LightningStatus | null>(null);
  const [marine, setMarine] = useState<MarineConditions | null>(null);
  const [solunar, setSolunar] = useState<SolunarData | null>(null);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        // Core forecast always loads
        const forecastPromise = weatherService.getForecast(lat, lon);
        const alertsPromise = showAlerts ? weatherService.getAlerts(lat, lon) : Promise.resolve([]);
        const lightningPromise = showLightning
          ? weatherService.getLightningStatus(lat, lon)
          : Promise.resolve(null);
        const marinePromise = showMarine
          ? weatherService.getMarineConditions(lat, lon)
          : Promise.resolve(null);
        // Solunar / legal shooting hours (hunt mode only) — degrades
        // gracefully via getLocalSolunarData if backend unavailable.
        const solunarPromise =
          activeMode === 'hunt'
            ? getSolunarData(lat, lon).catch(() => null)
            : Promise.resolve(null);

        const [f, a, l, m, s] = await Promise.all([
          forecastPromise,
          alertsPromise,
          lightningPromise,
          marinePromise,
          solunarPromise,
        ]);
        setForecasts(f);
        setAlerts(a);
        setLightning(l);
        setMarine(m);
        setSolunar(s);
      } catch (err) {
        console.warn('[WeatherScreen] Load failed:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [lat, lon, showAlerts, showLightning, showMarine, activeMode],
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const current = forecasts[0];
  const tonight = forecasts[1];

  const weeklyDays = useMemo(() => {
    // Group forecasts into day/night pairs, show up to 7 days
    return forecasts.slice(0, 14);
  }, [forecasts]);

  // Humidity is not on the NWS /forecast payload today — marine endpoint
  // occasionally carries it, but we don't rely on it. The safety advisory
  // falls back to parsing the detailed forecast string and to wind chill.
  const safetyAdvisory = useMemo(
    () => computeSafetyAdvisory(current, null),
    [current],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAll(true)}
          tintColor={Colors.tan}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'\u2039'}</Text>
        </TouchableOpacity>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.headerSubtitle}>
            {lat.toFixed(3)}, {lon.toFixed(3)}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.tan} />
          <Text style={styles.loadingText}>Loading weather...</Text>
        </View>
      ) : forecasts.length === 0 ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Unable to load weather</Text>
          <Text style={styles.errorText}>
            NOAA weather.gov is unavailable or your device is offline. Pull down to retry.
          </Text>
        </View>
      ) : (
        <>
          {/* Safety banner (hypothermia / heat-stress / etc.) */}
          {safetyAdvisory ? <SafetyBanner advisory={safetyAdvisory} /> : null}

          {/* Current conditions */}
          <View style={styles.currentCard}>
            <Text style={styles.currentTemp}>
              {current?.temperature}
              {'\u00B0'}
              {current?.temperatureUnit}
            </Text>
            <Text style={styles.currentCondition}>{current?.shortForecast}</Text>
            <View style={styles.currentRow}>
              <View style={styles.currentMetric}>
                <Text style={styles.currentMetricLabel}>WIND</Text>
                <Text style={styles.currentMetricValue}>
                  {current?.windSpeed} {current?.windDirection}
                </Text>
              </View>
              {tonight ? (
                <View style={styles.currentMetric}>
                  <Text style={styles.currentMetricLabel}>TONIGHT</Text>
                  <Text style={styles.currentMetricValue}>
                    {tonight.temperature}
                    {'\u00B0'} {tonight.shortForecast.substring(0, 20)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.detailedText}>{current?.detailedForecast}</Text>
          </View>

          {/* Safety overlay toggles */}
          <View style={styles.overlayCard}>
            <Text style={styles.sectionTitle}>Safety Overlays</Text>
            <OverlayToggle
              icon={'\u26A1'}
              label="Lightning & Severe"
              value={showLightning}
              onChange={setShowLightning}
              color="#E8AA00"
            />
            <OverlayToggle
              icon={'\uD83D\uDD14'}
              label="NWS Weather Alerts"
              value={showAlerts}
              onChange={setShowAlerts}
              color="#E03C31"
            />
            <OverlayToggle
              icon={'\uD83C\uDF0A'}
              label="Water / Marine Safety"
              value={showMarine}
              onChange={setShowMarine}
              color="#0277BD"
            />
            <OverlayToggle
              icon={'\uD83E\uDD8C'}
              label="Hunter Metrics"
              value={showHunterMetrics}
              onChange={setShowHunterMetrics}
              color="#4A6741"
            />
            <Text style={styles.overlayNote}>
              Defaults can be changed in Settings {'\u2192'} Weather & Safety.
            </Text>
          </View>

          {/* NWS Alerts */}
          {showAlerts ? (
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>
                {'\uD83D\uDD14'} NWS Alerts
                {alerts.length > 0 ? ` (${alerts.length})` : ''}
              </Text>
              {alerts.length === 0 ? (
                <Text style={styles.panelEmpty}>No active alerts for this location.</Text>
              ) : (
                alerts.map((a) => (
                  <View key={a.id} style={[styles.alertRow, styles[`severity_${a.severity}`]]}>
                    <Text style={styles.alertEvent}>{a.event}</Text>
                    <Text style={styles.alertHeadline}>{a.headline}</Text>
                    <Text style={styles.alertArea}>{a.areaDesc}</Text>
                    {a.description ? (
                      <Text style={styles.alertDesc} numberOfLines={4}>
                        {a.description}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          ) : null}

          {/* Lightning / convective */}
          {showLightning ? (
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>{'\u26A1'} Lightning & Severe Risk</Text>
              {lightning ? (
                <>
                  <View style={styles.metricGrid}>
                    <MetricBox
                      label="Convective Risk"
                      value={lightning.convectiveRisk.toUpperCase()}
                      accent={convectiveColor(lightning.convectiveRisk)}
                    />
                    <MetricBox
                      label="Nearest Strike"
                      value={
                        lightning.distanceNearestMiles != null
                          ? `${lightning.distanceNearestMiles} mi`
                          : '\u2014'
                      }
                    />
                    <MetricBox
                      label="Strikes (15 min)"
                      value={
                        lightning.nearbyStrikesLast15min != null
                          ? String(lightning.nearbyStrikesLast15min)
                          : '\u2014'
                      }
                    />
                  </View>
                  <Text style={styles.advisoryText}>{lightning.advisory}</Text>
                  <Text style={styles.panelHint}>
                    Seek shelter immediately if you can hear thunder. Wait 30 minutes after the
                    last thunder before resuming outdoor activity.
                  </Text>
                </>
              ) : (
                <Text style={styles.panelEmpty}>Lightning data is loading...</Text>
              )}
            </View>
          ) : null}

          {/* Marine / Water */}
          {showMarine ? (
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>{'\uD83C\uDF0A'} Water / Marine Safety</Text>
              {marine ? (
                <>
                  <View style={styles.metricGrid}>
                    <MetricBox
                      label="Wave Height"
                      value={marine.waveHeightFt != null ? `${marine.waveHeightFt} ft` : '\u2014'}
                    />
                    <MetricBox
                      label="Water Temp"
                      value={
                        marine.waterTempF != null ? `${marine.waterTempF}\u00B0F` : '\u2014'
                      }
                    />
                    <MetricBox
                      label="Wind"
                      value={
                        marine.windSpeedMph != null
                          ? `${marine.windSpeedMph} mph ${marine.windDirection || ''}`
                          : '\u2014'
                      }
                    />
                    <MetricBox
                      label="Tide"
                      value={
                        marine.tideStage === 'unknown'
                          ? '\u2014'
                          : marine.tideStage.charAt(0).toUpperCase() + marine.tideStage.slice(1)
                      }
                    />
                  </View>
                  {marine.smallCraftAdvisory ? (
                    <View style={styles.warnBox}>
                      <Text style={styles.warnText}>{'\u26A0'} Small Craft Advisory in effect</Text>
                    </View>
                  ) : null}
                  <Text style={styles.advisoryText}>{marine.advisory}</Text>
                  {marine.nextTideTime && marine.nextTideType ? (
                    <Text style={styles.panelHint}>
                      Next {marine.nextTideType}: {new Date(marine.nextTideTime).toLocaleTimeString()}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.panelEmpty}>Marine data loading...</Text>
              )}
            </View>
          ) : null}

          {/* Hunter Metrics */}
          {showHunterMetrics && activeMode === 'hunt' ? (
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>{'\uD83E\uDD8C'} Hunter Metrics</Text>
              <View style={styles.metricGrid}>
                <MetricBox
                  label="Deer Activity"
                  value={scoreForecast(current)}
                  accent={Colors.moss}
                />
                <MetricBox label="Wind Suitability" value={windSuitability(current)} />
                <MetricBox label="Best Window" value={bestWindow(current)} />
              </View>
              <Text style={styles.panelHint}>
                Heuristic based on temp, wind, and short-forecast keywords. Pair with the in-app
                Solunar data for more detail.
              </Text>
            </View>
          ) : null}

          {/* Solunar + Legal Shooting Hours (hunt mode) */}
          {activeMode === 'hunt' && solunar ? (
            <View style={styles.solunarCard}>
              <Text style={styles.panelTitle}>
                {'\uD83C\uDF19'} Solunar & Legal Shooting Hours
              </Text>
              <View style={styles.solunarShootingHoursBox}>
                <Text style={styles.solunarShootingHoursLabel}>
                  Legal Shooting Hours (MD DNR)
                </Text>
                <Text style={styles.solunarShootingHoursValue}>
                  {formatTimeLabel(solunar.sun.legal_start)}
                  {'\u2002\u2192\u2002'}
                  {formatTimeLabel(solunar.sun.legal_end)}
                </Text>
                <Text style={styles.solunarSub}>
                  MD DNR defines legal hours as 30 min before sunrise to 30 min after sunset.
                  Verify any species-specific exceptions in the current regulations booklet.
                </Text>
              </View>
              <View style={styles.solunarRow}>
                <View style={styles.solunarCol}>
                  <Text style={styles.solunarLabel}>SUNRISE</Text>
                  <Text style={styles.solunarValue}>
                    {formatTimeLabel(solunar.sun.sunrise)}
                  </Text>
                </View>
                <View style={styles.solunarCol}>
                  <Text style={styles.solunarLabel}>SUNSET</Text>
                  <Text style={styles.solunarValue}>
                    {formatTimeLabel(solunar.sun.sunset)}
                  </Text>
                </View>
              </View>
              <View style={styles.solunarRow}>
                <View style={styles.solunarCol}>
                  <Text style={styles.solunarLabel}>MOON</Text>
                  <Text style={styles.solunarValue}>{solunar.moon.phase_name}</Text>
                  <Text style={styles.solunarSub}>
                    {Math.round(solunar.moon.illumination_pct)}% illuminated
                  </Text>
                </View>
                <View style={styles.solunarCol}>
                  <Text style={styles.solunarLabel}>ACTIVITY RATING</Text>
                  <Text
                    style={[
                      styles.solunarValue,
                      { color: ratingColor(solunar.rating.label) },
                    ]}
                  >
                    {solunar.rating.label}
                  </Text>
                  <Text style={styles.solunarSub}>
                    Score {solunar.rating.score}
                  </Text>
                </View>
              </View>
              {solunar.best_times.length > 0 ? (
                <>
                  <Text style={[styles.solunarLabel, { marginTop: 6 }]}>
                    BEST WINDOWS
                  </Text>
                  {solunar.best_times.slice(0, 3).map((w, i) => (
                    <Text key={i} style={styles.solunarSub}>
                      {'\u2022'} {w.window}: {formatTimeLabel(w.start)}
                      {'\u2013'}
                      {formatTimeLabel(w.end)}
                      {w.priority === 'high' ? ` (${w.priority})` : ''}
                    </Text>
                  ))}
                </>
              ) : null}
              <Text style={styles.panelHint}>
                Solunar predictions are heuristic and should be combined with observed sign on
                the ground. Shooting hours reflect the standard MD DNR rule; special seasons
                (e.g. Sunday hunting) may narrow this window further.
              </Text>
            </View>
          ) : null}

          {/* 7-day forecast */}
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>7-Day Forecast</Text>
            {weeklyDays.map((p, idx) => (
              <View key={`${p.name}-${idx}`} style={styles.forecastRow}>
                <View style={styles.forecastLeft}>
                  <Text style={styles.forecastName}>{p.name}</Text>
                  <Text style={styles.forecastShort}>{p.shortForecast}</Text>
                </View>
                <View style={styles.forecastRight}>
                  <Text style={styles.forecastTemp}>
                    {p.temperature}
                    {'\u00B0'}
                  </Text>
                  <Text style={styles.forecastWind}>
                    {p.windSpeed} {p.windDirection}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.footerDisclaimer}>
            Weather data from NOAA weather.gov. Safety overlays are advisory only — never rely
            on a single source. Tune in to NOAA Weather Radio (162.400–162.550 MHz) in areas with
            poor cell coverage. In emergencies, call 911.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function OverlayToggle({
  icon,
  label,
  value,
  onChange,
  color,
}: {
  icon: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleIcon}>{icon}</Text>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.mud, true: color }}
        thumbColor={Colors.textPrimary}
      />
    </View>
  );
}

function MetricBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

/**
 * Heat Index using the NOAA Rothfusz regression.
 * Returns null if tempF < 80 or humidity is unknown (formula is only valid in heat).
 * https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
 *
 * Humidity may be null; in that case we also accept a pre-parsed heat-index
 * value (often embedded in NWS detailedForecast, e.g. "Heat index values as
 * high as 101"), and we return whichever is defined, preferring the computed
 * value when humidity is known.
 */
function computeHeatIndex(
  tempF: number,
  humidityPct: number | null,
  parsedHI: number | null = null,
): number | null {
  if (tempF < 80) return null;
  if (humidityPct == null) return parsedHI;
  const T = tempF;
  const R = humidityPct;
  let HI =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;
  // Low-humidity / very-high-temp adjustments
  if (R < 13 && T >= 80 && T <= 112) {
    HI -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  } else if (R > 85 && T >= 80 && T <= 87) {
    HI += ((R - 85) / 10) * ((87 - T) / 5);
  }
  return Math.round(HI);
}

/**
 * Pull a heat-index number from NWS detailedForecast text if present.
 * Matches patterns like:
 *   "Heat index values as high as 101."
 *   "heat index around 98"
 *   "Heat index near 96"
 */
function parseHeatIndexFromDetailed(detailed: string | undefined): number | null {
  if (!detailed) return null;
  const m = detailed.match(/heat\s*index[^0-9]{0,30}(\d{2,3})/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return isNaN(n) ? null : n;
}

/**
 * Wind Chill (NWS formula, valid for T <= 50 F and wind > 3 mph).
 * Returns null if out of valid range.
 * https://www.weather.gov/safety/cold-wind-chill-chart
 */
function computeWindChill(tempF: number, windMph: number): number | null {
  if (tempF > 50 || windMph <= 3) return null;
  const V = Math.pow(windMph, 0.16);
  const WC = 35.74 + 0.6215 * tempF - 35.75 * V + 0.4275 * tempF * V;
  return Math.round(WC);
}

/**
 * Parse windSpeed string like "10 mph", "5 to 15 mph", "NW 10 mph" into a number (max of range).
 */
function parseWindMph(windSpeed: string | undefined): number {
  if (!windSpeed) return 0;
  const matches = windSpeed.match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  return Math.max(...matches.map((s) => parseInt(s, 10)));
}

type SafetyLevel = 'red' | 'amber' | 'gray';
type SafetyAdvisory = {
  level: SafetyLevel;
  title: string;
  body: string;
};

/**
 * Classify the current conditions into a safety advisory, if any.
 * Returns null if conditions are within normal range.
 */
function computeSafetyAdvisory(
  p: WeatherForecast | undefined,
  humidityPct: number | null,
): SafetyAdvisory | null {
  if (!p) return null;
  const windMph = parseWindMph(p.windSpeed);
  const wc = computeWindChill(p.temperature, windMph);
  const parsedHI = parseHeatIndexFromDetailed(p.detailedForecast);
  const hi = computeHeatIndex(p.temperature, humidityPct, parsedHI);

  // Cold-side severity
  if (wc != null && wc < 0) {
    return {
      level: 'red',
      title: `Hypothermia risk \u2014 wind chill ${wc}\u00B0F`,
      body: 'Exposed skin can develop frostbite in under 30 minutes. Layer with wind-blocking shells, cover extremities, and limit time in the open. Carry dry spare gloves and a heat source.',
    };
  }
  if (p.temperature <= 32 && windMph >= 15) {
    return {
      level: 'amber',
      title: 'Cold exposure caution',
      body: 'Sustained wind in freezing temperatures accelerates heat loss. Wear wind-blocking layers and plan shorter stand/outing windows.',
    };
  }

  // Heat-side severity
  if (hi != null && hi >= 103) {
    return {
      level: 'red',
      title: `Extreme heat \u2014 heat index ${hi}\u00B0F`,
      body: 'Heat stroke is likely with prolonged exposure or exertion. Move activities to early morning or late evening, carry 1+ liter of water per hour, and monitor for dizziness, cramps, or nausea.',
    };
  }
  if (hi != null && hi >= 95) {
    return {
      level: 'amber',
      title: `Heat stress risk \u2014 heat index ${hi}\u00B0F`,
      body: 'Cramps and heat exhaustion are possible with exertion. Hydrate aggressively, take shaded breaks, and watch for early warning signs.',
    };
  }
  if (wc != null && wc < 20) {
    return {
      level: 'gray',
      title: `Cold caution \u2014 wind chill ${wc}\u00B0F`,
      body: 'Layer appropriately and keep hand-warmers accessible.',
    };
  }
  if (hi != null && hi >= 85) {
    return {
      level: 'gray',
      title: `Warm conditions \u2014 heat index ${hi}\u00B0F`,
      body: 'Stay hydrated and take shaded breaks where possible.',
    };
  }
  return null;
}

function SafetyBanner({ advisory }: { advisory: SafetyAdvisory }) {
  const bg =
    advisory.level === 'red'
      ? '#6B2F2F'
      : advisory.level === 'amber'
        ? '#6B4F1F'
        : '#2F3A2F';
  const accent =
    advisory.level === 'red' ? '#E03C31' : advisory.level === 'amber' ? '#E8AA00' : '#AAAA22';
  const iconText = advisory.level === 'red' ? '\u26A0' : advisory.level === 'amber' ? '\u26A0' : '\u2139';
  return (
    <View style={[styles.safetyBanner, { backgroundColor: bg, borderLeftColor: accent }]}>
      <Text style={styles.safetyBannerIcon}>{iconText}</Text>
      <View style={styles.safetyBannerBody}>
        <Text style={styles.safetyBannerTitle}>{advisory.title}</Text>
        <Text style={styles.safetyBannerText}>{advisory.body}</Text>
      </View>
    </View>
  );
}

function convectiveColor(risk: LightningStatus['convectiveRisk']): string {
  switch (risk) {
    case 'extreme':
      return '#E03C31';
    case 'high':
      return '#E56A1A';
    case 'moderate':
      return '#E8AA00';
    case 'low':
      return '#AAAA22';
    default:
      return Colors.moss;
  }
}

function scoreForecast(p?: WeatherForecast): string {
  if (!p) return '\u2014';
  let score = 5;
  if (p.temperature >= 30 && p.temperature <= 50) score += 2;
  if (p.temperature > 70) score -= 1;
  if (p.shortForecast.toLowerCase().includes('rain')) score += 1;
  score = Math.max(1, Math.min(10, score));
  return `${score}/10`;
}

function windSuitability(p?: WeatherForecast): string {
  if (!p) return '\u2014';
  const mph = parseInt(p.windSpeed, 10);
  if (isNaN(mph)) return 'Unknown';
  if (mph < 8) return 'Excellent';
  if (mph < 15) return 'Good';
  if (mph < 22) return 'Fair';
  return 'Challenging';
}

function bestWindow(p?: WeatherForecast): string {
  if (!p) return '\u2014';
  if (p.temperature > 60) return 'Dawn/Dusk';
  if (p.temperature < 25) return 'Midday OK';
  return 'Dawn/Dusk';
}

/**
 * Format either an ISO datetime ("2026-04-17T06:33:00-04:00") or a local
 * "HH:MM" string into a friendly 12-hour label. Returns the original input
 * if parsing fails so we never render NaN to the user.
 */
function formatTimeLabel(input: string | undefined | null): string {
  if (!input) return '\u2014';
  // Already looks like HH:MM — try that path first
  const short = input.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (short) {
    const h = parseInt(short[1], 10);
    const m = short[2];
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${m} ${period}`;
  }
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ratingColor(label: string): string {
  switch (label) {
    case 'Excellent':
      return '#7FC97F';
    case 'Good':
      return '#BBD38B';
    case 'Fair':
      return '#E8AA00';
    case 'Poor':
      return '#E56A1A';
    default:
      return Colors.textPrimary;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingTop: 56,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.mud,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backText: { color: Colors.textPrimary, fontSize: 22, marginTop: -2 },
  headerBody: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  loadingBox: { padding: 32, alignItems: 'center' },
  loadingText: { marginTop: 12, color: Colors.textMuted, fontSize: 13 },
  errorBox: { padding: 32, alignItems: 'center' },
  errorTitle: { fontSize: 16, fontWeight: '700', color: Colors.mdRed, marginBottom: 8 },
  errorText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  currentCard: {
    backgroundColor: Colors.surfaceElevated,
    margin: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  currentTemp: {
    fontSize: 54,
    fontWeight: '200',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  currentCondition: {
    fontSize: 16,
    color: Colors.mdGold,
    marginBottom: 14,
    fontWeight: '600',
  },
  currentRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  currentMetric: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  currentMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  currentMetricValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  detailedText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  overlayCard: {
    backgroundColor: Colors.surfaceElevated,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleIcon: { fontSize: 20, marginRight: 12 },
  toggleLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  overlayNote: { fontSize: 11, color: Colors.textMuted, marginTop: 8, fontStyle: 'italic' },
  panelCard: {
    backgroundColor: Colors.surfaceElevated,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  panelEmpty: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  panelHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 10,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metricBox: {
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    flexGrow: 1,
    minWidth: '30%',
    marginRight: 8,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  metricValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  advisoryText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginBottom: 4 },
  warnBox: {
    backgroundColor: '#6B2F2F',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  warnText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  alertRow: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  severity_Extreme: { borderLeftColor: '#E03C31' },
  severity_Severe: { borderLeftColor: '#E56A1A' },
  severity_Moderate: { borderLeftColor: '#E8AA00' },
  severity_Minor: { borderLeftColor: '#AAAA22' },
  severity_Unknown: { borderLeftColor: Colors.mud },
  alertEvent: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
  alertHeadline: { fontSize: 12, color: Colors.mdGold, marginBottom: 4 },
  alertArea: { fontSize: 10, color: Colors.textMuted, marginBottom: 6 },
  alertDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  forecastLeft: { flex: 1 },
  forecastName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  forecastShort: { fontSize: 11, color: Colors.textMuted },
  forecastRight: { alignItems: 'flex-end' },
  forecastTemp: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  forecastWind: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  footerDisclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    padding: 16,
    lineHeight: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  safetyBanner: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  safetyBannerIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
    marginRight: 10,
    marginTop: 1,
  },
  safetyBannerBody: { flex: 1 },
  safetyBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  safetyBannerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  solunarCard: {
    backgroundColor: Colors.surfaceElevated,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  solunarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  solunarCol: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  solunarLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  solunarValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  solunarSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  solunarShootingHoursBox: {
    backgroundColor: '#2F3A2F',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.mdGold,
  },
  solunarShootingHoursLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.mdGold,
    marginBottom: 4,
  },
  solunarShootingHoursValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
