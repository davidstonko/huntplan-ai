/**
 * KitCard.tsx — Curated gear kit display component
 *
 * Shows kit emoji, name, description, target user, price range, item count,
 * and "Shop Kit on Amazon" button. Displays first 3 items with visual indicator
 * of additional items.
 *
 * Used by gear guides, recommendation results, and kit builder screens.
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Linking,
} from 'react-native';
import { Text } from 'react-native';
import Colors from '../../theme/colors';
import { GearKit } from '../../types/gear';

interface KitCardProps {
  /** Curated gear kit */
  kit: GearKit;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Optional style override */
  style?: ViewStyle;
}

/**
 * KitCard component — displays curated gear kit with preview
 *
 * Shows kit name, emoji, description, target user, price, and item preview.
 * Tap "Shop Kit" to navigate to Amazon for the kit's products.
 */
export const KitCard: React.FC<KitCardProps> = ({
  kit,
  onPress,
  style,
}) => {
  const itemPreview = kit.items.slice(0, 3);
  const hiddenCount = kit.items.length - itemPreview.length;

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const handleShopKit = () => {
    // Navigate to first product or open a kit landing page
    if (kit.amazonProducts && kit.amazonProducts.length > 0) {
      Linking.openURL(kit.amazonProducts[0].affiliateUrl).catch(() => {
        console.warn('Failed to open Amazon kit link');
      });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityLabel={`Gear kit: ${kit.name}`}
      accessibilityRole="button"
    >
      {/* Header with emoji and title */}
      <View style={styles.header}>
        <Text style={styles.emoji}>{kit.imageEmoji}</Text>
        <View style={styles.titleSection}>
          <Text style={styles.name}>{kit.name}</Text>
          <Text style={styles.targetUser} numberOfLines={1}>
            {kit.targetUser}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {kit.description}
      </Text>

      {/* Price and item count row */}
      <View style={styles.metaRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Total Price</Text>
          <Text style={styles.priceRange}>{kit.totalPriceRange}</Text>
        </View>
        <View style={styles.itemCountContainer}>
          <Text style={styles.itemCountLabel}>Items</Text>
          <Text style={styles.itemCount}>{kit.items.length}</Text>
        </View>
      </View>

      {/* Item preview list */}
      <View style={styles.itemsSection}>
        <Text style={styles.itemsLabel}>Includes:</Text>
        {itemPreview.map((item, idx) => (
          <Text
            key={idx}
            style={styles.itemPreview}
            numberOfLines={1}
          >
            {`${idx === 0 ? '•' : '◦'} ${item.name}`}
          </Text>
        ))}
        {hiddenCount > 0 && (
          <Text style={styles.moreItems}>
            {`+ ${hiddenCount} more`}
          </Text>
        )}
      </View>

      {/* Shop button */}
      <TouchableOpacity
        style={styles.shopButton}
        onPress={handleShopKit}
        activeOpacity={0.8}
        accessibilityLabel="Shop Kit on Amazon"
        accessibilityRole="button"
      >
        <Text style={styles.shopButtonText}>Shop Kit on Amazon</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  emoji: {
    fontSize: 48,
  },
  titleSection: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  targetUser: {
    fontSize: 13,
    color: Colors.tan,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  priceRange: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.moss,
  },
  itemCountContainer: {
    flex: 1,
  },
  itemCountLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.moss,
  },
  itemsSection: {
    marginBottom: 14,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
  },
  itemsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  itemPreview: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 5,
    lineHeight: 18,
  },
  moreItems: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
    fontStyle: 'italic',
  },
  shopButton: {
    backgroundColor: Colors.oak,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textOnAccent,
  },
});
