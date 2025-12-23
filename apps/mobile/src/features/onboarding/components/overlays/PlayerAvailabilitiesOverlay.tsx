import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Overlay } from '@rallia/shared-components';
import { OnboardingService, Logger } from '@rallia/shared-services';
import type { DayEnum, PeriodEnum, OnboardingAvailability } from '@rallia/shared-types';
import ProgressIndicator from '../ProgressIndicator';
import { selectionHaptic, mediumHaptic } from '@rallia/shared-utils';
import { useThemeStyles } from '../../../../hooks';

interface PlayerAvailabilitiesOverlayProps {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  onContinue?: (availabilities: WeeklyAvailability) => void;
  selectedSportIds?: string[]; // Sport IDs to create availability entries for each sport (optional for edit mode)
  currentStep?: number;
  totalSteps?: number;
  mode?: 'onboarding' | 'edit'; // Mode: onboarding (create) or edit (update)
  initialData?: WeeklyAvailability; // Initial availability data for edit mode
  onSave?: (availabilities: WeeklyAvailability) => void; // Save callback for edit mode
}

type TimeSlot = 'AM' | 'PM' | 'EVE';
type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

interface DayAvailability {
  AM: boolean;
  PM: boolean;
  EVE: boolean;
}

type WeeklyAvailability = Record<DayOfWeek, DayAvailability>;

const PlayerAvailabilitiesOverlay: React.FC<PlayerAvailabilitiesOverlayProps> = ({
  visible,
  onClose,
  onBack,
  onContinue,
  selectedSportIds: _selectedSportIds,
  currentStep = 1,
  totalSteps = 8,
  mode = 'onboarding',
  initialData,
  onSave,
}) => {
  const { colors } = useThemeStyles();
  const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots: TimeSlot[] = ['AM', 'PM', 'EVE'];

  // Default availabilities for onboarding mode
  const defaultAvailabilities: WeeklyAvailability = {
    Mon: { AM: true, PM: false, EVE: false },
    Tue: { AM: false, PM: false, EVE: false },
    Wed: { AM: false, PM: true, EVE: false },
    Thu: { AM: false, PM: true, EVE: false },
    Fri: { AM: false, PM: true, EVE: false },
    Sat: { AM: true, PM: false, EVE: false },
    Sun: { AM: false, PM: false, EVE: true },
  };

  // Initialize availabilities: use initialData for edit mode, defaults for onboarding
  const [availabilities, setAvailabilities] = useState<WeeklyAvailability>(
    initialData || defaultAvailabilities
  );
  const [isSaving, setIsSaving] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Trigger animations when overlay becomes visible
  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const toggleAvailability = (day: DayOfWeek, slot: TimeSlot) => {
    selectionHaptic();
    setAvailabilities(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: !prev[day][slot],
      },
    }));
  };

  const handleContinue = async () => {
    mediumHaptic();

    // Prevent double-tap
    if (isSaving) return;

    // Edit mode: use the onSave callback
    if (mode === 'edit' && onSave) {
      onSave(availabilities);
      return;
    }

    // Onboarding mode: save to database
    if (onContinue) {
      setIsSaving(true);
      try {
        // Map UI data to database format
        const dayMap: Record<DayOfWeek, DayEnum> = {
          Mon: 'monday',
          Tue: 'tuesday',
          Wed: 'wednesday',
          Thu: 'thursday',
          Fri: 'friday',
          Sat: 'saturday',
          Sun: 'sunday',
        };

        const timeSlotMap: Record<TimeSlot, PeriodEnum> = {
          AM: 'morning',
          PM: 'afternoon',
          EVE: 'evening',
        };

        // Convert availability grid to database format
        // Create one entry per day/period combination (not per sport)
        const availabilityData: OnboardingAvailability[] = [];

        days.forEach(day => {
          timeSlots.forEach(slot => {
            if (availabilities[day][slot]) {
              availabilityData.push({
                day: dayMap[day],
                period: timeSlotMap[slot],
                is_active: true,
              });
            }
          });
        });

        // Save availability to database
        const { error } = await OnboardingService.saveAvailability(availabilityData);

        if (error) {
          Logger.error('Failed to save player availability', error as Error, { availabilityData });
          setIsSaving(false);
          Alert.alert('Error', 'Failed to save your availability. Please try again.', [
            { text: 'OK' },
          ]);
          return;
        }

        Logger.debug('player_availabilities_saved', { availabilityData });

        // Mark onboarding as completed
        const { error: completeError } = await OnboardingService.completeOnboarding();

        if (completeError) {
          Logger.warn('Failed to mark onboarding as completed', { error: completeError });
          // Don't block the flow if this fails - just log it
        } else {
          Logger.info('onboarding_completed', {
            message: 'Onboarding marked as completed in profile',
          });
        }

        onContinue(availabilities);
      } catch (error) {
        Logger.error('Unexpected error saving availability', error as Error);
        setIsSaving(false);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.', [{ text: 'OK' }]);
      }
    }
  };

  return (
    <Overlay
      visible={visible}
      onClose={onClose}
      onBack={onBack}
      type="bottom"
      showBackButton={false}
      showCloseButton={false}
    >
      <Animated.View
        style={[
          styles.container,
          {
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Show progress indicator only in onboarding mode */}
        {mode === 'onboarding' && (
          <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
        )}

        {/* Back Button - Only show in onboarding mode */}
        {mode === 'onboarding' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack || onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
        )}

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
          <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>Tell us about your{'\n'}schedule</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Select your availabilities</Text>

        {/* Scrollable Content Area */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Availability Grid */}
          <View style={styles.gridContainer}>
            {/* Header Row */}
            <View style={styles.row}>
              <View style={styles.dayCell} />
              {timeSlots.map(slot => (
                <View key={slot} style={styles.headerCell}>
                  <Text style={[styles.headerText, { color: colors.textMuted }]}>{slot}</Text>
                </View>
              ))}
            </View>

            {/* Day Rows */}
            {days.map(day => (
              <View key={day} style={styles.row}>
                <View style={styles.dayCell}>
                  <Text style={[styles.dayText, { color: colors.text }]}>{day}</Text>
                </View>
                {timeSlots.map(slot => (
                  <TouchableOpacity
                    key={`${day}-${slot}`}
                    style={[
                      styles.timeSlotCell,
                      { backgroundColor: colors.inputBackground },
                      availabilities[day][slot] && [
                        styles.timeSlotCellSelected,
                        { backgroundColor: colors.primary, borderColor: colors.primary },
                      ],
                    ]}
                    onPress={() => toggleAvailability(day, slot)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        {
                          color: availabilities[day][slot]
                            ? colors.primaryForeground
                            : colors.textMuted,
                        },
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Complete/Save Button - Fixed at bottom */}
        <TouchableOpacity
          style={[
            styles.completeButton,
            { backgroundColor: colors.primary },
            isSaving && [styles.completeButtonDisabled, { backgroundColor: colors.buttonInactive }],
          ]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.completeButtonText, { color: colors.primaryForeground }]}>
              {mode === 'edit' ? 'Save' : 'Complete'}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '300',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  gridContainer: {
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  dayCell: {
    width: 50,
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeSlotCell: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeSlotCellSelected: {
    // backgroundColor and borderColor applied inline
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeSlotTextSelected: {
    // color applied inline
  },
  completeButton: {
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlayerAvailabilitiesOverlay;
