import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { Overlay } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import { OnboardingService } from '@rallia/shared-services';
import type { DayOfWeek as DBDayOfWeek, TimePeriod, OnboardingAvailability } from '@rallia/shared-types';
import ProgressIndicator from '../ProgressIndicator';
import { selectionHaptic, mediumHaptic } from '../../../../utils/haptics';

interface PlayerAvailabilitiesOverlayProps {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  onContinue?: (availabilities: WeeklyAvailability) => void;
  selectedSportIds: string[]; // Sport IDs to create availability entries for each sport
  currentStep?: number;
  totalSteps?: number;
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
  selectedSportIds,
  currentStep = 1,
  totalSteps = 8,
}) => {
  const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots: TimeSlot[] = ['AM', 'PM', 'EVE'];

  // Initialize availabilities with some default selections
  const [availabilities, setAvailabilities] = useState<WeeklyAvailability>({
    Mon: { AM: true, PM: false, EVE: false },
    Tue: { AM: false, PM: false, EVE: false },
    Wed: { AM: false, PM: true, EVE: false },
    Thu: { AM: false, PM: true, EVE: false },
    Fri: { AM: false, PM: true, EVE: false },
    Sat: { AM: true, PM: false, EVE: false },
    Sun: { AM: false, PM: false, EVE: true },
  });

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
    setAvailabilities((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: !prev[day][slot],
      },
    }));
  };

  const handleContinue = async () => {
    if (onContinue) {
      mediumHaptic();
      
      try {
        // Map UI data to database format
        const dayMap: Record<DayOfWeek, DBDayOfWeek> = {
          'Mon': 'monday',
          'Tue': 'tuesday',
          'Wed': 'wednesday',
          'Thu': 'thursday',
          'Fri': 'friday',
          'Sat': 'saturday',
          'Sun': 'sunday',
        };
        
        const timeSlotMap: Record<TimeSlot, TimePeriod> = {
          'AM': 'morning',
          'PM': 'afternoon',
          'EVE': 'evening',
        };
        
        // Convert availability grid to database format
        // Create entries for EACH selected sport
        const availabilityData: OnboardingAvailability[] = [];
        
        days.forEach((day) => {
          timeSlots.forEach((slot) => {
            if (availabilities[day][slot]) {
              // Create one entry per selected sport
              selectedSportIds.forEach((sportId) => {
                availabilityData.push({
                  sport_id: sportId,
                  day_of_week: dayMap[day],
                  time_period: timeSlotMap[slot],
                  is_active: true,
                });
              });
            }
          });
        });
        
        // Save availability to database
        const { error } = await OnboardingService.saveAvailability(availabilityData);
        
        if (error) {
          console.error('Error saving availability:', error);
          Alert.alert(
            'Error',
            'Failed to save your availability. Please try again.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        console.log('Player availabilities saved to database:', availabilityData);
        
        // Mark onboarding as completed
        const { error: completeError } = await OnboardingService.completeOnboarding();
        
        if (completeError) {
          console.error('Error completing onboarding:', completeError);
          // Don't block the flow if this fails - just log it
        } else {
          console.log('✅ Onboarding marked as completed in profile');
        }
        
        onContinue(availabilities);
      } catch (error) {
        console.error('Unexpected error saving availability:', error);
        Alert.alert(
          'Error',
          'An unexpected error occurred. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  return (
    <Overlay visible={visible} onClose={onClose} onBack={onBack} type="bottom" showBackButton={false}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={onBack || onClose} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Tell us about your{'\n'}schedule</Text>
          <Text style={styles.subtitle}>Select your availabilities</Text>

          {/* Availability Grid */}
          <View style={styles.gridContainer}>
            {/* Header Row */}
            <View style={styles.row}>
              <View style={styles.dayCell} />
              {timeSlots.map((slot) => (
                <View key={slot} style={styles.headerCell}>
                  <Text style={styles.headerText}>{slot}</Text>
                </View>
              ))}
            </View>

            {/* Day Rows */}
            {days.map((day) => (
              <View key={day} style={styles.row}>
                <View style={styles.dayCell}>
                  <Text style={styles.dayText}>{day}</Text>
                </View>
                {timeSlots.map((slot) => (
                  <TouchableOpacity
                    key={`${day}-${slot}`}
                    style={[
                      styles.timeSlotCell,
                      availabilities[day][slot] && styles.timeSlotCellSelected,
                    ]}
                    onPress={() => toggleAvailability(day, slot)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        availabilities[day][slot] && styles.timeSlotTextSelected,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Complete Button */}
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    maxHeight: '90%',
  },
  container: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
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
    color: '#333',
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
    color: '#333',
    fontWeight: '300',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
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
    color: '#333',
    fontWeight: '500',
  },
  headerCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  timeSlotCell: {
    flex: 1,
    backgroundColor: COLORS.veryLightGray,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeSlotCellSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  completeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlayerAvailabilitiesOverlay;
