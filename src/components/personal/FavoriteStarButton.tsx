/**
 * FavoriteStarButton — small inline toggle for the Favorites/Pinned set.
 *
 * Drop into any detail/edit screen for a personal-layer row. Calls
 * `useFavorites().toggleFavorite(kind, id)` on tap. Renders an empty star
 * (☆) when not favorited and a filled gold star (★) when favorited.
 *
 * Two variants:
 *   - `compact` (default false): pill-shaped button with the star + label
 *   - compact = true: just the star glyph, suitable for a header row
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.16.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Colors from '../../theme/colors';
import { useFavorites } from '../../context/FavoritesContext';
import type { FavoriteKind } from '../../types/favorite';

interface Props {
  kind: FavoriteKind;
  id: string | undefined | null;
  /** When true, render a tight glyph-only button for header rows. */
  compact?: boolean;
  /** Label to show in the non-compact variant. Defaults to "PIN". */
  pinLabel?: string;
  /** Label to show when favorited. Defaults to "PINNED". */
  pinnedLabel?: string;
  /** Optional override for the outer container style. */
  style?: ViewStyle;
}

export default function FavoriteStarButton({
  kind,
  id,
  compact = false,
  pinLabel = 'PIN',
  pinnedLabel = 'PINNED',
  style,
}: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();

  // If id isn't ready yet (caller is still hydrating an edit screen),
  // render nothing rather than a misleading star against an unknown row.
  if (!id) return null;

  const starred = isFavorite(kind, id);
  const onPress = () => {
    toggleFavorite(kind, id);
  };

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={12}
        style={[
          styles.compactBase,
          starred ? styles.compactStarred : styles.compactEmpty,
          style,
        ]}
      >
        <Text
          style={[
            styles.compactGlyph,
            starred ? styles.compactGlyphStarred : styles.compactGlyphEmpty,
          ]}
        >
          {starred ? '\u2605' : '\u2606'}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pillBase,
        starred ? styles.pillStarred : styles.pillEmpty,
        style,
      ]}
    >
      <Text
        style={[
          styles.pillGlyph,
          starred ? styles.pillGlyphStarred : styles.pillGlyphEmpty,
        ]}
      >
        {starred ? '\u2605' : '\u2606'}
      </Text>
      <Text
        style={[
          styles.pillLabel,
          starred ? styles.pillLabelStarred : styles.pillLabelEmpty,
        ]}
      >
        {starred ? pinnedLabel : pinLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compactBase: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  compactEmpty: {
    backgroundColor: 'transparent',
    borderColor: Colors.mud,
  },
  compactStarred: {
    backgroundColor: Colors.surface,
    borderColor: Colors.mdGold,
  },
  compactGlyph: {
    fontSize: 20,
    fontWeight: '900',
  },
  compactGlyphEmpty: {
    color: Colors.textMuted,
  },
  compactGlyphStarred: {
    color: Colors.mdGold,
  },
  pillBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  pillEmpty: {
    backgroundColor: Colors.surface,
    borderColor: Colors.mud,
  },
  pillStarred: {
    backgroundColor: Colors.surface,
    borderColor: Colors.mdGold,
  },
  pillGlyph: {
    fontSize: 16,
    fontWeight: '900',
    marginRight: 8,
  },
  pillGlyphEmpty: {
    color: Colors.textMuted,
  },
  pillGlyphStarred: {
    color: Colors.mdGold,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pillLabelEmpty: {
    color: Colors.textSecondary,
  },
  pillLabelStarred: {
    color: Colors.mdGold,
  },
});
