/**
 * @file CalendarDatePicker.tsx
 * @description Reusable calendar date picker component for iOS.
 * Displays a formatted date button that opens a modal with a simple date picker
 * using month/day/year selection wheels.
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
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Colors from '../../theme/colors';

interface CalendarDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * Format a Date object to "MMM D, YYYY" format (e.g., "Nov 15, 2025")
 */
function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Generate array of valid days for a given month/year
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * CalendarDatePicker Component
 *
 * Props:
 *   - value: Current Date value
 *   - onChange: Callback when date is selected
 *   - label: Optional label to display above the picker
 *   - minimumDate: Optional minimum selectable date
 *   - maximumDate: Optional maximum selectable date
 */
export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  value,
  onChange,
  label,
  minimumDate,
  maximumDate,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedDay, setSelectedDay] = useState(value.getDate());
  const [selectedYear, setSelectedYear] = useState(value.getFullYear());

  const currentYear = new Date().getFullYear();
  const minYear = minimumDate?.getFullYear() ?? currentYear - 5;
  const maxYear = maximumDate?.getFullYear() ?? currentYear + 5;

  // Generate arrays for picker wheels
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      label: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' }),
      value: i,
    }));
  }, []);

  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: String(i + 1),
      value: i + 1,
    }));
  }, [selectedYear, selectedMonth]);

  const years = useMemo(() => {
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
      label: String(minYear + i),
      value: minYear + i,
    }));
  }, [minYear, maxYear]);

  const handleConfirm = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    onChange(newDate);
    setShowModal(false);
  };

  const handleCancel = () => {
    setSelectedMonth(value.getMonth());
    setSelectedDay(value.getDate());
    setSelectedYear(value.getFullYear());
    setShowModal(false);
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>{formatDateDisplay(value)}</Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmButton}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerRow}>
            {/* Month Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Month</Text>
              <ScrollView
                scrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {months.map((month) => (
                  <TouchableOpacity
                    key={month.value}
                    style={[
                      styles.pickerItem,
                      selectedMonth === month.value && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedMonth(month.value)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedMonth === month.value && styles.pickerItemTextSelected,
                      ]}
                    >
                      {month.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Day</Text>
              <ScrollView
                scrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {days.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.pickerItem,
                      selectedDay === day.value && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedDay(day.value)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedDay === day.value && styles.pickerItemTextSelected,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Year Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>Year</Text>
              <ScrollView
                scrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {years.map((year) => (
                  <TouchableOpacity
                    key={year.value}
                    style={[
                      styles.pickerItem,
                      selectedYear === year.value && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedYear(year.value)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedYear === year.value && styles.pickerItemTextSelected,
                      ]}
                    >
                      {year.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Selected Date:</Text>
            <Text style={styles.previewDate}>
              {formatDateDisplay(new Date(selectedYear, selectedMonth, selectedDay))}
            </Text>
          </View>
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
    fontSize: 14,
    color: Colors.textPrimary,
  },
  calendarIcon: {
    fontSize: 18,
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
  cancelButton: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  confirmButton: {
    fontSize: 15,
    color: Colors.moss,
    fontWeight: '700',
  },

  // Picker wheels
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  scrollContent: {
    paddingVertical: 60,
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  pickerItemTextSelected: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Preview
  previewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  previewDate: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.oak,
  },
});
