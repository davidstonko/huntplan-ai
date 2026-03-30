import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native';
import Colors from '../theme/colors';

interface ComingSoonScreenProps {
  route?: {
    params?: {
      mode: 'hike' | 'crab' | 'boat';
    };
  };
}

/**
 * Generic ComingSoonScreen for activities not yet launched
 * Accepts route param to determine which activity mode (hike, crab, boat)
 */
export default function ComingSoonScreen({ route }: ComingSoonScreenProps) {
  const mode = route?.params?.mode || 'hike';

  const getModeConfig = () => {
    switch (mode) {
      case 'hike':
        return {
          emoji: '🥾',
          title: 'HikeMaryland',
          subtitle: 'Explore Maryland Trails',
          description: 'Discover the best hiking trails across Maryland.',
          features: [
            'Trail maps and difficulty ratings',
            'Distance and elevation gain info',
            'User reviews and ratings',
            'Parking locations',
            'Weather alerts',
            'Trail conditions and reports',
          ],
        };
      case 'crab':
        return {
          emoji: '🦀',
          title: 'CrabMaryland',
          subtitle: 'Crabbing Guides & Data',
          description: 'All the info you need for successful crabbing in Maryland.',
          features: [
            'Crabbing seasons and regulations',
            'Catch limits and legal sizes',
            'Popular crabbing locations',
            'Tidal predictions',
            'Water conditions',
            'Seasonal catch reports',
          ],
        };
      case 'boat':
        return {
          emoji: '🚤',
          title: 'BoatMaryland',
          subtitle: 'Boating Safety & Access',
          description: 'Everything boaters need to know in Maryland waters.',
          features: [
            'Boat ramp locations',
            'No-wake zones and restrictions',
            'Mooring field information',
            'Navigation charts',
            'Water conditions and alerts',
            'Boating safety regulations',
          ],
        };
      default:
        return {
          emoji: '🏞️',
          title: 'OutdoorsMaryland',
          subtitle: 'Coming Soon',
          description: 'More outdoor adventures are on the way.',
          features: [],
        };
    }
  };

  const config = getModeConfig();

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.emoji}>{config.emoji}</Text>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>{config.description}</Text>
        </View>

        {/* Features List */}
        {config.features.length > 0 && (
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Planned Features</Text>
            <View style={styles.featuresList}>
              {config.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Text style={styles.featureBullet}>•</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Maryland Branding Banner */}
        <View style={styles.mdBrandBanner}>
          <Text style={styles.mdBrandText}>
            Coming Soon to OutdoorsMaryland
          </Text>
          <Text style={styles.mdBrandSubtext}>
            Built by a solo developer for Maryland's outdoor community
          </Text>
        </View>

        {/* Support Us Section */}
        <View style={styles.supportSection}>
          <Text style={styles.supportEmoji}>{'❤️'}</Text>
          <Text style={styles.supportTitle}>Help Us Build Faster</Text>
          <Text style={styles.supportText}>
            OutdoorsMaryland is built by a solo developer passionate about
            making Maryland's outdoor data accessible to everyone. Your support
            helps bring new features to life faster.
          </Text>
          <TouchableOpacity
            style={styles.supportButton}
            activeOpacity={0.7}
            onPress={() => Linking.openURL('https://venmo.com/u/David-Stonko')}
          >
            <Text style={styles.supportButtonText}>{'💚  Support via Venmo'}</Text>
          </TouchableOpacity>
          <Text style={styles.supportSubtext}>
            Every contribution helps — thank you!
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 16,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.moss,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Description
  descriptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.forestDark,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Features
  featuresSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.oak,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  featuresList: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  featureRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  featureBullet: {
    fontSize: 16,
    color: Colors.sage,
    fontWeight: '700',
    marginRight: 10,
    marginTop: -2,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  // Maryland Brand Banner
  mdBrandBanner: {
    backgroundColor: Colors.forestDark,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.sage,
  },
  mdBrandText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  mdBrandSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Support Us
  supportSection: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.oak,
  },
  supportEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.oak,
    marginBottom: 10,
    textAlign: 'center',
  },
  supportText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  supportButton: {
    backgroundColor: Colors.oak,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginBottom: 12,
    minWidth: 240,
    alignItems: 'center',
  },
  supportButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textOnAccent,
  },
  supportSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  spacer: {
    height: 20,
  },
});
