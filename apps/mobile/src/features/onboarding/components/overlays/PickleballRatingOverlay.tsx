import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import DatabaseService, { OnboardingService, SportService } from '@rallia/shared-services';
import type { OnboardingRating } from '@rallia/shared-types';
import ProgressIndicator from '../ProgressIndicator';
import { selectionHaptic, mediumHaptic } from '../../../../utils/haptics';

interface PickleballRatingOverlayProps {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  onContinue?: (rating: string) => void;
  currentStep?: number;
  totalSteps?: number;
  mode?: 'onboarding' | 'edit'; // Mode: onboarding (create) or edit (update)
  initialRating?: string; // Pre-selected rating ID for edit mode
  onSave?: (ratingId: string) => void; // Save callback for edit mode
}

interface Rating {
  id: string;
  score_value: number;
  display_label: string;
  description: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  isHighlighted?: boolean;
}

const PickleballRatingOverlay: React.FC<PickleballRatingOverlayProps> = ({
  visible,
  onClose,
  onBack,
  onContinue,
  currentStep = 1,
  totalSteps = 8,
  mode = 'onboarding',
  initialRating,
  onSave,
}) => {
  const [selectedRating, setSelectedRating] = useState<string | null>(initialRating || null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Load ratings from database when overlay becomes visible
  useEffect(() => {
    const loadRatings = async () => {
      if (!visible) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await DatabaseService.RatingScore.getRatingScoresBySport('pickleball', 'dupr');
        
        if (error || !data) {
          console.error('Error loading pickleball ratings:', error);
          Alert.alert('Error', 'Failed to load ratings. Please try again.');
          return;
        }
        
        // Transform database data to match UI expectations
        const transformedRatings: Rating[] = data.map((rating) => ({
          id: rating.id,
          score_value: rating.score_value,
          display_label: rating.display_label,
          description: rating.description,
          skill_level: rating.skill_level,
          // Highlight DUPR 4.5 (advanced level)
          isHighlighted: rating.score_value === 4.5,
        }));
        
        setRatings(transformedRatings);
      } catch (error) {
        console.error('Unexpected error loading pickleball ratings:', error);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRatings();
  }, [visible]);

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

  // Helper function to get icon based on skill level
  const getRatingIcon = (skillLevel: string): keyof typeof Ionicons.glyphMap => {
    if (skillLevel === 'beginner') return 'star-outline';
    if (skillLevel === 'intermediate') return 'star-half';
    if (skillLevel === 'advanced') return 'star';
    return 'trophy'; // professional
  };

  const handleContinue = async () => {
    if (!selectedRating) return;
    
    mediumHaptic();
    
    // Edit mode: use the onSave callback
    if (mode === 'edit' && onSave) {
      onSave(selectedRating);
      return;
    }
    
    // Onboarding mode: save to database
    if (onContinue) {
      try {
        // Get pickleball sport ID
        const { data: pickleballSport, error: sportError} = await SportService.getSportByName('pickleball');
        
        if (sportError || !pickleballSport) {
          console.error('Error fetching pickleball sport:', sportError);
          Alert.alert(
            'Error',
            'Failed to save your rating. Please try again.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Find the selected rating data
        const selectedRatingData = ratings.find(r => r.id === selectedRating);
        
        if (!selectedRatingData) {
          Alert.alert('Error', 'Invalid rating selected');
          return;
        }
        
        // Save rating to database
        const ratingData: OnboardingRating = {
          sport_id: pickleballSport.id,
          sport_name: 'pickleball',
          rating_type: 'dupr',
          score_value: selectedRatingData.score_value,
          display_label: selectedRatingData.display_label,
        };
        
        const { error } = await OnboardingService.saveRatings([ratingData]);
        
        if (error) {
          console.error('Error saving pickleball rating:', error);
          Alert.alert(
            'Error',
            'Failed to save your rating. Please try again.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        console.log('Pickleball rating saved to database:', ratingData);
        onContinue(selectedRating);
      } catch (error) {
        console.error('Unexpected error saving pickleball rating:', error);
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
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Progress Indicator - only show in onboarding mode */}
        {mode === 'onboarding' && (
          <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
        )}

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack || onClose} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>
          {mode === 'edit' ? 'Update your pickleball rating' : 'Tell us about your game'}
        </Text>

        {/* Sport Badge */}
        <View style={styles.sportBadge}>
          <Text style={styles.sportBadgeText}>Pickleball</Text>
        </View>

        {/* Subtitle with DUPR link */}
        <Text style={styles.subtitle}>
          {mode === 'edit' ? (
            <>
              Learn more about the{' '}
              <Text 
                style={styles.link} 
                onPress={() => Linking.openURL('https://mydupr.com/')}
              >
                DUPR rating system
              </Text>
            </>
          ) : (
            'DUPR Rating'
          )}
        </Text>

        {/* Rating Options */}
        <ScrollView style={styles.ratingList} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading ratings...</Text>
            </View>
          ) : (
            <View style={styles.ratingGrid}>
              {ratings.map(rating => (
                <TouchableOpacity
                  key={rating.id}
                  style={[
                    styles.ratingCard,
                    rating.isHighlighted && styles.ratingCardHighlighted,
                    selectedRating === rating.id && styles.ratingCardSelected,
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    setSelectedRating(rating.id);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons
                      name={getRatingIcon(rating.skill_level)}
                      size={20}
                      color={selectedRating === rating.id ? '#fff' : COLORS.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.ratingLevel,
                        rating.isHighlighted && styles.ratingLevelHighlighted,
                        selectedRating === rating.id && styles.ratingLevelSelected,
                      ]}
                    >
                      {rating.skill_level.charAt(0).toUpperCase() + rating.skill_level.slice(1)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ratingDupr,
                      rating.isHighlighted && styles.ratingDuprHighlighted,
                      selectedRating === rating.id && styles.ratingDuprSelected,
                    ]}
                  >
                    {rating.display_label}
                  </Text>
                  <Text
                    style={[
                      styles.ratingDescription,
                      rating.isHighlighted && styles.ratingDescriptionHighlighted,
                      selectedRating === rating.id && styles.ratingDescriptionSelected,
                    ]}
                  >
                    {rating.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Continue/Save Button */}
        <TouchableOpacity
          style={[styles.continueButton, !selectedRating && styles.continueButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={selectedRating ? 0.8 : 1}
          disabled={!selectedRating}
        >
          <Text
            style={[
              styles.continueButtonText,
              !selectedRating && styles.continueButtonTextDisabled,
            ]}
          >
            {mode === 'edit' ? 'Save' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    maxHeight: '90%',
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
    marginBottom: 15,
  },
  sportBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sportBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  ratingList: {
    maxHeight: 400,
    marginBottom: 15,
  },
  ratingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  ratingCard: {
    width: '48%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ratingCardHighlighted: {
    backgroundColor: COLORS.primary,
  },
  ratingCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  ratingLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingLevelHighlighted: {
    color: '#fff',
  },
  ratingLevelSelected: {
    color: COLORS.primary,
  },
  ratingDupr: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  ratingDuprHighlighted: {
    color: '#E0F9F7',
  },
  ratingDuprSelected: {
    color: COLORS.primary,
  },
  ratingDescription: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
  ratingDescriptionHighlighted: {
    color: '#fff',
  },
  ratingDescriptionSelected: {
    color: '#333',
  },
  continueButton: {
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
  continueButtonDisabled: {
    backgroundColor: '#D3D3D3',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  link: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});

export default PickleballRatingOverlay;
