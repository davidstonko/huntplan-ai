/**
 * HatchChart.tsx — Monthly hatch chart visualization for fly fishing
 *
 * Displays a 12-month timeline with colored dots for active hatches.
 * Current month is highlighted. Tap to expand or view month details.
 *
 * Used by fishing recommendations, guides, and seasonal planning screens.
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native';
import Colors from '../../theme/colors';
import { HatchChart as HatchChartType } from '../../types/gear';

interface HatchChartProps {
  /** Hatch chart data */
  chart: HatchChartType;
  /** Current month (1-12), defaults to today's month */
  currentMonth?: number;
  /** Callback when month is tapped */
  onMonthPress?: (month: number) => void;
  /** Optional style override */
  style?: ViewStyle;
}

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * HatchChart component — displays monthly hatch visualization
 *
 * 12-month timeline with active insect indicators. Current month highlighted
 * with moss background. Tap to view details.
 */
export const HatchChart: React.FC<HatchChartProps> = ({
  chart,
  currentMonth,
  onMonthPress,
  style,
}) => {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const month = currentMonth || new Date().getMonth() + 1;

  const handleMonthPress = (m: number) => {
    setExpandedMonth(expandedMonth === m ? null : m);
    if (onMonthPress) {
      onMonthPress(m);
    }
  };

  const getMonthData = (m: number) => {
    const entry = chart.entries[m - 1];
    return entry || null;
  };

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityLabel={`Hatch chart for ${chart.waterBody}`}
      accessibilityRole="text"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.waterBody}>{chart.waterBody}</Text>
        <Text style={styles.waterType}>
          {chart.waterType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </Text>
      </View>

      {/* Month grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.monthGrid}
      >
        {monthNames.map((monthName, idx) => {
          const m = idx + 1;
          const monthData = getMonthData(m);
          const isCurrentMonth = m === month;
          const isExpanded = expandedMonth === m;

          return (
            <TouchableOpacity
              key={m}
              style={[
                styles.monthColumn,
                isCurrentMonth && styles.currentMonth,
              ]}
              onPress={() => handleMonthPress(m)}
              activeOpacity={0.7}
              accessible={true}
              accessibilityLabel={`${monthName}`}
              accessibilityRole="button"
              accessibilityHint={
                monthData ? `${monthData.insects.length} insects hatching` : 'No data'
              }
            >
              {/* Month header */}
              <Text style={[
                styles.monthName,
                isCurrentMonth && styles.currentMonthName,
              ]}>
                {monthName}
              </Text>

              {/* Insect indicators */}
              <View style={styles.insectIndicators}>
                {monthData && monthData.insects.length > 0 ? (
                  <>
                    <View style={styles.dotRow}>
                      {monthData.insects.slice(0, 2).map((insect, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.dot,
                            idx === 0 ? styles.dotGreen : styles.dotAmber,
                          ]}
                        />
                      ))}
                    </View>
                    {monthData.insects.length > 2 && (
                      <Text style={styles.moreInsects}>
                        +{monthData.insects.length - 2}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.noDot}>—</Text>
                )}
              </View>

              {/* Expanded details */}
              {isExpanded && monthData && (
                <View style={styles.expandedDetails}>
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsLabel}>Insects</Text>
                    {monthData.insects.map((insect, idx) => (
                      <Text key={idx} style={styles.detailsItem}>
                        • {insect}
                      </Text>
                    ))}
                  </View>
                  {monthData.dryFlies.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Dry Flies</Text>
                      {monthData.dryFlies.slice(0, 2).map((fly, idx) => (
                        <Text key={idx} style={styles.detailsItem}>
                          • {fly}
                        </Text>
                      ))}
                      {monthData.dryFlies.length > 2 && (
                        <Text style={styles.detailsMore}>
                          + {monthData.dryFlies.length - 2} more
                        </Text>
                      )}
                    </View>
                  )}
                  {monthData.notes && (
                    <Text style={styles.notes}>{monthData.notes}</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Legend and source */}
      <View style={styles.footer}>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.dotGreen]} />
            <Text style={styles.legendText}>Active Hatch</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.dotAmber]} />
            <Text style={styles.legendText}>Secondary</Text>
          </View>
        </View>
        <Text style={styles.source}>
          Source: {chart.source}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    marginBottom: 14,
  },
  waterBody: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  waterType: {
    fontSize: 12,
    color: Colors.tan,
    fontWeight: '500',
  },
  scrollView: {
    marginBottom: 12,
  },
  monthGrid: {
    gap: 8,
    paddingRight: 8,
  },
  monthColumn: {
    minWidth: 60,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  currentMonth: {
    backgroundColor: Colors.moss,
    borderColor: Colors.lichen,
  },
  monthName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  currentMonthName: {
    color: Colors.textOnAccent,
  },
  insectIndicators: {
    alignItems: 'center',
    minHeight: 20,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: Colors.success,
  },
  dotAmber: {
    backgroundColor: Colors.amber,
  },
  moreInsects: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  noDot: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  expandedDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    width: '100%',
  },
  detailsSection: {
    marginBottom: 8,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.tan,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailsItem: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
    lineHeight: 16,
  },
  detailsMore: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  notes: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 16,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  source: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
