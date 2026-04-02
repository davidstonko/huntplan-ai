/**
 * Camp Intelligence Panel — Shows AI-powered insights and data point progress.
 * Displays tier status, local statistics, and AI-generated recommendations.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Colors from '../../theme/colors';

export type InsightsTier = 'locked' | 'basic' | 'intermediate' | 'advanced' | 'expert';

export interface LocalInsights {
  topHarvestLocations: Array<{ name: string; count: number }>;
  bestTimeOfDay: { morning: number; midday: number; evening: number };
  speciesBreakdown: Record<string, number>;
  memberContributions: Array<{ name: string; dataPoints: number }>;
  averageAntlerPoints?: number;
}

export interface AIInsights {
  summary: string;
  recommendations: string[];
  patterns: string[];
  predictedBestDays: string[];
  strategySuggestion: string;
}

export interface CampInsightsPanelProps {
  campId: string;
  dataPointCount: number;
  tier: InsightsTier;
  progressToNextTier: number; // 0-100
  nextTierAt: number;
  localInsights?: LocalInsights;
  aiInsights?: AIInsights;
  isLoadingAI: boolean;
  onRequestAIAnalysis: () => void;
}

const TIER_CONFIG: Record<InsightsTier, { label: string; color: string; nextThreshold: number }> = {
  locked: { label: 'Locked', color: Colors.textMuted, nextThreshold: 50 },
  basic: { label: 'Basic', color: Colors.mdGold, nextThreshold: 100 },
  intermediate: { label: 'Intermediate', color: Colors.amber, nextThreshold: 200 },
  advanced: { label: 'Advanced', color: Colors.mdRed, nextThreshold: 350 },
  expert: { label: 'Expert', color: Colors.moss, nextThreshold: 500 },
};

export const CampInsightsPanel: React.FC<CampInsightsPanelProps> = ({
  campId,
  dataPointCount,
  tier,
  progressToNextTier,
  nextTierAt,
  localInsights,
  aiInsights,
  isLoadingAI,
  onRequestAIAnalysis,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));

  const config = TIER_CONFIG[tier];
  const isLocked = tier === 'locked';
  const TIER_ORDER: InsightsTier[] = ['locked', 'basic', 'intermediate', 'advanced', 'expert'];
  const currentTierIndex = TIER_ORDER.indexOf(tier);
  const nextTierLabel = currentTierIndex < TIER_ORDER.length - 1
    ? TIER_ORDER[currentTierIndex + 1]
    : null;
  const nextConfig = nextTierLabel ? TIER_CONFIG[nextTierLabel] : null;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    Animated.timing(animatedHeight, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const remainingPoints = Math.max(0, nextTierAt - dataPointCount);

  return (
    <View style={styles.container}>
      {/* Header Section — Always Visible */}
      <TouchableOpacity style={styles.header} onPress={toggleExpand} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>🧠 Camp Intelligence</Text>
          <View style={[styles.tierBadge, { backgroundColor: config.color }]}>
            <Text style={styles.tierBadgeText}>{config.label}</Text>
          </View>
        </View>
        <Text style={styles.expandIndicator}>{isExpanded ? '−' : '+'}</Text>
      </TouchableOpacity>

      {/* Data Point Counter & Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.dataPointText}>
            {dataPointCount} / {nextTierAt} data points
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(progressToNextTier, 100)}%`,
                backgroundColor: config.color,
              },
            ]}
          />
        </View>
        <Text style={styles.tierLabel}>
          {isLocked
            ? `${remainingPoints} more points to unlock AI insights`
            : nextConfig
              ? `${remainingPoints} more points to ${nextConfig.label}`
              : 'Expert tier — maximum level reached!'}
        </Text>
      </View>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Locked State Content */}
          {isLocked && (
            <View style={styles.lockedCard}>
              <Text style={styles.cardTitle}>Get Started with Data</Text>
              <Text style={styles.lockedText}>
                Add pins, routes, photos, harvests, and tracks to unlock AI insights!
              </Text>

              {/* Data type icons */}
              <View style={styles.dataTypesGrid}>
                <View style={styles.dataTypeItem}>
                  <Text style={styles.dataTypeIcon}>📍</Text>
                  <Text style={styles.dataTypeLabel}>Pins</Text>
                </View>
                <View style={styles.dataTypeItem}>
                  <Text style={styles.dataTypeIcon}>🛣️</Text>
                  <Text style={styles.dataTypeLabel}>Routes</Text>
                </View>
                <View style={styles.dataTypeItem}>
                  <Text style={styles.dataTypeIcon}>📷</Text>
                  <Text style={styles.dataTypeLabel}>Photos</Text>
                </View>
                <View style={styles.dataTypeItem}>
                  <Text style={styles.dataTypeIcon}>🎯</Text>
                  <Text style={styles.dataTypeLabel}>Harvests</Text>
                </View>
              </View>

              {/* Member contribution */}
              {localInsights?.memberContributions && localInsights.memberContributions.length > 0 && (
                <View style={styles.contributionCard}>
                  <Text style={styles.cardLabel}>Member Activity</Text>
                  {localInsights.memberContributions.slice(0, 3).map((member, idx) => (
                    <View key={idx} style={styles.contributionRow}>
                      <Text style={styles.contributionName}>{member.name}</Text>
                      <Text style={styles.contributionPoints}>{member.dataPoints} points</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Unlocked State — Local Insights */}
          {!isLocked && localInsights && (
            <View style={styles.insightsCard}>
              <Text style={styles.cardTitle}>📊 Camp Statistics</Text>

              {/* Top Harvest Locations */}
              {localInsights.topHarvestLocations && localInsights.topHarvestLocations.length > 0 && (
                <View style={styles.statsSection}>
                  <Text style={styles.sectionLabel}>Top Locations</Text>
                  {localInsights.topHarvestLocations.slice(0, 3).map((loc, idx) => (
                    <View key={idx} style={styles.statRow}>
                      <Text style={styles.statName}>{loc.name}</Text>
                      <View style={styles.statBar}>
                        <View
                          style={[
                            styles.statBarFill,
                            {
                              width: `${Math.min((loc.count / (localInsights.topHarvestLocations[0]?.count || 1)) * 100, 100)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.statValue}>{loc.count}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Best Time of Day */}
              {localInsights.bestTimeOfDay && (
                <View style={styles.statsSection}>
                  <Text style={styles.sectionLabel}>Best Time of Day</Text>
                  <View style={styles.timeOfDayGrid}>
                    <View style={styles.timeBlock}>
                      <Text style={styles.timeLabel}>🌅 Morning</Text>
                      <Text style={styles.timePercent}>
                        {Math.round(
                          (localInsights.bestTimeOfDay.morning /
                            (localInsights.bestTimeOfDay.morning +
                              localInsights.bestTimeOfDay.midday +
                              localInsights.bestTimeOfDay.evening)) *
                            100
                        )}
                        %
                      </Text>
                    </View>
                    <View style={styles.timeBlock}>
                      <Text style={styles.timeLabel}>☀️ Midday</Text>
                      <Text style={styles.timePercent}>
                        {Math.round(
                          (localInsights.bestTimeOfDay.midday /
                            (localInsights.bestTimeOfDay.morning +
                              localInsights.bestTimeOfDay.midday +
                              localInsights.bestTimeOfDay.evening)) *
                            100
                        )}
                        %
                      </Text>
                    </View>
                    <View style={styles.timeBlock}>
                      <Text style={styles.timeLabel}>🌆 Evening</Text>
                      <Text style={styles.timePercent}>
                        {Math.round(
                          (localInsights.bestTimeOfDay.evening /
                            (localInsights.bestTimeOfDay.morning +
                              localInsights.bestTimeOfDay.midday +
                              localInsights.bestTimeOfDay.evening)) *
                            100
                        )}
                        %
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Species Breakdown */}
              {localInsights.speciesBreakdown && Object.keys(localInsights.speciesBreakdown).length > 0 && (
                <View style={styles.statsSection}>
                  <Text style={styles.sectionLabel}>Species Breakdown</Text>
                  <View style={styles.speciesChips}>
                    {Object.entries(localInsights.speciesBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 4)
                      .map(([species, count], idx) => (
                        <View key={idx} style={styles.chip}>
                          <Text style={styles.chipText}>{species}</Text>
                          <Text style={styles.chipCount}>{count}</Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}

              {/* Member Leaderboard */}
              {localInsights.memberContributions && localInsights.memberContributions.length > 0 && (
                <View style={styles.statsSection}>
                  <Text style={styles.sectionLabel}>Member Leaderboard</Text>
                  {localInsights.memberContributions.slice(0, 5).map((member, idx) => (
                    <View key={idx} style={styles.leaderboardRow}>
                      <Text style={styles.leaderboardRank}>{idx + 1}</Text>
                      <Text style={styles.leaderboardName}>{member.name}</Text>
                      <Text style={styles.leaderboardPoints}>{member.dataPoints}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* AI Insights Card (if available) */}
          {!isLocked && aiInsights && (
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <Text style={styles.aiTitle}>🤖 AI Analysis</Text>
              </View>

              <Text style={styles.aiSummary}>{aiInsights.summary}</Text>

              {/* Recommendations */}
              {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                <View style={styles.aiSection}>
                  <Text style={styles.aiSectionLabel}>Recommendations</Text>
                  {aiInsights.recommendations.map((rec, idx) => (
                    <View key={idx} style={styles.aiListItem}>
                      <Text style={styles.aiListNumber}>{idx + 1}.</Text>
                      <Text style={styles.aiListText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Patterns */}
              {aiInsights.patterns && aiInsights.patterns.length > 0 && (
                <View style={styles.aiSection}>
                  <Text style={styles.aiSectionLabel}>Observed Patterns</Text>
                  {aiInsights.patterns.map((pattern, idx) => (
                    <View key={idx} style={styles.aiPatternItem}>
                      <Text style={styles.aiPatternBullet}>•</Text>
                      <Text style={styles.aiPatternText}>{pattern}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Best Days */}
              {aiInsights.predictedBestDays && aiInsights.predictedBestDays.length > 0 && (
                <View style={styles.aiSection}>
                  <Text style={styles.aiSectionLabel}>Best Days to Hunt</Text>
                  <View style={styles.bestDaysChips}>
                    {aiInsights.predictedBestDays.slice(0, 3).map((day, idx) => (
                      <View key={idx} style={styles.bestDayChip}>
                        <Text style={styles.bestDayText}>{day}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Strategy Suggestion */}
              {aiInsights.strategySuggestion && (
                <View style={styles.strategyBox}>
                  <Text style={styles.strategyLabel}>💡 Strategy Suggestion</Text>
                  <Text style={styles.strategyText}>{aiInsights.strategySuggestion}</Text>
                </View>
              )}

              {/* Refresh Button */}
              <TouchableOpacity
                style={[styles.refreshButton, isLoadingAI && styles.refreshButtonDisabled]}
                onPress={onRequestAIAnalysis}
                disabled={isLoadingAI}
                activeOpacity={0.7}
              >
                {isLoadingAI ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.textOnAccent} />
                    <Text style={styles.refreshButtonText}>Analyzing...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.refreshButtonText}>🔄 Refresh Analysis</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* AI Placeholder (not yet analyzed) */}
          {!isLocked && !aiInsights && (
            <View style={styles.aiCard}>
              <Text style={styles.aiPlaceholder}>🤖 AI analysis pending — tap button below to generate insights</Text>
              <TouchableOpacity
                style={[styles.refreshButton, isLoadingAI && styles.refreshButtonDisabled]}
                onPress={onRequestAIAnalysis}
                disabled={isLoadingAI}
                activeOpacity={0.7}
              >
                {isLoadingAI ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.textOnAccent} />
                    <Text style={styles.refreshButtonText}>Analyzing...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.refreshButtonText}>✨ Generate AI Insights</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Tier Benefits Preview */}
          {nextConfig && (
            <View style={styles.tierPreviewCard}>
              <Text style={styles.tierPreviewLabel}>🎯 Unlock at {nextConfig.label}</Text>
              <Text style={styles.tierPreviewText}>
                {nextConfig.label === 'Basic' && 'Enhanced local statistics and baseline patterns'}
                {nextConfig.label === 'Intermediate' && 'Predictive hotspot clustering and seasonal trends'}
                {nextConfig.label === 'Advanced' && 'Real-time recommendations and weather correlation'}
                {nextConfig.label === 'Expert' && 'Custom strategies and multi-camp comparison'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceElevated,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },

  tierBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textOnAccent,
  },

  expandIndicator: {
    fontSize: 24,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  progressSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },

  progressRow: {
    marginBottom: 8,
  },

  dataPointText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },

  progressBar: {
    height: '100%',
    borderRadius: 4,
  },

  tierLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  expandedContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },

  /* ── Locked State ── */
  lockedCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  lockedText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  dataTypesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },

  dataTypeItem: {
    alignItems: 'center',
    gap: 4,
  },

  dataTypeIcon: {
    fontSize: 24,
  },

  dataTypeLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  contributionCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    padding: 10,
    gap: 8,
  },

  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  contributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },

  contributionName: {
    fontSize: 12,
    color: Colors.textPrimary,
  },

  contributionPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mdGold,
  },

  /* ── Unlocked State — Local Insights ── */
  insightsCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },

  statsSection: {
    gap: 10,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  statName: {
    fontSize: 12,
    color: Colors.textPrimary,
    width: 80,
  },

  statBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },

  statBarFill: {
    height: '100%',
    backgroundColor: Colors.oak,
  },

  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 30,
    textAlign: 'right',
  },

  timeOfDayGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },

  timeBlock: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },

  timeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  timePercent: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.mdGold,
  },

  speciesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  chipText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },

  chipCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mdGold,
  },

  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },

  leaderboardRank: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mdGold,
    width: 20,
  },

  leaderboardName: {
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 1,
  },

  leaderboardPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  /* ── AI Card ── */
  aiCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.mdGold,
  },

  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  aiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.mdGold,
  },

  aiSummary: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  aiPlaceholder: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  aiSection: {
    gap: 8,
  },

  aiSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mdGold,
  },

  aiListItem: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },

  aiListNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 16,
  },

  aiListText: {
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 16,
  },

  aiPatternItem: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },

  aiPatternBullet: {
    fontSize: 12,
    color: Colors.mdGold,
    width: 12,
  },

  aiPatternText: {
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 16,
  },

  bestDaysChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  bestDayChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.mdGold,
  },

  bestDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mdGold,
  },

  strategyBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    gap: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.mdRed,
  },

  strategyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mdRed,
  },

  strategyText: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 16,
  },

  refreshButton: {
    backgroundColor: Colors.mdGold,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  refreshButtonDisabled: {
    opacity: 0.6,
  },

  refreshButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textOnAccent,
  },

  tierPreviewCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    gap: 6,
    borderTopWidth: 2,
    borderTopColor: Colors.mdGold,
  },

  tierPreviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mdGold,
  },

  tierPreviewText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});

export default CampInsightsPanel;
