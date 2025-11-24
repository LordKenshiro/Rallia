import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Overlay } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';

interface PickleballRatingOverlayProps {
  visible: boolean;
  onClose: () => void;
  onContinue?: (rating: string) => void;
}

interface Rating {
  id: string;
  level: string;
  dupr: string;
  description: string;
  isHighlighted?: boolean;
}

const PickleballRatingOverlay: React.FC<PickleballRatingOverlayProps> = ({
  visible,
  onClose,
  onContinue,
}) => {
  const [selectedRating, setSelectedRating] = useState<string | null>(null);

  const ratings: Rating[] = [
    {
      id: 'beginner',
      level: 'Beginner',
      dupr: 'DUPR 2.0',
      description:
        'Just getting started. Short rallies (1-2 shots). Learning basic scoring knowledge.',
      isHighlighted: false,
    },
    {
      id: 'lower-intermediate',
      level: 'Lower Intermediate',
      dupr: 'DUPR 3.0',
      description: 'Can sustain short rallies and serves. Beginning to dink. Learning positioning.',
      isHighlighted: false,
    },
    {
      id: 'intermediate',
      level: 'Intermediate',
      dupr: 'DUPR 3.5',
      description: 'Developing third-shot drop. Can dink moderately. Avoids backhands.',
      isHighlighted: false,
    },
    {
      id: 'upper-intermediate',
      level: 'Upper Intermediate',
      dupr: 'DUPR 4.0',
      description:
        'Plays longer rallies with patience. Aware of positioning. Uses varied shots. Mixing power and soft shots.',
      isHighlighted: false,
    },
    {
      id: 'advanced',
      level: 'Advanced',
      dupr: 'DUPR 4.5',
      description:
        'Strong consistency and power. Varied shots. Faster speed. Comfortable crashing near the kitchen.',
      isHighlighted: true,
    },
    {
      id: 'elite',
      level: 'Elite',
      dupr: 'DUPR 5.0+',
      description:
        'Highest level of shot types. Rarely makes unforced errors. Plays competitively.',
      isHighlighted: false,
    },
  ];

  const handleContinue = () => {
    if (selectedRating && onContinue) {
      console.log('Selected pickleball rating:', selectedRating);
      onContinue(selectedRating);
    }
  };

  return (
    <Overlay visible={visible} onClose={onClose} type="bottom">
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Tell us about your game</Text>

        {/* Sport Badge */}
        <View style={styles.sportBadge}>
          <Text style={styles.sportBadgeText}>Pickleball</Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>DUPR Rating</Text>

        {/* Rating Options */}
        <ScrollView style={styles.ratingList} showsVerticalScrollIndicator={false}>
          <View style={styles.ratingGrid}>
            {ratings.map(rating => (
              <TouchableOpacity
                key={rating.id}
                style={[
                  styles.ratingCard,
                  rating.isHighlighted && styles.ratingCardHighlighted,
                  selectedRating === rating.id && styles.ratingCardSelected,
                ]}
                onPress={() => setSelectedRating(rating.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.ratingLevel,
                    rating.isHighlighted && styles.ratingLevelHighlighted,
                    selectedRating === rating.id && styles.ratingLevelSelected,
                  ]}
                >
                  {rating.level}
                </Text>
                <Text
                  style={[
                    styles.ratingDupr,
                    rating.isHighlighted && styles.ratingDuprHighlighted,
                    selectedRating === rating.id && styles.ratingDuprSelected,
                  ]}
                >
                  {rating.dupr}
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
        </ScrollView>

        {/* Continue Button */}
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
            Continue
          </Text>
        </TouchableOpacity>
      </View>
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
});

export default PickleballRatingOverlay;
