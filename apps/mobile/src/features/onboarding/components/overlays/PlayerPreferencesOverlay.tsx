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
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import { OnboardingService, SportService, Logger } from '@rallia/shared-services';
import type { OnboardingPlayerPreferences } from '@rallia/shared-types';
import ProgressIndicator from '../ProgressIndicator';
import { selectionHaptic, mediumHaptic } from '@rallia/shared-utils';

interface PlayerPreferencesOverlayProps {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  onContinue?: (preferences: PlayerPreferences) => void;
  selectedSports: string[]; // ['tennis', 'pickleball'] or just one
  currentStep?: number;
  totalSteps?: number;
}

interface PlayerPreferences {
  playingHand: 'left' | 'right' | 'both';
  maxTravelDistance: number;
  matchDuration: '1h' | '1.5h' | '2h';
  tennisMatchDuration?: '1h' | '1.5h' | '2h';
  pickleballMatchDuration?: '1h' | '1.5h' | '2h';
  sameForAllSports: boolean;
  tennisMatchType?: 'casual' | 'competitive' | 'both';
  pickleballMatchType?: 'casual' | 'competitive' | 'both';
}

const PlayerPreferencesOverlay: React.FC<PlayerPreferencesOverlayProps> = ({
  visible,
  onClose,
  onBack,
  onContinue,
  selectedSports,
  currentStep = 1,
  totalSteps = 8,
}) => {
  const [playingHand, setPlayingHand] = useState<'left' | 'right' | 'both'>('right');
  const [maxTravelDistance, setMaxTravelDistance] = useState<number>(6);
  const [matchDuration, setMatchDuration] = useState<'1h' | '1.5h' | '2h'>('1.5h');
  const [tennisMatchDuration, setTennisMatchDuration] = useState<'1h' | '1.5h' | '2h'>('1.5h');
  const [pickleballMatchDuration, setPickleballMatchDuration] = useState<'1h' | '1.5h' | '2h'>(
    '1.5h'
  );
  const [sameDurationForAllSports, setSameDurationForAllSports] = useState(true);
  const [sameMatchTypeForAllSports, setSameMatchTypeForAllSports] = useState(true);
  const [tennisMatchType, setTennisMatchType] = useState<'casual' | 'competitive' | 'both'>(
    'competitive'
  );
  const [pickleballMatchType, setPickleballMatchType] = useState<'casual' | 'competitive' | 'both'>(
    'competitive'
  );
  const [isSaving, setIsSaving] = useState(false);

  const hasTennis = selectedSports.includes('tennis');
  const hasPickleball = selectedSports.includes('pickleball');

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

  const handleContinue = async () => {
    if (isSaving) return;
    
    if (onContinue) {
      mediumHaptic();
      setIsSaving(true);

      try {
        // Get sport IDs from sport names
        const sportsData: OnboardingPlayerPreferences['sports'] = [];

        if (hasTennis) {
          const { data: tennisSport } = await SportService.getSportByName('tennis');
          if (tennisSport) {
            sportsData.push({
              sport_id: tennisSport.id,
              sport_name: 'tennis',
              preferred_match_duration: sameDurationForAllSports
                ? matchDuration
                : tennisMatchDuration,
              preferred_match_type: tennisMatchType,
              is_primary: selectedSports.length === 1 || selectedSports[0] === 'tennis',
            });
          }
        }

        if (hasPickleball) {
          const { data: pickleballSport } = await SportService.getSportByName('pickleball');
          if (pickleballSport) {
            sportsData.push({
              sport_id: pickleballSport.id,
              sport_name: 'pickleball',
              preferred_match_duration: sameDurationForAllSports
                ? matchDuration
                : pickleballMatchDuration,
              preferred_match_type: sameMatchTypeForAllSports
                ? tennisMatchType
                : pickleballMatchType || 'competitive',
              is_primary: selectedSports.length === 1 || selectedSports[0] === 'pickleball',
            });
          }
        }

        // Save preferences to database
        const preferencesData: OnboardingPlayerPreferences = {
          playing_hand: playingHand,
          max_travel_distance: maxTravelDistance,
          sports: sportsData,
        };

        const { error } = await OnboardingService.savePreferences(preferencesData);

        if (error) {
          Logger.error('Failed to save player preferences', error as Error, { preferencesData });
          setIsSaving(false);
          Alert.alert('Error', 'Failed to save your preferences. Please try again.', [
            { text: 'OK' },
          ]);
          return;
        }

        // Call the original onContinue with local preferences
        const preferences: PlayerPreferences = {
          playingHand,
          maxTravelDistance,
          matchDuration,
          sameForAllSports: sameDurationForAllSports && sameMatchTypeForAllSports,
          ...(hasTennis && { tennisMatchType }),
          ...(hasPickleball && { pickleballMatchType }),
          ...(hasTennis &&
            hasPickleball &&
            !sameDurationForAllSports && {
              tennisMatchDuration,
              pickleballMatchDuration,
            }),
        };

        Logger.debug('player_preferences_saved', { preferencesData });
        onContinue(preferences);
      } catch (error) {
        Logger.error('Unexpected error saving preferences', error as Error);
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
    >
      <View style={styles.overlayContent}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack || onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>Tell us about your{'\n'}preferences</Text>

            {/* Playing Hand */}
            <Text style={styles.sectionLabel}>Preferred Playing Hand</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.optionButton, playingHand === 'left' && styles.optionButtonSelected]}
                onPress={() => {
                  selectionHaptic();
                  setPlayingHand('left');
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    playingHand === 'left' && styles.optionButtonTextSelected,
                  ]}
                >
                  Left
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  playingHand === 'right' && styles.optionButtonSelected,
                ]}
                onPress={() => {
                  selectionHaptic();
                  setPlayingHand('right');
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    playingHand === 'right' && styles.optionButtonTextSelected,
                  ]}
                >
                  Right
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, playingHand === 'both' && styles.optionButtonSelected]}
                onPress={() => {
                  selectionHaptic();
                  setPlayingHand('both');
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    playingHand === 'both' && styles.optionButtonTextSelected,
                  ]}
                >
                  Both
                </Text>
              </TouchableOpacity>
            </View>

            {/* Maximum Travel Distance */}
            <Text style={styles.sectionLabel}>Maximum Travel Distance</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{maxTravelDistance} km</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={50}
                step={1}
                value={maxTravelDistance}
                onValueChange={setMaxTravelDistance}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor="#E0E0E0"
                thumbTintColor={COLORS.primary}
              />
            </View>

            {/* Preferred Match Duration */}
            <Text style={styles.sectionLabel}>Preferred Match Duration</Text>

            {/* Show unified buttons when sameDurationForAllSports is true OR only one sport selected */}
            {(sameDurationForAllSports || !(hasTennis && hasPickleball)) && (
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    matchDuration === '1h' && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setMatchDuration('1h');
                    setTennisMatchDuration('1h');
                    setPickleballMatchDuration('1h');
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      matchDuration === '1h' && styles.optionButtonTextSelected,
                    ]}
                  >
                    1h
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    matchDuration === '1.5h' && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setMatchDuration('1.5h');
                    setTennisMatchDuration('1.5h');
                    setPickleballMatchDuration('1.5h');
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      matchDuration === '1.5h' && styles.optionButtonTextSelected,
                    ]}
                  >
                    1.5h
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    matchDuration === '2h' && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setMatchDuration('2h');
                    setTennisMatchDuration('2h');
                    setPickleballMatchDuration('2h');
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      matchDuration === '2h' && styles.optionButtonTextSelected,
                    ]}
                  >
                    2h
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Show separate rows for Tennis and Pickleball when checkbox is unchecked */}
            {!sameDurationForAllSports && hasTennis && hasPickleball && (
              <>
                {/* Tennis Duration */}
                <Text style={styles.sportSubLabel}>Tennis</Text>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      tennisMatchDuration === '1h' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setTennisMatchDuration('1h');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        tennisMatchDuration === '1h' && styles.optionButtonTextSelected,
                      ]}
                    >
                      1h
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      tennisMatchDuration === '1.5h' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setTennisMatchDuration('1.5h');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        tennisMatchDuration === '1.5h' && styles.optionButtonTextSelected,
                      ]}
                    >
                      1.5h
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      tennisMatchDuration === '2h' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setTennisMatchDuration('2h');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        tennisMatchDuration === '2h' && styles.optionButtonTextSelected,
                      ]}
                    >
                      2h
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Pickleball Duration */}
                <Text style={styles.sportSubLabel}>Pickleball</Text>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      pickleballMatchDuration === '1h' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setPickleballMatchDuration('1h');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        pickleballMatchDuration === '1h' && styles.optionButtonTextSelected,
                      ]}
                    >
                      1h
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      pickleballMatchDuration === '1.5h' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setPickleballMatchDuration('1.5h');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        pickleballMatchDuration === '1.5h' && styles.optionButtonTextSelected,
                      ]}
                    >
                      1.5h
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      pickleballMatchDuration === '2h' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setPickleballMatchDuration('2h');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        pickleballMatchDuration === '2h' && styles.optionButtonTextSelected,
                      ]}
                    >
                      2h
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Same duration for all sports checkbox (only show if both sports selected) */}
            {hasTennis && hasPickleball && (
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => {
                  selectionHaptic();
                  setSameDurationForAllSports(!sameDurationForAllSports);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, sameDurationForAllSports && styles.checkboxChecked]}>
                  {sameDurationForAllSports && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Same for all sports</Text>
              </TouchableOpacity>
            )}

            {/* Preferred Match Type */}
            <Text style={styles.sectionLabel}>Preferred Match Type</Text>

            {/* Tennis Match Type */}
            {hasTennis && (
              <>
                <Text style={styles.sportSubLabel}>Tennis</Text>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      tennisMatchType === 'casual' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setTennisMatchType('casual');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        tennisMatchType === 'casual' && styles.optionButtonTextSelected,
                      ]}
                    >
                      Casual
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      tennisMatchType === 'competitive' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setTennisMatchType('competitive');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        tennisMatchType === 'competitive' && styles.optionButtonTextSelected,
                      ]}
                    >
                      Competitive
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      tennisMatchType === 'both' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setTennisMatchType('both');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        tennisMatchType === 'both' && styles.optionButtonTextSelected,
                      ]}
                    >
                      Both
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Pickleball Match Type - only show if not "same for all sports" or if only pickleball selected */}
            {hasPickleball && (!sameMatchTypeForAllSports || !hasTennis) && (
              <>
                <Text style={styles.sportSubLabel}>Pickleball</Text>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      pickleballMatchType === 'casual' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setPickleballMatchType('casual');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        pickleballMatchType === 'casual' && styles.optionButtonTextSelected,
                      ]}
                    >
                      Casual
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      pickleballMatchType === 'competitive' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setPickleballMatchType('competitive');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        pickleballMatchType === 'competitive' && styles.optionButtonTextSelected,
                      ]}
                    >
                      Competitive
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      pickleballMatchType === 'both' && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      setPickleballMatchType('both');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        pickleballMatchType === 'both' && styles.optionButtonTextSelected,
                      ]}
                    >
                      Both
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Same match type for all sports checkbox (only show if both sports selected) */}
            {hasTennis && hasPickleball && (
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => {
                  selectionHaptic();
                  setSameMatchTypeForAllSports(!sameMatchTypeForAllSports);
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.checkbox, sameMatchTypeForAllSports && styles.checkboxChecked]}
                >
                  {sameMatchTypeForAllSports && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Same for all sports</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </ScrollView>

        {/* Continue Button - Fixed at bottom */}
        <TouchableOpacity
          style={[styles.continueButton, isSaving && styles.continueButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  overlayContent: {
    height: '100%',
    maxHeight: 650,
    flexDirection: 'column',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  container: {
    paddingVertical: 20,
    paddingBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 0,
    padding: 10,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 28,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 20,
  },
  sportSubLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 10,
    marginTop: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  optionButton: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  sliderContainer: {
    marginBottom: 10,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  continueButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonDisabled: {
    backgroundColor: '#999',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default PlayerPreferencesOverlay;
