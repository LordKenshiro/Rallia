/**
 * When & Format Step
 *
 * Step 1 of the match creation wizard.
 * Handles date, time, duration, format, and match type selection.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UseFormReturn } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { lightHaptic } from '@rallia/shared-utils';
import type { MatchFormSchemaData } from '@rallia/shared-types';
import type { TranslationKey } from '../../../../hooks/useTranslation';

// =============================================================================
// TIMEZONE DATA
// =============================================================================

interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: 'Pacific/Honolulu', label: 'Hawaii', offset: 'HST (UTC-10)' },
  { value: 'America/Anchorage', label: 'Alaska', offset: 'AKST (UTC-9)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time', offset: 'PST (UTC-8)' },
  { value: 'America/Denver', label: 'Mountain Time', offset: 'MST (UTC-7)' },
  { value: 'America/Chicago', label: 'Central Time', offset: 'CST (UTC-6)' },
  { value: 'America/New_York', label: 'Eastern Time', offset: 'EST (UTC-5)' },
  { value: 'America/Halifax', label: 'Atlantic Time', offset: 'AST (UTC-4)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo', offset: 'BRT (UTC-3)' },
  { value: 'Atlantic/Azores', label: 'Azores', offset: 'AZOT (UTC-1)' },
  { value: 'UTC', label: 'UTC', offset: 'UTC (UTC+0)' },
  { value: 'Europe/London', label: 'London', offset: 'GMT (UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris / Berlin', offset: 'CET (UTC+1)' },
  { value: 'Europe/Helsinki', label: 'Helsinki / Athens', offset: 'EET (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Moscow', offset: 'MSK (UTC+3)' },
  { value: 'Asia/Dubai', label: 'Dubai', offset: 'GST (UTC+4)' },
  { value: 'Asia/Karachi', label: 'Karachi', offset: 'PKT (UTC+5)' },
  { value: 'Asia/Kolkata', label: 'India', offset: 'IST (UTC+5:30)' },
  { value: 'Asia/Bangkok', label: 'Bangkok', offset: 'ICT (UTC+7)' },
  { value: 'Asia/Shanghai', label: 'China / Singapore', offset: 'CST (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'JST (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: 'AEDT (UTC+11)' },
  { value: 'Pacific/Auckland', label: 'New Zealand', offset: 'NZDT (UTC+13)' },
  // Canada specific
  { value: 'America/Vancouver', label: 'Vancouver', offset: 'PST (UTC-8)' },
  { value: 'America/Edmonton', label: 'Edmonton', offset: 'MST (UTC-7)' },
  { value: 'America/Winnipeg', label: 'Winnipeg', offset: 'CST (UTC-6)' },
  { value: 'America/Toronto', label: 'Toronto / Montreal', offset: 'EST (UTC-5)' },
];

// =============================================================================
// TYPES
// =============================================================================

interface WhenFormatStepProps {
  form: UseFormReturn<MatchFormSchemaData>;
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    buttonActive: string;
    buttonInactive: string;
    buttonTextActive: string;
    cardBackground: string;
  };
  t: (key: TranslationKey) => string;
  isDark: boolean;
  locale: string;
}

interface OptionButtonProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  colors: WhenFormatStepProps['colors'];
  flex?: boolean;
}

// =============================================================================
// OPTION BUTTON COMPONENT
// =============================================================================

const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  description,
  selected,
  onPress,
  colors,
  flex = false,
}) => (
  <TouchableOpacity
    style={[
      styles.optionButton,
      flex && styles.optionButtonFlex,
      {
        backgroundColor: selected ? colors.buttonActive : colors.buttonInactive,
        borderColor: selected ? colors.buttonActive : colors.border,
      },
    ]}
    onPress={() => {
      lightHaptic();
      onPress();
    }}
    activeOpacity={0.7}
  >
    <Text
      size="base"
      weight={selected ? 'semibold' : 'regular'}
      color={selected ? colors.buttonTextActive : colors.text}
    >
      {label}
    </Text>
    {description && (
      <Text
        size="xs"
        color={selected ? colors.buttonTextActive : colors.textMuted}
        style={styles.optionDescription}
      >
        {description}
      </Text>
    )}
  </TouchableOpacity>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WhenFormatStep: React.FC<WhenFormatStepProps> = ({
  form,
  colors,
  t,
  isDark,
  locale,
}) => {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);

  const matchDate = watch('matchDate');
  const startTime = watch('startTime');
  const timezone = watch('timezone');
  const duration = watch('duration');
  const customDurationMinutes = watch('customDurationMinutes');
  const format = watch('format');
  const playerExpectation = watch('playerExpectation');

  // Get display label for selected timezone
  const selectedTimezoneOption = useMemo(() => {
    return (
      COMMON_TIMEZONES.find(tz => tz.value === timezone) || {
        value: timezone,
        label: timezone,
        offset: '',
      }
    );
  }, [timezone]);

  // Parse date for picker - parse in LOCAL time, not UTC
  // new Date('YYYY-MM-DD') is interpreted as UTC, causing day shift issues
  const dateValue = matchDate
    ? (() => {
        const [year, month, day] = matchDate.split('-').map(Number);
        return new Date(year, month - 1, day); // month is 0-indexed
      })()
    : new Date();

  // Parse time for picker
  const timeValue = (() => {
    if (!startTime) return new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  })();

  // Format display date
  const formattedDate = dateValue.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Format display time
  const formattedTime = timeValue.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Temporary values for iOS picker (only commit on Done)
  const [tempDate, setTempDate] = useState(dateValue);
  const [tempTime, setTempTime] = useState(timeValue);

  // Helper to format date as YYYY-MM-DD in local time (not UTC)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get today's date at midnight (00:00:00) to allow selecting today
  const getTodayAtMidnight = (): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const handleDateChange = (_: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        const dateStr = formatDateLocal(selectedDate);
        setValue('matchDate', dateStr, { shouldValidate: true, shouldDirty: true });
      }
    } else if (selectedDate) {
      // iOS: just update temp value, commit on Done
      setTempDate(selectedDate);
    }
  };

  const handleTimeChange = (_: unknown, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (selectedTime) {
        const timeStr = selectedTime.toTimeString().slice(0, 5);
        setValue('startTime', timeStr, { shouldValidate: true, shouldDirty: true });
      }
    } else if (selectedTime) {
      // iOS: just update temp value, commit on Done
      setTempTime(selectedTime);
    }
  };

  const handleDateDone = () => {
    const dateStr = formatDateLocal(tempDate);
    setValue('matchDate', dateStr, { shouldValidate: true, shouldDirty: true });
    setShowDatePicker(false);
    lightHaptic();
  };

  const handleTimeDone = () => {
    const timeStr = tempTime.toTimeString().slice(0, 5);
    setValue('startTime', timeStr, { shouldValidate: true, shouldDirty: true });
    setShowTimePicker(false);
    lightHaptic();
  };

  const handleDateCancel = () => {
    setTempDate(dateValue);
    setShowDatePicker(false);
  };

  const handleTimeCancel = () => {
    setTempTime(timeValue);
    setShowTimePicker(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {/* Step title */}
      <View style={styles.stepHeader}>
        <Text size="lg" weight="bold" color={colors.text}>
          {t('matchCreation.step1Title' as TranslationKey)}
        </Text>
        <Text size="sm" color={colors.textMuted}>
          {t('matchCreation.step1Description' as TranslationKey)}
        </Text>
      </View>

      {/* Date picker */}
      <View style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.matchDate' as TranslationKey)}
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            { borderColor: colors.border, backgroundColor: colors.buttonInactive },
          ]}
          onPress={() => {
            lightHaptic();
            setTempDate(dateValue);
            setShowDatePicker(true);
          }}
          accessibilityLabel={t('matchCreation.accessibility.selectDate' as TranslationKey)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.buttonActive} />
          <Text size="base" color={colors.text}>
            {formattedDate}
          </Text>
        </TouchableOpacity>
        {errors.matchDate && (
          <Text size="xs" color="#ef4444" style={styles.errorText}>
            {errors.matchDate.message}
          </Text>
        )}
        {/* Android date picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={getTodayAtMidnight()}
          />
        )}
      </View>

      {/* Time picker */}
      <View style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.startTime' as TranslationKey)}
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            { borderColor: colors.border, backgroundColor: colors.buttonInactive },
          ]}
          onPress={() => {
            lightHaptic();
            setTempTime(timeValue);
            setShowTimePicker(true);
          }}
          accessibilityLabel={t('matchCreation.accessibility.selectTime' as TranslationKey)}
        >
          <Ionicons name="time-outline" size={20} color={colors.buttonActive} />
          <Text size="base" color={colors.text}>
            {formattedTime}
          </Text>
        </TouchableOpacity>
        {errors.startTime && (
          <Text size="xs" color="#ef4444" style={styles.errorText}>
            {errors.startTime.message}
          </Text>
        )}
        {/* Android time picker */}
        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={timeValue}
            mode="time"
            display="default"
            onChange={handleTimeChange}
            minuteInterval={15}
          />
        )}
      </View>

      {/* Timezone picker */}
      <View style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.timezone' as TranslationKey)}
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            { borderColor: colors.border, backgroundColor: colors.buttonInactive },
          ]}
          onPress={() => {
            lightHaptic();
            setShowTimezonePicker(true);
          }}
          accessibilityLabel={t('matchCreation.accessibility.selectTimezone' as TranslationKey)}
        >
          <Ionicons name="globe-outline" size={20} color={colors.buttonActive} />
          <View style={styles.timezoneTextContainer}>
            <Text size="base" color={colors.text}>
              {selectedTimezoneOption.label}
            </Text>
            {selectedTimezoneOption.offset && (
              <Text size="xs" color={colors.textMuted}>
                {selectedTimezoneOption.offset}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        {errors.timezone && (
          <Text size="xs" color="#ef4444" style={styles.errorText}>
            {errors.timezone.message}
          </Text>
        )}
      </View>

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={handleDateCancel}
        >
          <Pressable style={styles.modalOverlay} onPress={handleDateCancel}>
            <View style={[styles.pickerModal, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={handleDateCancel} style={styles.pickerHeaderButton}>
                  <Text size="base" color={colors.textMuted}>
                    {t('common.cancel' as TranslationKey)}
                  </Text>
                </TouchableOpacity>
                <Text size="base" weight="semibold" color={colors.text}>
                  {t('matchCreation.fields.matchDate' as TranslationKey)}
                </Text>
                <TouchableOpacity onPress={handleDateDone} style={styles.pickerHeaderButton}>
                  <Text size="base" weight="semibold" color={colors.buttonActive}>
                    {t('common.done' as TranslationKey)}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={getTodayAtMidnight()}
                themeVariant={isDark ? 'dark' : 'light'}
                style={styles.iosPicker}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* iOS Time Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={handleTimeCancel}
        >
          <Pressable style={styles.modalOverlay} onPress={handleTimeCancel}>
            <View style={[styles.pickerModal, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={handleTimeCancel} style={styles.pickerHeaderButton}>
                  <Text size="base" color={colors.textMuted}>
                    {t('common.cancel' as TranslationKey)}
                  </Text>
                </TouchableOpacity>
                <Text size="base" weight="semibold" color={colors.text}>
                  {t('matchCreation.fields.startTime' as TranslationKey)}
                </Text>
                <TouchableOpacity onPress={handleTimeDone} style={styles.pickerHeaderButton}>
                  <Text size="base" weight="semibold" color={colors.buttonActive}>
                    {t('common.done' as TranslationKey)}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                minuteInterval={15}
                themeVariant={isDark ? 'dark' : 'light'}
                style={styles.iosPicker}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Timezone Picker Modal */}
      <Modal
        visible={showTimezonePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimezonePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTimezonePicker(false)}>
          <View style={[styles.timezoneModal, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setShowTimezonePicker(false)}
                style={styles.pickerHeaderButton}
              >
                <Text size="base" color={colors.textMuted}>
                  {t('common.cancel' as TranslationKey)}
                </Text>
              </TouchableOpacity>
              <Text size="base" weight="semibold" color={colors.text}>
                {t('matchCreation.fields.timezone' as TranslationKey)}
              </Text>
              <View style={styles.pickerHeaderButton} />
            </View>
            <FlatList
              data={COMMON_TIMEZONES}
              keyExtractor={item => item.value}
              style={styles.timezoneList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.timezoneItem,
                    { borderBottomColor: colors.border },
                    item.value === timezone && { backgroundColor: colors.buttonInactive },
                  ]}
                  onPress={() => {
                    lightHaptic();
                    setValue('timezone', item.value, { shouldValidate: true, shouldDirty: true });
                    setShowTimezonePicker(false);
                  }}
                >
                  <View style={styles.timezoneItemContent}>
                    <Text
                      size="base"
                      weight={item.value === timezone ? 'semibold' : 'regular'}
                      color={colors.text}
                    >
                      {item.label}
                    </Text>
                    <Text size="xs" color={colors.textMuted}>
                      {item.offset}
                    </Text>
                  </View>
                  {item.value === timezone && (
                    <Ionicons name="checkmark" size={20} color={colors.buttonActive} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Duration options */}
      <View style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.duration' as TranslationKey)}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.durationRow}
        >
          {(['30', '60', '90', '120'] as const).map(dur => (
            <OptionButton
              key={dur}
              label={t(`matchCreation.duration.${dur}` as TranslationKey)}
              selected={duration === dur}
              onPress={() => {
                setValue('duration', dur, { shouldValidate: true, shouldDirty: true });
                // Clear custom duration when switching to preset
                if (duration === 'custom') {
                  setValue('customDurationMinutes', undefined, { shouldDirty: true });
                }
              }}
              colors={colors}
            />
          ))}
          <OptionButton
            label={t('matchCreation.duration.custom' as TranslationKey)}
            selected={duration === 'custom'}
            onPress={() =>
              setValue('duration', 'custom', { shouldValidate: true, shouldDirty: true })
            }
            colors={colors}
          />
        </ScrollView>
        {/* Custom duration input */}
        {duration === 'custom' && (
          <View style={styles.customDurationContainer}>
            <View
              style={[
                styles.customDurationInputContainer,
                {
                  borderColor: errors.customDurationMinutes ? '#ef4444' : colors.border,
                  backgroundColor: colors.cardBackground,
                },
              ]}
            >
              <BottomSheetTextInput
                style={[styles.customDurationInput, { color: colors.text }]}
                value={customDurationMinutes?.toString() ?? ''}
                onChangeText={text => {
                  const numValue = parseInt(text.replace(/[^0-9]/g, ''), 10);
                  if (text === '') {
                    setValue('customDurationMinutes', undefined, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  } else if (!isNaN(numValue)) {
                    setValue('customDurationMinutes', numValue, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                }}
                placeholder="15-480"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text size="base" color={colors.textMuted}>
                {t('matchCreation.fields.customDurationUnit' as TranslationKey) || 'minutes'}
              </Text>
            </View>
            {errors.customDurationMinutes && (
              <Text size="xs" color="#ef4444" style={styles.errorText}>
                {errors.customDurationMinutes.message}
              </Text>
            )}
            <Text size="xs" color={colors.textMuted} style={styles.customDurationHint}>
              {t('matchCreation.fields.customDurationHint' as TranslationKey) ||
                'Enter a duration between 15 and 480 minutes'}
            </Text>
          </View>
        )}
      </View>

      {/* Format options */}
      <View style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.format' as TranslationKey)}
        </Text>
        <View style={styles.formatRow}>
          <OptionButton
            label={t('matchCreation.fields.formatSingles' as TranslationKey)}
            selected={format === 'singles'}
            onPress={() =>
              setValue('format', 'singles', { shouldValidate: true, shouldDirty: true })
            }
            colors={colors}
            flex
          />
          <OptionButton
            label={t('matchCreation.fields.formatDoubles' as TranslationKey)}
            selected={format === 'doubles'}
            onPress={() =>
              setValue('format', 'doubles', { shouldValidate: true, shouldDirty: true })
            }
            colors={colors}
            flex
          />
        </View>
      </View>

      {/* Match type options */}
      <View style={styles.fieldGroup}>
        <Text size="sm" weight="semibold" color={colors.textSecondary} style={styles.label}>
          {t('matchCreation.fields.playerExpectation' as TranslationKey)}
        </Text>
        <View style={styles.optionsColumn}>
          <OptionButton
            label={t('matchCreation.fields.playerExpectationCasual' as TranslationKey)}
            selected={playerExpectation === 'casual'}
            onPress={() =>
              setValue('playerExpectation', 'casual', { shouldValidate: true, shouldDirty: true })
            }
            colors={colors}
          />
          <OptionButton
            label={t('matchCreation.fields.playerExpectationCompetitive' as TranslationKey)}
            selected={playerExpectation === 'competitive'}
            onPress={() =>
              setValue('playerExpectation', 'competitive', {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            colors={colors}
          />
          <OptionButton
            label={t('matchCreation.fields.playerExpectationBoth' as TranslationKey)}
            selected={playerExpectation === 'both'}
            onPress={() =>
              setValue('playerExpectation', 'both', { shouldValidate: true, shouldDirty: true })
            }
            colors={colors}
          />
        </View>
      </View>
    </ScrollView>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacingPixels[4],
    paddingBottom: spacingPixels[8],
  },
  stepHeader: {
    marginBottom: spacingPixels[6],
  },
  fieldGroup: {
    marginBottom: spacingPixels[5],
  },
  label: {
    marginBottom: spacingPixels[2],
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    gap: spacingPixels[3],
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingPixels[2],
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacingPixels[2],
    paddingRight: spacingPixels[2],
  },
  customDurationContainer: {
    marginTop: spacingPixels[3],
  },
  customDurationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    gap: spacingPixels[2],
  },
  customDurationInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },
  customDurationHint: {
    marginTop: spacingPixels[1],
  },
  formatRow: {
    flexDirection: 'row',
    gap: spacingPixels[2],
  },
  optionsColumn: {
    gap: spacingPixels[2],
  },
  optionButton: {
    paddingVertical: spacingPixels[3],
    paddingHorizontal: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  optionButtonFlex: {
    flex: 1,
    minWidth: 0,
  },
  optionDescription: {
    marginTop: spacingPixels[0.5],
  },
  errorText: {
    marginTop: spacingPixels[1],
  },
  // iOS Picker Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  pickerModal: {
    borderTopLeftRadius: radiusPixels.xl,
    borderTopRightRadius: radiusPixels.xl,
    paddingBottom: spacingPixels[8],
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[4],
    borderBottomWidth: 1,
  },
  pickerHeaderButton: {
    paddingVertical: spacingPixels[2],
    paddingHorizontal: spacingPixels[2],
    minWidth: 60,
  },
  iosPicker: {
    height: 200,
  },
  // Timezone picker styles
  timezoneTextContainer: {
    flex: 1,
  },
  timezoneModal: {
    borderTopLeftRadius: radiusPixels.xl,
    borderTopRightRadius: radiusPixels.xl,
    maxHeight: '70%',
  },
  timezoneList: {
    flexGrow: 0,
  },
  timezoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacingPixels[4],
    paddingHorizontal: spacingPixels[4],
    borderBottomWidth: 1,
  },
  timezoneItemContent: {
    flex: 1,
  },
});

export default WhenFormatStep;
