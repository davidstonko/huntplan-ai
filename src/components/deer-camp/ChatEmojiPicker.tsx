/**
 * ChatEmojiPicker — Outdoor & Maryland themed emoji quick-send panel.
 * Categories: Wildlife, Fishing, Maryland, Weather, Gear, Reactions
 * Emojis render at 2x when sent as standalone messages.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Colors from '../../theme/colors';

export interface EmojiCategory {
  label: string;
  icon: string;
  emojis: string[];
}

export const OUTDOOR_EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    label: 'Wildlife',
    icon: '\uD83E\uDD8C',
    emojis: [
      '\uD83E\uDD8C', // deer
      '\uD83E\uDD83', // turkey
      '\uD83E\uDDAC', // bison
      '\uD83D\uDC3B', // bear
      '\uD83E\uDD86', // duck
      '\uD83E\uDD85', // eagle
      '\uD83D\uDC3A', // wolf
      '\uD83E\uDD89', // owl
      '\uD83D\uDC07', // rabbit
      '\uD83E\uDD9D', // raccoon
      '\uD83E\uDDA8', // skunk
      '\uD83D\uDC3F\uFE0F', // chipmunk
      '\uD83E\uDD9C', // parrot
      '\uD83E\uDD87', // bat
      '\uD83D\uDC0D', // snake
      '\uD83D\uDC22', // turtle
    ],
  },
  {
    label: 'Fishing',
    icon: '\uD83C\uDFA3',
    emojis: [
      '\uD83C\uDFA3', // fishing pole
      '\uD83D\uDC1F', // fish
      '\uD83D\uDC20', // tropical fish
      '\uD83D\uDC21', // blowfish
      '\uD83E\uDD88', // shark
      '\uD83D\uDC19', // octopus
      '\uD83E\uDD90', // shrimp
      '\uD83E\uDD80', // crab
      '\uD83E\uDEBC', // jellyfish
      '\uD83D\uDC1A', // shell
      '\u2693',       // anchor
      '\uD83D\uDEA3', // rowboat
      '\u26F5',       // sailboat
      '\uD83C\uDF0A', // wave
      '\uD83E\uDEDD', // coral
      '\uD83E\uDD9E', // lobster
    ],
  },
  {
    label: 'Maryland',
    icon: '\uD83E\uDD80',
    emojis: [
      '\uD83E\uDD80', // crab (MD icon)
      '\u2764\uFE0F', // red heart (MD flag)
      '\uD83D\uDC9B', // yellow heart (MD gold)
      '\uD83D\uDDA4', // black heart (Calvert)
      '\uD83E\uDD0D', // white heart (Calvert)
      '\u2B50',       // star
      '\uD83C\uDFC6', // trophy
      '\uD83C\uDDE8\u200D', // flag placeholder
      '\uD83E\uDD1D', // handshake
      '\uD83C\uDF3E', // rice (bay grass)
      '\uD83C\uDF3F', // herb
      '\uD83C\uDF44', // mushroom
      '\uD83E\uDD6A', // sandwich (crab cake)
      '\uD83C\uDF4E', // apple (MD orchards)
      '\u26FE',       // fleur-de-lis (colonial)
      '\uD83D\uDE4C', // raised hands
    ],
  },
  {
    label: 'Weather',
    icon: '\u26C5',
    emojis: [
      '\u2600\uFE0F', // sun
      '\u26C5',       // partly cloudy
      '\u2601\uFE0F', // cloud
      '\uD83C\uDF27\uFE0F', // rain
      '\u26C8\uFE0F', // thunder
      '\uD83C\uDF28\uFE0F', // snow
      '\uD83C\uDF2C\uFE0F', // wind face
      '\uD83C\uDF2B\uFE0F', // fog
      '\uD83C\uDF21\uFE0F', // thermometer
      '\uD83C\uDF19', // crescent moon
      '\uD83C\uDF1E', // sun with face
      '\uD83C\uDF24\uFE0F', // sun behind small cloud
      '\u2744\uFE0F', // snowflake
      '\uD83C\uDF0A', // wave (tides)
      '\uD83C\uDF05', // sunrise
      '\uD83C\uDF06', // sunset
    ],
  },
  {
    label: 'Gear',
    icon: '\uD83C\uDFF9',
    emojis: [
      '\uD83C\uDFF9', // bow and arrow
      '\uD83D\uDD2B', // water pistol (gun)
      '\uD83E\uDE93', // axe
      '\uD83D\uDD2A', // knife
      '\uD83E\uDDF2', // magnet
      '\uD83E\uDDED', // compass
      '\uD83D\uDDFA\uFE0F', // world map
      '\uD83C\uDFD5\uFE0F', // camping tent
      '\uD83D\uDD25', // fire
      '\uD83D\uDCA1', // flashlight idea
      '\uD83D\uDE9C', // tractor (ATV)
      '\uD83E\uDE78', // boot
      '\uD83E\uDDE4', // gloves
      '\uD83C\uDF32', // tree
      '\uD83E\uDDF0', // toolbox
      '\uD83D\uDCF7', // camera
    ],
  },
  {
    label: 'Reactions',
    icon: '\uD83D\uDC4D',
    emojis: [
      '\uD83D\uDC4D', // thumbs up
      '\uD83D\uDC4E', // thumbs down
      '\uD83D\uDD25', // fire
      '\uD83D\uDE02', // laugh
      '\uD83D\uDE32', // astonished
      '\uD83D\uDE0E', // sunglasses
      '\uD83E\uDD2F', // mind blown
      '\uD83D\uDCAF', // 100
      '\uD83C\uDF89', // party
      '\u2764\uFE0F', // heart
      '\uD83D\uDE4F', // folded hands
      '\uD83D\uDCAA', // flexed bicep
      '\uD83E\uDD2C', // angry face
      '\uD83D\uDE22', // crying
      '\uD83E\uDD14', // thinking
      '\u270C\uFE0F', // peace
    ],
  },
];

/** Quick-reaction emojis for long-press message reactions */
export const QUICK_REACTIONS = [
  '\uD83D\uDC4D', // thumbs up
  '\uD83E\uDD8C', // deer
  '\uD83D\uDD25', // fire
  '\uD83D\uDE02', // laugh
  '\u2764\uFE0F', // heart
  '\uD83D\uDCAF', // 100
];

