/**
 * CampGearScreen — Camp gear checklist by category.
 *
 * Phase 5A implementation:
 *   - Filters GEAR_CATALOG items where activity === 'camp' | 'both'
 *   - Groups by category (shelter, sleep, cook, clothing, safety, tools, hygiene)
 *   - Tap item to open Amazon affiliate link
 *   - Read-only reference list (interactive trip-bound version planned post-V2.2.0)
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Colors from '../theme/colors';
import { GEAR_CATALOG, amazonLink } from './StarterGearScreen';

type GearCategory = 'shelter' | 'sleep' | 'cook' | 'clothing' | 'safety' | 'tools' | 'hygiene' | 'navigation' | 'pack';

const CATEGORY_LABELS: Record<GearCategory, string> = {
  shelter: 'Shelter & Shade',
  sleep: 'Sleep System',
  cook: 'Cooking',
  clothing: 'Clothing & Layers',
  safety: 'Safety & First Aid',
  tools: 'Tools & Repair',
  hygiene: 'Hygiene & Personal',
  navigation: 'Navigation',
  pack: 'Packs & Bags',
};

export default function CampGearScreen() {
  const [expandedCategories, setExpandedCategories] = useState<Set<GearCategory>>(
    new Set(['shelter', 'sleep', 'cook', 'clothing', 'safety']),
  );

  // Filter GEAR_CATALOG for camp items
  const campGear = useMemo(() => {
    return GEAR_CATALOG.filter((item) => item.activity === 'camp' || item.activity === 'both');
  }, []);

  // Group by category
  const groupedGear = useMemo(() => {
    const groups: Record<GearCategory, typeof campGear> = {
      shelter: [],
      sleep: [],
      cook: [],
      clothing: [],
      safety: [],
      tools: [],
      hygiene: [],
      navigation: [],
      pack: [],
    };

    campGear.forEach((item) => {
      const cat = item.category as GearCategory;
      if (groups[cat]) {
        groups[cat].push(item);
      }
    });

    return groups;
  }, [campGear]);

  const toggleCategory = useCallback((cat: GearCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const openAffiliateLink = useCallback((item: typeof campGear[0]) => {
    const url = amazonLink({ asin: item.asin, query: item.name });
    Linking.openURL(url).catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Camp Gear Checklist</Text>
      <Text style={styles.sub}>
        Curated camping gear by category. Tap any item to browse on Amazon.
        Sorted by tier (budget → premium).
      </Text>

      {(Object.keys(CATEGORY_LABELS) as GearCategory[]).map((cat) => {
        const items = groupedGear[cat];
        if (!items || items.length === 0) return null;

        const isExpanded = expandedCategories.has(cat);

        return (
          <View key={cat} style={styles.categorySection}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryTitle}>{CATEGORY_LABELS[cat]}</Text>
              <Text style={styles.categoryToggle}>{isExpanded ? '−' : '+'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.itemsContainer}>
                {items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.gearItem, idx === items.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => openAffiliateLink(item)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <View style={styles.itemMeta}>
                        <Text style={styles.itemTier}>
                          {item.tier.charAt(0).toUpperCase() + item.tier.slice(1)}
                        </Text>
                        <Text style={styles.itemPrice}>{item.estimatedPrice}</Text>
                      </View>
                    </View>
                    <Text style={styles.itemArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          As an Amazon Associate, MDHuntFishOutdoors earns from qualifying purchases. Direct links shown when available.
        </Text>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  sub: { fontSize: 13, color: Colors.textMuted, lineHeight: 19, marginBottom: 20 },
  categorySection: { marginBottom: 12 },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  categoryTitle: { fontSize: 13, fontWeight: '700', color: Colors.mdGold },
  categoryToggle: { fontSize: 16, color: Colors.textSecondary },
  itemsContainer: { marginTop: 8 },
  gearItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  itemName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  itemDescription: { fontSize: 11, color: Colors.textSecondary, lineHeight: 16, marginBottom: 6 },
  itemMeta: { flexDirection: 'row', gap: 8 },
  itemTier: { fontSize: 10, color: Colors.tan, fontWeight: '600' },
  itemPrice: { fontSize: 10, color: Colors.lichen, fontWeight: '600' },
  itemArrow: { fontSize: 18, color: Colors.textMuted, marginLeft: 8 },
  footer: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.mud },
  footerText: { fontSize: 11, color: Colors.textMuted, lineHeight: 16, fontStyle: 'italic' },
});
