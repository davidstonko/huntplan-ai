/**
 * @file SubscriptionScreen.tsx
 * @description Subscription tier selection screen with feature comparison.
 * Shows Free, Pro, and Team tiers with pricing, features, and purchase buttons.
 *
 * @module Screens
 * @version 1.0.0
 *
 * Key features:
 * - Three subscription tier cards with feature lists
 * - Monthly/Annual toggle with annual savings badge
 * - Purchase buttons with loading state
 * - Restore purchases link at bottom
 * - Terms of Service and Privacy Policy links
 * - Dark theme matching MDHuntFishOutdoors branding
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import Colors from '../theme/colors';
import {
  getAvailablePackages,
  purchasePackage,
  restorePurchases,
  getUserTier,
  type PurchasePackage,
  type SubscriptionTier,
} from '../services/purchaseService';

// ─── Types ───────────────────────────────────────────────────────

interface TierFeature {
  label: string;
  included: boolean;
}

interface TierCard {
  tier: SubscriptionTier;
  title: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyPackageId: string;
  annualPackageId: string;
  features: TierFeature[];
  badge?: string;
}

// ─── Component ────────────────────────────────────────────────────

export default function SubscriptionScreen(): JSX.Element {
  const [isAnnual, setIsAnnual] = useState(true);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [packages, setPackages] = useState<PurchasePackage[]>([]);

  // Fetch current tier and available packages on mount
  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = useCallback(async () => {
    try {
      const [tier, pkgs] = await Promise.all([getUserTier(), getAvailablePackages()]);
      setCurrentTier(tier);
      setPackages(pkgs);
    } catch (error) {
      console.error('[Subscription] Init failed:', error);
    }
  }, []);

  const handlePurchase = useCallback(
    async (packageId: string) => {
      setPurchasingPackageId(packageId);
      try {
        const result = await purchasePackage(packageId);
        if (result) {
          const newTier = await getUserTier();
          setCurrentTier(newTier);
          Alert.alert('Success', 'Your subscription has been activated!');
        }
      } catch (error: any) {
        if (error.code !== 'PurchaseCancelledError') {
          Alert.alert('Error', 'Failed to complete purchase. Please try again.');
        }
      } finally {
        setPurchasingPackageId(null);
      }
    },
    []
  );

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result) {
        const newTier = await getUserTier();
        setCurrentTier(newTier);
        Alert.alert('Success', 'Your purchases have been restored!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  }, []);

  const tierCards: TierCard[] = [
    {
      tier: 'free',
      title: 'Free',
      description: 'Core hunting & fishing',
      monthlyPrice: 0,
      annualPrice: 0,
      monthlyPackageId: '',
      annualPackageId: '',
      features: [
        { label: 'Interactive maps', included: true },
        { label: 'Regulations & seasons', included: true },
        { label: 'AI chat assistant', included: true },
        { label: '3 scout plans', included: true },
        { label: 'Unlimited plans', included: false },
        { label: 'Offline maps', included: false },
        { label: 'Ad-free experience', included: false },
        { label: 'Deer Camp sync', included: false },
      ],
    },
    {
      tier: 'pro',
      title: 'Pro',
      description: 'Serious outdoor planning',
      monthlyPrice: 4.99,
      annualPrice: 39.99,
      monthlyPackageId: 'com.davidstonko.huntmaryland.pro.monthly',
      annualPackageId: 'com.davidstonko.huntmaryland.pro.annual',
      badge: isAnnual ? '33% OFF' : undefined,
      features: [
        { label: 'Everything in Free', included: true },
        { label: 'Unlimited scout plans', included: true },
        { label: 'Trip planners', included: true },
        { label: 'Offline map packs', included: true },
        { label: 'Ad-free experience', included: true },
        { label: 'Export GPX/KML', included: true },
        { label: 'State data packs', included: true },
        { label: 'Deer Camp sync', included: false },
      ],
    },
    {
      tier: 'team',
      title: 'Team',
      description: 'Collaborate with groups',
      monthlyPrice: 9.99,
      annualPrice: 79.99,
      monthlyPackageId: 'com.davidstonko.huntmaryland.team.monthly',
      annualPackageId: 'com.davidstonko.huntmaryland.team.annual',
      badge: isAnnual ? '33% OFF' : undefined,
      features: [
        { label: 'Everything in Pro', included: true },
        { label: 'Deer Camp sync', included: true },
        { label: 'Honey Hole sharing', included: true },
        { label: 'Real-time collab', included: true },
        { label: 'Photo uploads', included: true },
        { label: 'Group chat', included: true },
        { label: 'Activity feed', included: true },
        { label: 'Camp invites', included: true },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Upgrade Your Experience</Text>
        <Text style={styles.subtitle}>
          Choose a plan that fits your outdoor style
        </Text>
      </View>

      {/* Billing Toggle */}
      <View style={styles.billingToggle}>
        <View style={styles.toggleOption}>
          <Text style={[styles.toggleLabel, !isAnnual && styles.toggleLabelActive]}>
            Monthly
          </Text>
        </View>
        <Switch
          value={isAnnual}
          onValueChange={setIsAnnual}
          style={styles.switch}
          trackColor={{ false: Colors.mud, true: Colors.moss }}
          thumbColor={isAnnual ? Colors.tan : Colors.textSecondary}
        />
        <View style={styles.toggleOption}>
          <Text style={[styles.toggleLabel, isAnnual && styles.toggleLabelActive]}>
            Annual
          </Text>
          {isAnnual && <Text style={styles.savingsBadge}>SAVE 33%</Text>}
        </View>
      </View>

      {/* Tier Cards */}
      <View style={styles.cardsContainer}>
        {tierCards.map(card => (
          <TierCardComponent
            key={card.tier}
            card={card}
            isAnnual={isAnnual}
            isCurrentTier={currentTier === card.tier}
            isCheapestPro={card.tier === 'pro'}
            isPurchasing={
              purchasingPackageId === (isAnnual ? card.annualPackageId : card.monthlyPackageId)
            }
            onPurchase={() =>
              handlePurchase(isAnnual ? card.annualPackageId : card.monthlyPackageId)
            }
          />
        ))}
      </View>

      {/* Bottom Links */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreButton}
        >
          {restoring ? (
            <ActivityIndicator color={Colors.tan} size="small" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        <View style={styles.termsContainer}>
          <TouchableOpacity onPress={() => openLink('https://www.apple.com/legal/')}>
            <Text style={styles.termsLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.termsSeparator}>•</Text>
          <TouchableOpacity
            onPress={() =>
              openLink('https://davidstonko.github.io/huntmaryland-site/privacy.html')
            }
          >
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          Subscription renews automatically. Cancel anytime in Settings.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Tier Card Component ──────────────────────────────────────────

interface TierCardComponentProps {
  card: TierCard;
  isAnnual: boolean;
  isCurrentTier: boolean;
  isCheapestPro: boolean;
  isPurchasing: boolean;
  onPurchase: () => void;
}

function TierCardComponent({
  card,
  isAnnual,
  isCurrentTier,
  isCheapestPro,
  isPurchasing,
  onPurchase,
}: TierCardComponentProps): JSX.Element {
  const price = isAnnual ? card.annualPrice : card.monthlyPrice;
  const pricePerMonth = isAnnual ? (card.annualPrice / 12).toFixed(2) : card.monthlyPrice.toFixed(2);
  const billingPeriod = isAnnual ? '/year' : '/month';
  const displayPrice = price === 0 ? 'Free' : `$${price.toFixed(2)}`;

  // Highlight Pro annual as best value
  const isHighlighted = isCheapestPro && isAnnual;
  const cardBackgroundColor = isHighlighted ? Colors.surfaceElevated : Colors.surface;

  return (
    <View
      style={[
        styles.tierCard,
        {
          backgroundColor: cardBackgroundColor,
          borderColor: isHighlighted ? Colors.brass : Colors.mud,
          borderWidth: isHighlighted ? 2 : 1,
        },
      ]}
    >
      {/* Badge */}
      {isHighlighted && <View style={styles.bestValueBadge} />}

      {/* Header */}
      <View style={styles.tierHeader}>
        <Text style={styles.tierTitle}>{card.title}</Text>
        <Text style={styles.tierDescription}>{card.description}</Text>
      </View>

      {/* Pricing */}
      <View style={styles.tierPricing}>
        <Text style={styles.price}>{displayPrice}</Text>
        {price > 0 && (
          <Text style={styles.pricingDetails}>
            ~${pricePerMonth}/{isAnnual ? 'mo' : 'month'}
          </Text>
        )}
        {isAnnual && card.badge && price > 0 && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>{card.badge}</Text>
          </View>
        )}
      </View>

      {/* Features */}
      <View style={styles.featuresList}>
        {card.features.map((feature, idx) => (
          <FeatureRow
            key={idx}
            label={feature.label}
            included={feature.included}
            muted={isCurrentTier && card.tier === 'free'}
          />
        ))}
      </View>

      {/* Action Button */}
      {card.tier !== 'free' ? (
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            isCurrentTier && styles.purchaseButtonCurrentTier,
            isPurchasing && styles.purchaseButtonDisabled,
          ]}
          onPress={onPurchase}
          disabled={isPurchasing || isCurrentTier}
        >
          {isPurchasing ? (
            <ActivityIndicator
              color={isCurrentTier ? Colors.textSecondary : Colors.mdWhite}
              size="small"
            />
          ) : isCurrentTier ? (
            <Text style={styles.purchaseButtonCurrentTierText}>Current Plan</Text>
          ) : (
            <Text style={styles.purchaseButtonText}>Subscribe Now</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.currentPlanBadge}>
          <Text style={styles.currentPlanText}>Your Plan</Text>
        </View>
      )}
    </View>
  );
}

