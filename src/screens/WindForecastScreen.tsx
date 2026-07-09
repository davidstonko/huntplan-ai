/**
 * WindForecastScreen — 7-day wind outlook + "which stand when" planner.
 *
 * Two parts:
 *  1. A 7-day wind outlook (direction / speed / temp / sky) from NOAA — useful
 *     to every hunter, no setup required.
 *  2. A per-period stand recommendation that reads each saved stand's
 *     `idealWindDirections` and tells you which stand the forecast wind favors
 *     on each upcoming day. This is the piece competitors (HuntStand) paywall.
 *
 * Offline-safe: weatherService.getForecast() returns [] on failure, and we show
 * a clear "needs a connection" state rather than a blank screen.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Colors from '../theme/colors';
import weatherService from '../services/weatherService';
import { useScoutData } from '../context/ScoutDataContext';
import {
  toWindPeriods,
  buildStandWindPlan,
  rankStandsForPeriod,
  favorabilityLabel,
  type WindPeriod,
  type WindFavorability,
  type PlannerStand,
} from '../services/windCalendarService';

const MD_LAT = 39.0458; // Maryland centroid (approx)
const MD_LNG = -76.6413;

function favorabilityColor(f: WindFavorability): string {
  switch (f) {
    case 'ideal':
      return Colors.success;
    case 'marginal':
      return Colors.warning;
    case 'poor':
      return Colors.danger;
    default:
      return Colors.textMuted;
  }
}

function WindOutlookRow({ period }: { period: WindPeriod }) {
  return (
    <View style={[styles.row, !period.isDaytime && styles.rowNight]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowName}>{period.name}</Text>
        <Text style={styles.rowSky} numberOfLines={1}>
          {period.shortForecast}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowWind}>
          {period.cardinal ?? period.rawDirection ?? '—'}
          <Text style={styles.rowWindMph}>
            {' '}
            {period.windMph ? `${period.windMph} mph` : 'calm'}
          </Text>
        </Text>
        <Text style={styles.rowTemp}>
          {period.temperature}°{period.temperatureUnit}
        </Text>
      </View>
    </View>
  );
}

function StandPlanCard({
  period,
  ranked,
}: {
  period: WindPeriod;
  ranked: { stand: PlannerStand; favorability: WindFavorability }[];
}) {
  return (
    <View style={styles.planCard}>
      <View style={styles.planHead}>
        <Text style={styles.planPeriod}>{period.name}</Text>
        <Text style={styles.planWind}>
          Wind {period.cardinal ?? period.rawDirection}
          {period.windMph ? ` · ${period.windMph} mph` : ''}
        </Text>
      </View>
      {ranked.length === 0 ? (
        <Text style={styles.planNone}>No saved stand favors this wind.</Text>
      ) : (
        ranked.map(({ stand, favorability }) => (
          <View key={stand.id} style={styles.planStandRow}>
            <View
              style={[styles.dot, { backgroundColor: favorabilityColor(favorability) }]}
            />
            <Text style={styles.planStandName} numberOfLines={1}>
              {stand.label}
            </Text>
            <Text
              style={[styles.planStandTag, { color: favorabilityColor(favorability) }]}
            >
              {favorabilityLabel(favorability)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function WindForecastScreen() {
  const { plans } = useScoutData();
  const [periods, setPeriods] = useState<WindPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  // Pull every saved stand that has ideal wind directions set.
  const stands: PlannerStand[] = useMemo(() => {
    const out: PlannerStand[] = [];
    for (const plan of plans) {
      for (const wp of plan.waypoints) {
        const dirs = wp.standDetails?.idealWindDirections;
        if (dirs && dirs.length > 0) {
          out.push({ id: wp.id, label: wp.label || 'Unnamed stand', idealWindDirections: dirs });
        }
      }
    }
    return out;
  }, [plans]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const forecasts = await weatherService.getForecast(MD_LAT, MD_LNG);
      if (cancelled) return;
      setPeriods(toWindPeriods(forecasts));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const daytimePeriods = useMemo(() => periods.filter((p) => p.isDaytime), [periods]);
  const plan = useMemo(() => buildStandWindPlan(stands, periods), [stands, periods]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wind Forecast</Text>
        <Text style={styles.headerSub}>
          7-day wind outlook for the Maryland region, plus which of your stands the
          wind favors each day. Wind shown is the direction it blows from.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Colors.moss} />
          <Text style={styles.loadingText}>Loading NOAA wind forecast…</Text>
        </View>
      ) : periods.length === 0 ? (
        <View style={styles.offlineCard}>
          <Text style={styles.offlineTitle}>Wind forecast needs a connection</Text>
          <Text style={styles.offlineText}>
            The 7-day wind forecast comes from NOAA and can’t be downloaded offline.
            Try again when you’re back in signal.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionHeader}>7-DAY WIND OUTLOOK</Text>
          {periods.map((p, i) => (
            <WindOutlookRow key={`${p.name}-${i}`} period={p} />
          ))}

          <Text style={styles.sectionHeader}>WHICH STAND WHEN</Text>
          {stands.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No stands set up yet</Text>
              <Text style={styles.emptyText}>
                Add a tree stand or blind in Scout and set its ideal wind directions.
                This planner will then tell you which stand to hunt on each day of the
                forecast — so you only sit a stand when the wind is right.
              </Text>
            </View>
          ) : (
            daytimePeriods.map((p) => {
              const idx = periods.indexOf(p);
              return (
                <StandPlanCard key={p.name} period={p} ranked={rankStandsForPeriod(plan, idx)} />
              );
            })
          )}
        </>
      )}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Source: NOAA weather.gov. Wind forecasts shift — always confirm the wind
          on-site before you commit to a stand. Always verify regulations with Maryland DNR.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  header: { marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  headerSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rowNight: { opacity: 0.72 },
  rowLeft: { flex: 1, paddingRight: 12 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowSky: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowWind: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  rowWindMph: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  rowTemp: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planPeriod: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  planWind: { fontSize: 13, color: Colors.textSecondary },
  planNone: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  planStandRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  planStandName: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  planStandTag: { fontSize: 12, fontWeight: '700' },
  offlineCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  offlineTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  offlineText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20 },
  loadingText: { marginLeft: 10, fontSize: 13, color: Colors.textSecondary },
  disclaimer: { marginTop: 20, paddingHorizontal: 4 },
  disclaimerText: { fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
});
