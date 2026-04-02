import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import Colors from '../theme/colors';
import { Config } from '../config';

/**
 * DonateScreen — Support the OutdoorsMaryland Project
 *
 * Provides multiple ways for users to donate and support development:
 * - One-time donations via Stripe payment links
 * - Buy Me a Coffee integration
 * - Venmo / PayPal quick links
 * - Patreon for recurring support
 *
 * The owner (David) can configure these links via environment or config.
 */

// ── Configuration ──
// Replace these with your actual payment links
const DONATION_CONFIG = {
  venmo: 'David-Stonko',
  buyMeACoffee: 'outdoorsmaryland',
  patreon: 'outdoorsmaryland',
  stripeLink: '',
};

interface DonationTier {
  id: string;
  title: string;
  amount: string;
  description: string;
  emoji: string;
}

const DONATION_TIERS: DonationTier[] = [
  {
    id: 'coffee',
    title: 'Trail Coffee',
    amount: '$5',
    description: 'Buy the dev a coffee to fuel late-night coding sessions.',
    emoji: '\u2615', // coffee cup
  },
  {
    id: 'ammo',
    title: 'Box of Ammo',
    amount: '$25',
    description: 'Help cover server costs for one month of map data.',
    emoji: '\uD83C\uDFAF', // target
  },
  {
    id: 'lease',
    title: 'Day Lease',
    amount: '$50',
    description: 'Fund a new state data pack (regulations + GIS).',
    emoji: '\uD83C\uDF32', // tree
  },
  {
    id: 'sponsor',
    title: 'Season Sponsor',
    amount: '$100',
    description: 'Major supporter — listed in About screen credits.',
    emoji: '\u2B50', // star
  },
];

const SUPPORT_OPTIONS = [
  {
    id: 'venmo',
    label: 'Venmo',
    color: '#008CFF',
    getUrl: () => `venmo://paycharge?txn=pay&recipients=${DONATION_CONFIG.venmo}`,
    fallbackUrl: `https://venmo.com/${DONATION_CONFIG.venmo}`,
  },
  {
    id: 'buymeacoffee',
    label: 'Buy Me a Coffee',
    color: '#FFDD00',
    textColor: '#000000',
    getUrl: () => `https://buymeacoffee.com/${DONATION_CONFIG.buyMeACoffee}`,
    fallbackUrl: `https://buymeacoffee.com/${DONATION_CONFIG.buyMeACoffee}`,
  },
  {
    id: 'patreon',
    label: 'Patreon (Monthly)',
    color: '#FF424D',
    getUrl: () => `https://patreon.com/${DONATION_CONFIG.patreon}`,
    fallbackUrl: `https://patreon.com/${DONATION_CONFIG.patreon}`,
  },
];