interface ChatEmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  visible: boolean;
}

export default function ChatEmojiPicker({ onSelect, onClose, visible }: ChatEmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  if (!visible) return null;

  const category = OUTDOOR_EMOJI_CATEGORIES[activeCategory];

  return (
    <View style={styles.container}>
      {/* Category tabs */}
      <View style={styles.categoryRow}>
        {OUTDOOR_EMOJI_CATEGORIES.map((cat, idx) => (
          <TouchableOpacity
            key={cat.label}
            style={[styles.categoryTab, idx === activeCategory && styles.categoryTabActive]}
            onPress={() => setActiveCategory(idx)}
            accessibilityLabel={cat.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: idx === activeCategory }}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          accessibilityLabel="Close emoji picker"
          accessibilityRole="button"
        >
          <Text style={styles.closeBtnText}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      {/* Category label */}
      <Text style={styles.categoryLabel}>{category.label}</Text>

      {/* Emoji grid */}
      <ScrollView
        style={styles.emojiGrid}
        contentContainerStyle={styles.emojiGridContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emojiRow}>
          {category.emojis.map((emoji, idx) => (
            <TouchableOpacity
              key={`${category.label}_${idx}`}
              style={styles.emojiBtn}
              onPress={() => onSelect(emoji)}
              accessibilityLabel={`Send ${emoji}`}
              accessibilityRole="button"
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    maxHeight: 220,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 6,
    gap: 2,
  },
  categoryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryTabActive: {
    backgroundColor: Colors.surface,
  },
  categoryIcon: {
    fontSize: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  closeBtnText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 2,
  },
  emojiGrid: {
    paddingHorizontal: 6,
  },
  emojiGridContent: {
    paddingBottom: 8,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emojiBtn: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 26,
  },
});
