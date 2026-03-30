import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Colors from '../../theme/colors';

// ── Filter State Types ──
export interface FilterState {
  landTypes: {
    wma: boolean;
    cwma: boolean;
    cfl: boolean;
    sf: boolean;
    sp: boolean;
    nrma: boolean;
    nea: boolean;
    fma: boolean;
    range: boolean;
  };
  species: {
    deer: boolean;
    turkey: boolean;
    waterfowl: boolean;
    bear: boolean;
    smallGame: boolean;
  };
  weapons: {
    archery: boolean;
    firearms: boolean;
    muzzleloader: boolean;
  };
  access: {
    sundayHunting: boolean;
    noReservation: boolean;
    mobilityAccess: boolean;
  };
}

interface MapFilterPanelProps {
  onFilterChange?: (filters: FilterState) => void;
  landCount?: number;
  filteredCount?: number;
}

const defaultFilters: FilterState = {
  landTypes: {
    wma: true,
    cwma: true,
    cfl: true,
    sf: true,
    sp: true,
    nrma: true,
    nea: true,
    fma: true,
    range: true,
  },
  species: {
    deer: false,
    turkey: false,
    waterfowl: false,
    bear: false,
    smallGame: false,
  },
  weapons: {
    archery: false,
    firearms: false,
    muzzleloader: false,
  },
  access: {
    sundayHunting: false,
    noReservation: false,
    mobilityAccess: false,
  },
};

