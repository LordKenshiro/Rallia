import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import Overlay from '../../../../components/overlays/Overlay';
import { COLORS } from '../../../../constants';

interface PlayerPreferencesOverlayProps {
  visible: boolean;
  onClose: () => void;
  onContinue?: (preferences: PlayerPreferences) => void;
  selectedSports: string[]; // ['tennis', 'pickleball'] or just one
}

interface PlayerPreferences {
  playingHand: 'left' | 'right' | 'both';
  maxTravelDistance: number;
  matchDuration: '1h' | '1.5h' | '2h';
  sameForAllSports: boolean;
  tennisMatchType?: 'casual' | 'competitive' | 'both';
  pickleballMatchType?: 'casual' | 'competitive' | 'both';
}

const PlayerPreferencesOverlay: React.FC<PlayerPreferencesOverlayProps> = ({ 
  visible, 
  onClose,
  onContinue,
  selectedSports,
}) => {
  const [playingHand, setPlayingHand] = useState<'left' | 'right' | 'both'>('right');
  const [maxTravelDistance, setMaxTravelDistance] = useState<number>(6);
  const [matchDuration, setMatchDuration] = useState<'1h' | '1.5h' | '2h'>('1.5h');
  const [sameForAllSports, setSameForAllSports] = useState(true);
  const [tennisMatchType, setTennisMatchType] = useState<'casual' | 'competitive' | 'both'>('competitive');
  const [pickleballMatchType, setPickleballMatchType] = useState<'casual' | 'competitive' | 'both'>('competitive');

  const hasTennis = selectedSports.includes('tennis');
  const hasPickleball = selectedSports.includes('pickleball');

  const handleContinue = () => {
    if (onContinue) {
      const preferences: PlayerPreferences = {
        playingHand,
        maxTravelDistance,
        matchDuration,
        sameForAllSports,
        ...(hasTennis && { tennisMatchType }),
        ...(hasPickleball && { pickleballMatchType }),
      };
      console.log('Player preferences:', preferences);
      onContinue(preferences);
    }
  };

  return (
    <Overlay visible={visible} onClose={onClose} type="bottom">
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onClose}
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
              onPress={() => setPlayingHand('left')}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionButtonText, playingHand === 'left' && styles.optionButtonTextSelected]}>
                Left
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, playingHand === 'right' && styles.optionButtonSelected]}
              onPress={() => setPlayingHand('right')}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionButtonText, playingHand === 'right' && styles.optionButtonTextSelected]}>
                Right
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, playingHand === 'both' && styles.optionButtonSelected]}
              onPress={() => setPlayingHand('both')}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionButtonText, playingHand === 'both' && styles.optionButtonTextSelected]}>
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
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.optionButton, matchDuration === '1h' && styles.optionButtonSelected]}
              onPress={() => setMatchDuration('1h')}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionButtonText, matchDuration === '1h' && styles.optionButtonTextSelected]}>
                1h
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, matchDuration === '1.5h' && styles.optionButtonSelected]}
              onPress={() => setMatchDuration('1.5h')}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionButtonText, matchDuration === '1.5h' && styles.optionButtonTextSelected]}>
                1.5h
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, matchDuration === '2h' && styles.optionButtonSelected]}
              onPress={() => setMatchDuration('2h')}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionButtonText, matchDuration === '2h' && styles.optionButtonTextSelected]}>
                2h
              </Text>
            </TouchableOpacity>
          </View>

          {/* Same for all sports checkbox (only show if both sports selected) */}
          {hasTennis && hasPickleball && (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setSameForAllSports(!sameForAllSports)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, sameForAllSports && styles.checkboxChecked]}>
                {sameForAllSports && <Ionicons name="checkmark" size={16} color="#fff" />}
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
                  style={[styles.optionButton, tennisMatchType === 'casual' && styles.optionButtonSelected]}
                  onPress={() => setTennisMatchType('casual')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionButtonText, tennisMatchType === 'casual' && styles.optionButtonTextSelected]}>
                    Casual
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, tennisMatchType === 'competitive' && styles.optionButtonSelected]}
                  onPress={() => setTennisMatchType('competitive')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionButtonText, tennisMatchType === 'competitive' && styles.optionButtonTextSelected]}>
                    Competitive
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, tennisMatchType === 'both' && styles.optionButtonSelected]}
                  onPress={() => setTennisMatchType('both')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionButtonText, tennisMatchType === 'both' && styles.optionButtonTextSelected]}>
                    Both
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Pickleball Match Type - only show if not "same for all sports" or if only pickleball selected */}
          {hasPickleball && (!sameForAllSports || !hasTennis) && (
            <>
              <Text style={styles.sportSubLabel}>Pickleball</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.optionButton, pickleballMatchType === 'casual' && styles.optionButtonSelected]}
                  onPress={() => setPickleballMatchType('casual')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionButtonText, pickleballMatchType === 'casual' && styles.optionButtonTextSelected]}>
                    Casual
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, pickleballMatchType === 'competitive' && styles.optionButtonSelected]}
                  onPress={() => setPickleballMatchType('competitive')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionButtonText, pickleballMatchType === 'competitive' && styles.optionButtonTextSelected]}>
                    Competitive
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, pickleballMatchType === 'both' && styles.optionButtonSelected]}
                  onPress={() => setPickleballMatchType('both')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionButtonText, pickleballMatchType === 'both' && styles.optionButtonTextSelected]}>
                    Both
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Continue Button */}
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 40,
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
    marginTop: 30,
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
});

export default PlayerPreferencesOverlay;