export default function DonateScreen() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const notifyDonationTap = async (paymentMethod: string) => {
    const tier = DONATION_TIERS.find(t => t.id === selectedTier);
    try {
      await fetch(`${Config.API_BASE_URL}/api/v1/feedback/donation-tap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentMethod,
          tier: tier?.title || null,
          amount: tier?.amount || null,
        }),
      });
    } catch {
      // Fire-and-forget — don't block the user if notification fails
      if (__DEV__) console.warn('[Donate] notification failed');
    }
  };

  const handleDonate = async (option: typeof SUPPORT_OPTIONS[0]) => {
    // Notify backend (sends email to David) — fire-and-forget
    notifyDonationTap(option.id);

    const url = option.getUrl();
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else if (option.fallbackUrl) {
        await Linking.openURL(option.fallbackUrl);
      } else {
        Alert.alert(
          'Cannot Open',
          `Please visit ${option.fallbackUrl || url} in your browser.`,
        );
      }
    } catch {
      Alert.alert('Error', 'Could not open the payment link. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section — Mission */}
      <View style={styles.heroSection}>
        <Text style={styles.heroEmoji}>{'\uD83E\uDD8C'}</Text>
        <Text style={styles.heroTitle}>Support OutdoorsMaryland</Text>
        <Text style={styles.heroSubtitle}>
          All of Maryland's outdoor adventures in one place — free. OutdoorsMaryland
          brings together hunting regulations, public land maps, seasons, and local
          knowledge so you spend less time searching and more time in the field and on the water.
        </Text>
      </View>

      {/* What the App Does */}
      <Text style={styles.sectionTitle}>What You Get — Free</Text>
      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>{'\uD83D\uDDFA\uFE0F'}</Text>
          <Text style={styles.featureText}>
            Interactive map with WMA, State Forest, and Federal land boundaries
            — satellite and topo views
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>{'\uD83D\uDCDC'}</Text>
          <Text style={styles.featureText}>
            Maryland hunting seasons, bag limits, and weapon regulations —
            always up to date from MD DNR
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>{'\uD83E\uDD16'}</Text>
          <Text style={styles.featureText}>
            AI hunt planner that answers your questions about Maryland hunting
            rules and helps you plan trips
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>{'\uD83D\uDCAC'}</Text>
          <Text style={styles.featureText}>
            Hunter community forums — share scouting reports, find hunting
            partners, buy/sell gear, and discover land and leases
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>{'\uD83C\uDF26\uFE0F'}</Text>
          <Text style={styles.featureText}>
            Weather and activity forecasts tied to your location
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>{'\uD83D\uDCF4'}</Text>
          <Text style={styles.featureText}>
            Works offline — regulations, maps, and your plans are saved to your phone
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureBullet}>{'\uD83D\uDC1F'}</Text>
          <Text style={styles.featureText}>
            Expanding to include fishing, crabbing, boating, and hiking resources in future updates
          </Text>
        </View>
      </View>

      {/* Donation Tiers */}
      <Text style={styles.sectionTitle}>Choose a Support Level</Text>
      <View style={styles.tiersContainer}>
        {DONATION_TIERS.map(tier => (
          <TouchableOpacity
            key={tier.id}
            style={[
              styles.tierCard,
              selectedTier === tier.id && styles.tierCardSelected,
            ]}
            onPress={() => setSelectedTier(tier.id)}
            activeOpacity={0.7}
          >
            <View style={styles.tierHeader}>
              <Text style={styles.tierEmoji}>{tier.emoji}</Text>
              <View style={styles.tierHeaderText}>
                <Text style={styles.tierTitle}>{tier.title}</Text>
                <Text style={styles.tierAmount}>{tier.amount}</Text>
              </View>
            </View>
            <Text style={styles.tierDescription}>{tier.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Payment Methods */}
      <Text style={styles.sectionTitle}>Send Via</Text>
      <View style={styles.paymentMethods}>
        {SUPPORT_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[styles.paymentButton, { backgroundColor: option.color }]}
            onPress={() => handleDonate(option)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.paymentButtonText,
                option.textColor ? { color: option.textColor } : null,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* What Your Donation Supports */}
      <View style={styles.impactSection}>
        <Text style={styles.sectionTitle}>Where Your Money Goes</Text>
        <View style={styles.impactItem}>
          <Text style={styles.impactIcon}>{'\uD83D\uDDFA\uFE0F'}</Text>
          <View style={styles.impactText}>
            <Text style={styles.impactTitle}>Map & GIS Data</Text>
            <Text style={styles.impactDesc}>
              Hosting and processing public land polygons, WMA boundaries, and
              state forest data for all 50 states.
            </Text>
          </View>
        </View>
        <View style={styles.impactItem}>
          <Text style={styles.impactIcon}>{'\uD83E\uDD16'}</Text>
          <View style={styles.impactText}>
            <Text style={styles.impactTitle}>AI Processing</Text>
            <Text style={styles.impactDesc}>
              Running the AI planning engine that answers your hunting questions
              and generates personalized hunt plans.
            </Text>
          </View>
        </View>
        <View style={styles.impactItem}>
          <Text style={styles.impactIcon}>{'\uD83D\uDCDC'}</Text>
          <View style={styles.impactText}>
            <Text style={styles.impactTitle}>Regulations Updates</Text>
            <Text style={styles.impactDesc}>
              Keeping season dates, bag limits, and legal requirements current for
              every state we support.
            </Text>
          </View>
        </View>
        <View style={styles.impactItem}>
          <Text style={styles.impactIcon}>{'\uD83D\uDCF1'}</Text>
          <View style={styles.impactText}>
            <Text style={styles.impactTitle}>App Development</Text>
            <Text style={styles.impactDesc}>
              New features like offline maps, GPS tracking, weather integration,
              and multi-state expansion.
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          OutdoorsMaryland is an independent project — not affiliated with MD DNR.
          Every dollar goes directly to keeping this app free and improving it
          for Maryland's outdoor community.
        </Text>
        <View style={styles.mdFlagFooter}>
          <View style={[styles.mdStripeSmall, { backgroundColor: Colors.mdRed }]} />
          <View style={[styles.mdStripeSmall, { backgroundColor: Colors.mdGold }]} />
          <View style={[styles.mdStripeSmall, { backgroundColor: Colors.mdBlack }]} />
          <View style={[styles.mdStripeSmall, { backgroundColor: Colors.mdWhite }]} />
        </View>
        <Text style={styles.footerHeart}>{'\uD83E\uDD80'} Thank you for supporting Maryland's outdoors. {'\uD83E\uDD80'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  // Hero
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: Colors.forestDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.tan,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.tan,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    letterSpacing: 0.3,
  },
  // Feature List
  featureList: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  featureBullet: {
    fontSize: 20,
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  // Tiers
  tiersContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tierCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.mud,
  },
  tierCardSelected: {
    borderColor: Colors.oak,
    backgroundColor: Colors.surfaceElevated,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  tierHeaderText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tierAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.oak,
  },
  tierDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginLeft: 40,
  },
  // Payment Methods
  paymentMethods: {
    paddingHorizontal: 16,
    gap: 10,
  },
  paymentButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Impact
  impactSection: {
    marginTop: 8,
  },
  impactItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  impactIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  impactText: {
    flex: 1,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  impactDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // Footer
  footer: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  footerHeart: {
    fontSize: 14,
    color: Colors.tan,
    fontWeight: '600',
  },
  mdFlagFooter: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
    width: 120,
  },
  mdStripeSmall: {
    flex: 1,
  },
});