const MapFilterPanel: React.FC<MapFilterPanelProps> = ({
  onFilterChange,
  landCount,
  filteredCount,
}) => {
  const expandAnim = useRef(new Animated.Value(0)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, expandAnim]);

  const updateFilter = (path: string[], value: boolean) => {
    const newFilters = JSON.parse(JSON.stringify(filters));
    let current = newFilters;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const panelWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 290],
  });

  const contentOpacity = expandAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.3, 1],
  });

  const isFiltered =
    Object.values(filters.species).some(Boolean) ||
    Object.values(filters.weapons).some(Boolean) ||
    Object.values(filters.access).some(Boolean);

  return (
    <Animated.View style={[styles.panelContainer, { width: panelWidth }]}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleText}>
          Filters{isFiltered ? ' ●' : ''}
        </Text>
        <Text style={[styles.arrowIcon, isExpanded && styles.arrowIconExpanded]}>
          ▶
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View style={[styles.contentContainer, { opacity: contentOpacity }]}>
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
            style={styles.scrollView}
          >
            {/* Land Type Filters */}
            <View style={styles.filterGroup}>
              <Text style={styles.groupTitle}>Land Type</Text>
              <View style={styles.chipRow}>
                <FilterChip label="WMA" active={filters.landTypes.wma}
                  onToggle={() => updateFilter(['landTypes', 'wma'], !filters.landTypes.wma)} />
                <FilterChip label="CWMA" active={filters.landTypes.cwma}
                  onToggle={() => updateFilter(['landTypes', 'cwma'], !filters.landTypes.cwma)} />
                <FilterChip label="CFL" active={filters.landTypes.cfl}
                  onToggle={() => updateFilter(['landTypes', 'cfl'], !filters.landTypes.cfl)} />
              </View>
              <View style={styles.chipRow}>
                <FilterChip label="Forest" active={filters.landTypes.sf}
                  onToggle={() => updateFilter(['landTypes', 'sf'], !filters.landTypes.sf)} />
                <FilterChip label="Park" active={filters.landTypes.sp}
                  onToggle={() => updateFilter(['landTypes', 'sp'], !filters.landTypes.sp)} />
                <FilterChip label="NRMA" active={filters.landTypes.nrma}
                  onToggle={() => updateFilter(['landTypes', 'nrma'], !filters.landTypes.nrma)} />
              </View>
              <View style={styles.chipRow}>
                <FilterChip label="NEA" active={filters.landTypes.nea}
                  onToggle={() => updateFilter(['landTypes', 'nea'], !filters.landTypes.nea)} />
                <FilterChip label="FMA" active={filters.landTypes.fma}
                  onToggle={() => updateFilter(['landTypes', 'fma'], !filters.landTypes.fma)} />
                <FilterChip label="Ranges" active={filters.landTypes.range}
                  onToggle={() => updateFilter(['landTypes', 'range'], !filters.landTypes.range)} />
              </View>
            </View>

            {/* Species Filters */}
            <View style={styles.filterGroup}>
              <Text style={styles.groupTitle}>Species</Text>
              <View style={styles.chipRow}>
                <FilterChip label="Deer" active={filters.species.deer}
                  onToggle={() => updateFilter(['species', 'deer'], !filters.species.deer)} />
                <FilterChip label="Turkey" active={filters.species.turkey}
                  onToggle={() => updateFilter(['species', 'turkey'], !filters.species.turkey)} />
                <FilterChip label="Waterfowl" active={filters.species.waterfowl}
                  onToggle={() => updateFilter(['species', 'waterfowl'], !filters.species.waterfowl)} />
              </View>
              <View style={styles.chipRow}>
                <FilterChip label="Bear" active={filters.species.bear}
                  onToggle={() => updateFilter(['species', 'bear'], !filters.species.bear)} />
                <FilterChip label="Small Game" active={filters.species.smallGame}
                  onToggle={() => updateFilter(['species', 'smallGame'], !filters.species.smallGame)} />
              </View>
            </View>

            {/* Weapon Filters */}
            <View style={styles.filterGroup}>
              <Text style={styles.groupTitle}>Weapon</Text>
              <View style={styles.chipRow}>
                <FilterChip label="Archery" active={filters.weapons.archery}
                  onToggle={() => updateFilter(['weapons', 'archery'], !filters.weapons.archery)} />
                <FilterChip label="Firearms" active={filters.weapons.firearms}
                  onToggle={() => updateFilter(['weapons', 'firearms'], !filters.weapons.firearms)} />
                <FilterChip label="Muzzleloader" active={filters.weapons.muzzleloader}
                  onToggle={() => updateFilter(['weapons', 'muzzleloader'], !filters.weapons.muzzleloader)} />
              </View>
            </View>

            {/* Access Filters */}
            <View style={styles.filterGroup}>
              <Text style={styles.groupTitle}>Access</Text>
              <View style={styles.chipRow}>
                <FilterChip label="Sunday OK" active={filters.access.sundayHunting}
                  onToggle={() => updateFilter(['access', 'sundayHunting'], !filters.access.sundayHunting)} />
                <FilterChip label="No Res." active={filters.access.noReservation}
                  onToggle={() => updateFilter(['access', 'noReservation'], !filters.access.noReservation)} />
              </View>
              <View style={styles.chipRow}>
                <FilterChip label="ADA" active={filters.access.mobilityAccess}
                  onToggle={() => updateFilter(['access', 'mobilityAccess'], !filters.access.mobilityAccess)} />
              </View>
            </View>

            {/* Count summary */}
            {filteredCount !== undefined && landCount !== undefined && (
              <View style={styles.countSummary}>
                <Text style={styles.countText}>
                  {filteredCount} of {landCount} lands
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </Animated.View>
  );
};

// ── Filter Chip Component ──
interface FilterChipProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onToggle }) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipActive]}
    onPress={onToggle}
    activeOpacity={0.7}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  panelContainer: {
    position: 'absolute',
    left: 8,
    bottom: 120,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.moss,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 10,
    maxHeight: 480,
  },
  toggleButton: {
    height: 50,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  arrowIcon: {
    fontSize: 10,
    color: Colors.sage,
    marginTop: 2,
  },
  arrowIconExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 16,
  },
  filterGroup: {
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.tan,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.clay,
    backgroundColor: Colors.surface,
    minWidth: 42,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.sage,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.textOnAccent,
  },
  countSummary: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    alignItems: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.sage,
  },
});

export default MapFilterPanel;
