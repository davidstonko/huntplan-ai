import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Colors from '../../theme/colors';

interface ScoutingReport {
  id: string;
  handle: string;
  species: string;
  activityLevel: 'none' | 'low' | 'moderate' | 'high';
  county: string;
  area: string;
  bodyText: string;
  date: string;
  upvotes: number;
}

interface ScoutingFeedProps {
  reports: ScoutingReport[];
}

const getActivityEmoji = (level: string) => {
  switch (level) {
    case 'high':
      return '🔥';
    case 'moderate':
      return '⚡';
    case 'low':
      return '💤';
    default:
      return '❌';
  }
};

export default function ScoutingFeed({ reports }: ScoutingFeedProps) {
  const renderReport = ({ item }: { item: ScoutingReport }) => (
    <View style={styles.reportCard}>
      <View style={styles.header}>
        <View>
          <Text style={styles.handle}>{item.handle}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>
        <Text style={styles.upvotes}>👍 {item.upvotes}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.speciesBadge}>
          <Text style={styles.species}>{item.species}</Text>
          <Text style={styles.activityEmoji}>
            {getActivityEmoji(item.activityLevel)}
          </Text>
        </View>

        <Text style={styles.location}>
          📍 {item.area}, {item.county} County
        </Text>

        <Text style={styles.body}>{item.bodyText}</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>👍 Upvote</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>💬 Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>🚩 Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (reports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>No scouting reports yet</Text>
        <Text style={styles.emptyText}>
          Be the first to share scouting intel with the community
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={reports}
      renderItem={renderReport}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 80,
  },
  reportCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.oak,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  handle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.oak,
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  upvotes: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  content: {
    marginBottom: 10,
  },
  speciesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  species: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: 6,
  },
  activityEmoji: {
    fontSize: 16,
  },
  location: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    paddingTop: 8,
  },
  actionButton: {
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 11,
    color: Colors.oak,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
