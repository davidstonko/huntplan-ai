/**
 * ProductCard.tsx — Amazon product display component
 *
 * Shows product image placeholder (emoji by category), title, price range,
 * star rating, and "View on Amazon" button. Two layouts: regular (full card)
 * and compact (single row for inline chat use).
 *
 * Used by gear recommendations, AI chat suggestions, and product lists.
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
import { AmazonProductRef } from '../../types/gear';

interface ProductCardProps {
  /** Amazon product reference with affiliate link */
  product: AmazonProductRef;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Compact mode (single row for AI chat) */
  compact?: boolean;
  /** Optional style override */
  style?: ViewStyle;
}

/**
 * Category to emoji mapping
 */
const categoryEmojis: Record<AmazonProductRef['category'], string> = {
  fly: '🪰',
  bait: '🪱',
  lure: '🎣',
  tackle: '🧰',
  kit: '📦',
  accessory: '⚙️',
  clothing: '👕',
  scent: '💨',
  call: '📢',
  optics: '🔭',
  stand: '🪜',
  decoy: '🦆',
};

/**
 * ProductCard component — displays Amazon product with affiliate link
 *
 * Regular mode: Full card with image emoji, title, price, rating, and CTA
 * Compact mode: Single row for inline recommendations in AI chat
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  compact = false,
  style,
}) => {
  const emoji = categoryEmojis[product.category] || '🛒';

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    // Open affiliate link
    Linking.openURL(product.affiliateUrl).catch(() => {
      console.warn('Failed to open Amazon link');
    });
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, style]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityLabel={`Product: ${product.title}`}
        accessibilityRole="button"
        accessibilityHint={`Price: ${product.priceRange}. Double tap to view on Amazon.`}
      >
        <Text style={styles.compactEmoji}>{emoji}</Text>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {product.title}
          </Text>
          <Text style={styles.compactPrice}>{product.priceRange}</Text>
        </View>
        {product.rating && (
          <Text style={styles.compactRating}>
            ★ {product.rating.toFixed(1)}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // Regular card layout
  return (
    <TouchableOpacity
      style={[styles.cardContainer, style]}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityLabel={`Product: ${product.title}`}
      accessibilityRole="button"
      accessibilityHint={`Price: ${product.priceRange}. Double tap to view on Amazon.`}
    >
      {/* Image placeholder section */}
      <View style={styles.imageSection}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* Content section */}
      <View style={styles.contentSection}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>

        {/* Price and rating row */}
        <View style={styles.metaRow}>
          <Text style={styles.priceRange}>{product.priceRange}</Text>
          {product.rating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.stars}>
                {'★'.repeat(Math.round(product.rating))}
              </Text>
              <Text style={styles.ratingValue}>
                {product.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Review count */}
        {product.reviewCount && (
          <Text style={styles.reviewCount}>
            {product.reviewCount.toLocaleString()} reviews
          </Text>
        )}
      </View>

      {/* CTA Button */}
      <View style={styles.ctaSection}>
        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>View on Amazon</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ── Regular Card Styles ──
  cardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 12,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  imageSection: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 60,
  },
  contentSection: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceRange: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.tan,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stars: {
    fontSize: 12,
    color: Colors.amber,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.amber,
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  ctaSection: {
    width: '100%',
  },
  ctaButton: {
    backgroundColor: Colors.oak,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textOnAccent,
  },

  // ── Compact Mode Styles ──
  compactContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  compactEmoji: {
    fontSize: 24,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  compactPrice: {
    fontSize: 12,
    color: Colors.tan,
    fontWeight: '600',
  },
  compactRating: {
    fontSize: 12,
    color: Colors.amber,
    fontWeight: '600',
  },
});