// ─── Feature Row ──────────────────────────────────────────────────

interface FeatureRowProps {
  label: string;
  included: boolean;
  muted?: boolean;
}

function FeatureRow({ label, included, muted }: FeatureRowProps): JSX.Element {
  return (
    <View style={styles.featureRow}>
      <Text style={[styles.featureCheckmark, !included && styles.featureCheckmarkDisabled]}>
        {included ? '✓' : '○'}
      </Text>
      <Text
        style={[
          styles.featureLabel,
          !included && styles.featureLabelDisabled,
          muted && styles.featureLabelMuted,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function openLink(url: string): void {
  Linking.openURL(url).catch(err => console.error('[Subscription] Failed to open link:', err));
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Billing Toggle
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 32,
    gap: 12,
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  toggleLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  switch: {
    transform: [{ scale: 0.8 }],
  },
  savingsBadge: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '700',
    marginTop: 4,
  },

  // Cards Container
  cardsContainer: {
    gap: 16,
    marginBottom: 32,
  },

  // Tier Card
  tierCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 50,
    borderTopWidth: 50,
    borderLeftColor: 'transparent',
    borderTopColor: Colors.brass,
  },

  tierHeader: {
    marginBottom: 16,
  },
  tierTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Pricing
  tierPricing: {
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.tan,
    marginBottom: 4,
  },
  pricingDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  priceBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  priceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mdBlack,
  },

  // Features
  featuresList: {
    marginBottom: 20,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureCheckmark: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
    width: 20,
    textAlign: 'center',
  },
  featureCheckmarkDisabled: {
    color: Colors.textMuted,
  },
  featureLabel: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  featureLabelDisabled: {
    color: Colors.textMuted,
  },
  featureLabelMuted: {
    color: Colors.textSecondary,
  },

  // Buttons
  purchaseButton: {
    backgroundColor: Colors.moss,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mdWhite,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonCurrentTier: {
    backgroundColor: Colors.surface,
  },
  purchaseButtonCurrentTierText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  currentPlanBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentPlanText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.brass,
  },

  // Bottom Section
  bottomSection: {
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    paddingTop: 24,
  },
  restoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  restoreButtonText: {
    fontSize: 12,
    color: Colors.waterLight,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  termsLink: {
    fontSize: 11,
    color: Colors.waterLight,
    textDecorationLine: 'underline',
  },
  termsSeparator: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
