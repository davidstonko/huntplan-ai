/**
 * @file SearchableCountyPicker.tsx
 * @description Reusable searchable county picker component for Maryland.
 * Displays current selection button that opens a modal with search bar and county list.
 *
 * @module Components/Common
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  SafeAreaView,
} from 'react-native';
import Colors from '../../theme/colors';

interface SearchableCountyPickerProps {
  value: string;
  onChange: (county: string) => void;
  label?: string;
}

// Maryland counties
const MD_COUNTIES = [
  'Allegany',
  'Anne Arundel',
  'Baltimore',
  'Baltimore City',
  'Calvert',
  'Caroline',
  'Carroll',
  'Cecil',
  'Charles',
  'Dorchester',
  'Frederick',
  'Garrett',
  'Harford',
  'Howard',
  'Kent',
  'Montgomery',
  "Prince George's",
  "Queen Anne's",
  'Somerset',
  "St. Mary's",
  'Talbot',
  'Washington',
  'Wicomico',
  'Worcester',
];

/**
 * SearchableCountyPicker Component
 *
 * Props:
 *   - value: Currently selected county name
 *   - onChange: Callback when county is selected
 *   - label: Optional label to display above the picker
 */
export const SearchableCountyPicker: React.FC<SearchableCountyPickerProps> = ({
  value,
  onChange,
  label,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Filter counties based on search text
  const filteredCounties = useMemo(() => {
    if (!searchText.trim()) {
      return MD_COUNTIES;
    }

    const lowerSearch = searchText.toLowerCase();
    return MD_COUNTIES.filter((county) =>
      county.toLowerCase().includes(lowerSearch)
    );
  }, [searchText]);

  const handleSelectCounty = (county: string) => {
    onChange(county);
    setShowModal(false);
    setSearchText('');
  };

  const handleClose = () => {
    setShowModal(false);
    setSearchText('');
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            !value && styles.buttonPlaceholder,
          ]}
        >
          {value || 'Select a county...'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select County</Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search counties..."
              placeholderTextColor={Colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* County List */}
          <FlatList
            data={filteredCounties}
            keyExtractor={(item) => item}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.countyItem,
                  index < filteredCounties.length - 1 && styles.countyItemBorder,
                  value === item && styles.countyItemSelected,
                ]}
                onPress={() => handleSelectCounty(item)}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.countyText,
                    value === item && styles.countyTextSelected,
                  ]}
                >
                  {item}
                </Text>
                {value === item && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
            scrollEnabled
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No counties match "{searchText}"</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 12,
  },
  buttonText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  buttonPlaceholder: {
    color: Colors.textMuted,
  },
  chevron: {
    fontSize: 18,
    color: Colors.textMuted,
    marginLeft: 8,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '600',
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 4,
  },
  clearButton: {
    fontSize: 16,
    color: Colors.textMuted,
    marginLeft: 8,
  },

  // County List
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
  },
  countyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  countyItemSelected: {
    backgroundColor: Colors.forestDark,
  },
  countyText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  countyTextSelected: {
    fontWeight: '700',
    color: Colors.moss,
  },
  checkmark: {
    fontSize: 16,
    color: Colors.moss,
    fontWeight: '700',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
