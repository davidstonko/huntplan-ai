import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';

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

/**
 * Map activity level → { label, color } pair for the species badge chip.
 * Replaces earlier emoji-per-level set as part of the Build 9 brand
 * pass: text-coded with a color anchor reads more professional at small
 * sizes and is screen-reader friendly.
 */
const getActivityPill = (level: string): { label: string; color: string } => {
  switch (level) {
    case 'high':
      return { label: 'HIGH', color: '#C62828' };
    case 'moderate':
      return { label: 'MOD', color: '#EF6C00' };
    case 'low':
      return { label: 'LOW', color: '#546E7A' };
    default:
      return { label: 'NONE', color: '#424242' };
  }
};

export default function ScoutingFeed({ reports }: ScoutingFeedProps) {
  const renderReport = ({ item }: { item: ScoutingReport }) => {
    const pill = getActivityPill(item.activityLevel);
    return (
      <View style={styles.reportCard}>
        <View style={styles.header}>
          <View>
            <Text style={styles.handle}>{item.handle}</Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
          <Text style={styles.upvotes}>
            {item.upvotes} {item.upvotes === 1 ? 'upvote' : 'upvotes'}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.speciesBadge}>
            <Text style={styles.species}>{item.species}</Text>
            <View style={[styles.activityPill, { backgroundColor: pill.color }]}>
              <Text style={styles.activityPillText}>{pill.label}</Text>
            </View>
          </View>

          <Text style={styles.location}>
            {item.area}, {item.county} County
          </Text>

          <Text style={styles.body}>{item.bodyText}</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Upvote</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (reports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No scouting reports yet</Text>
        <Text style={styles.emptyText}>
          Be the first to share scouting intel with the community.
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
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8B7355',
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
    color: '#8B7355',
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
    color: '#666',
  },
  upvotes: {
    fontSize: 12,
    color: '#aaa',
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
    color: '#fff',
    marginRight: 6,
  },
  activityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activityPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  location: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    color: '#ddd',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 8,
  },
  actionButton: {
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 11,
    color: '#8B7355',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
