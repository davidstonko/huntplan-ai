/**
 * @file GearChecklist.tsx
 * @description Reusable gear/pack checklist component for hunt preparation.
 * Allows users to check off items, add custom items, and track progress per species.
 * Persists to AsyncStorage keyed by planId.
 *
 * @module Components/Common
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../theme/colors';

// ── Default gear items per species ──
const DEFAULT_GEAR_BY_SPECIES: Record<string, string[]> = {
  Deer: [
    'Hunting License',
    'Deer Tags',
    'Blaze Orange Vest',
    'Blaze Orange Hat',
    'Binoculars',
    'Rangefinder',
    'Knife',
    'Drag Rope',
    'Game Bags',
    'Water',
    'Snacks',
    'First Aid Kit',
    'Phone Charger',
    'Headlamp',
  ],
  Turkey: [
    'Hunting License',
    'Turkey Tags',
    'Turkey Calls (Box/Slate)',
    'Decoys',
    'Camo Face Mask',
    'Camo Gloves',
    'Shotgun Shells',
    'Pruning Shears',
    'Seat Cushion',
    'Water',
    'Snacks',
    'First Aid Kit',
    'Phone Charger',
    'Headlamp',
  ],
  Waterfowl: [
    'Hunting License',
    'Duck Stamp',
    'HIP Registration',
    'Decoys',
    'Waders',
    'Duck Calls',
    'Steel Shot Shells',
    'Blind Bag',
    'Thermos',
    'Water',
    'Snacks',
    'First Aid Kit',
    'Phone Charger',
    'Headlamp',
  ],
  'Small Game': [
    'Hunting License',
    'Game Tags',
    'Weapon (Rifle/Shotgun)',
    'Ammunition',
    'Water',
    'Snacks',
    'First Aid Kit',
    'Phone Charger',
    'Headlamp',
    'Game Bag',
    'Knife',
  ],
  Bear: [
    'Hunting License',
    'Bear Tag',
    'Blaze Orange Vest',
    'Blaze Orange Hat',
    'Weapon',
    'Ammunition',
    'Binoculars',
    'Rangefinder',
    'Water',
    'Snacks',
    'First Aid Kit',
    'Phone Charger',
    'Headlamp',
    'Game Bag',
  ],
};

interface GearItem {
  id: string;
  name: string;
  checked: boolean;
  custom: boolean; // true if user-added
}

interface GearChecklistProps {
  species?: string;
  planId?: string;
  onClose?: () => void;
}

/**
 * GearChecklist Component
 *
 * Displays a checklist of gear items for a given species.
 * Users can check items off, add custom items, and remove items.
 * State is persisted to AsyncStorage keyed by planId (or a default key if no planId).
 *
 * @param {GearChecklistProps} props - Component props
 * @returns {JSX.Element} Scrollable gear checklist
 */
export const GearChecklist: React.FC<GearChecklistProps> = ({
  species = 'Deer',
  planId = 'default',
  onClose,
}) => {
  const [items, setItems] = useState<GearItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const storageKey = `@gear_checklist_${planId}`;

  // Load items from AsyncStorage on mount or when species changes
  useEffect(() => {
    loadItems();
  }, [species, planId]);

  const loadItems = async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        // Initialize with default items for species
        const defaults = DEFAULT_GEAR_BY_SPECIES[species] || DEFAULT_GEAR_BY_SPECIES.Deer;
        const newItems: GearItem[] = defaults.map((name, idx) => ({
          id: `default_${idx}`,
          name,
          checked: false,
          custom: false,
        }));
        setItems(newItems);
        await AsyncStorage.setItem(storageKey, JSON.stringify(newItems));
      }
    } catch (error) {
      console.error('Failed to load gear checklist:', error);
      // Fallback to defaults
      const defaults = DEFAULT_GEAR_BY_SPECIES[species] || DEFAULT_GEAR_BY_SPECIES.Deer;
      const newItems: GearItem[] = defaults.map((name, idx) => ({
        id: `default_${idx}`,
        name,
        checked: false,
        custom: false,
      }));
      setItems(newItems);
    }
  };

  // Save items to AsyncStorage whenever they change
  const saveItems = async (newItems: GearItem[]) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newItems));
    } catch (error) {
      console.error('Failed to save gear checklist:', error);
    }
  };

  const toggleItem = (itemId: string) => {
    const updated = items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setItems(updated);
    saveItems(updated);
  };

  const addCustomItem = () => {
    if (!newItemText.trim()) return;

    const newItem: GearItem = {
      id: `custom_${Date.now()}`,
      name: newItemText.trim(),
      checked: false,
      custom: true,
    };

    const updated = [...items, newItem];
    setItems(updated);
    saveItems(updated);
    setNewItemText('');
  };

  const removeItem = (itemId: string) => {
    const updated = items.filter((item) => item.id !== itemId);
    setItems(updated);
    saveItems(updated);
  };

  const checkedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const renderItem = ({ item }: { item: GearItem }) => (
    <View style={styles.itemRow}>
      <TouchableOpacity
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
        onPress={() => toggleItem(item.id)}
        accessibilityLabel={`${item.name} checkbox`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
      >
        {item.checked && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <Text
        style={[
          styles.itemText,
          item.checked && styles.itemTextChecked,
          item.custom && styles.itemCustom,
        ]}
      >
        {item.name}
      </Text>

      {item.custom && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeItem(item.id)}
          accessibilityLabel={`Remove ${item.name}`}
          accessibilityRole="button"
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with progress */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gear Checklist</Text>
        <Text style={styles.headerSubtitle}>{species}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {checkedCount} of {totalCount} items
          </Text>
        </View>
      </View>

      {/* Gear items list */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Add custom item section */}
      <View style={styles.addItemSection}>
        <TextInput
          style={styles.addItemInput}
          placeholder="Add custom item"
          placeholderTextColor={Colors.textMuted}
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={addCustomItem}
        />
        <TouchableOpacity
          style={styles.addItemBtn}
          onPress={addCustomItem}
          disabled={!newItemText.trim()}
          accessibilityLabel="Add custom item"
          accessibilityRole="button"
        >
          <Text style={styles.addItemBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Close button */}
      {onClose && (
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          accessibilityLabel="Close gear checklist"
          accessibilityRole="button"
        >
          <Text style={styles.closeBtnText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },

  header: {
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },

  progressContainer: {
    gap: 8,
  },

  progressBarBg: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
  },

  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  listContent: {
    paddingBottom: 16,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
    gap: 12,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.oak,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },

  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },

  checkmark: {
    color: Colors.textOnAccent,
    fontWeight: 'bold',
    fontSize: 14,
  },

  itemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  itemTextChecked: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },

  itemCustom: {
    fontStyle: 'italic',
    color: Colors.tan,
  },

  removeBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  removeBtnText: {
    color: Colors.rust,
    fontSize: 16,
    fontWeight: 'bold',
  },

  addItemSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  addItemInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.clay,
    borderRadius: 6,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },

  addItemBtn: {
    width: 40,
    height: 40,
    backgroundColor: Colors.oak,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  addItemBtnText: {
    color: Colors.textOnAccent,
    fontSize: 18,
    fontWeight: 'bold',
  },

  closeBtn: {
    height: 44,
    backgroundColor: Colors.oak,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeBtnText: {
    color: Colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GearChecklist;
