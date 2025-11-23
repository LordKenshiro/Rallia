import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Overlay from '../../../../components/overlays/Overlay';
import { COLORS } from '../../../../constants';

interface TennisRatingOverlayProps {
  visible: boolean;
  onClose: () => void;
  onContinue?: (rating: string) => void;
}

interface Rating {
  id: string;
  level: string;
  ntrp: string;
  description: string;
  isHighlighted?: boolean;
}

const TennisRatingOverlay: React.FC<TennisRatingOverlayProps> = ({ 
  visible, 
  onClose,
  onContinue,
}) => {
  const [selectedRating, setSelectedRating] = useState<string | null>(null);

  const ratings: Rating[] = [
    {
      id: 'beginner',
      level: 'Beginner',
      ntrp: 'NTRP 1.5',
      description: 'Still working on getting consistent; errors, many focused on getting the ball into play.',
      isHighlighted: false,
    },
    {
      id: 'novice',
      level: 'Novice',
      ntrp: 'NTRP 2.0',
      description: 'Obvious stroke weaknesses for singles and doubles. Has clear stroke weaknesses and needs more court experience.',
      isHighlighted: false,
    },
    {
      id: 'advancing-beginner',
      level: 'Advancing Beginner',
      ntrp: 'NTRP 2.5',
      description: 'Starting to judge ball direction and sustain short rallies; limited court coverage.',
      isHighlighted: false,
    },
    {
      id: 'recreational',
      level: 'Recreational Player',
      ntrp: 'NTRP 3.0 - 3.5',
      description: 'Fairly consistent on medium paced shots but lacks control, depth and power with faster shots. Struggles with formations.',
      isHighlighted: true,
    },
    {
      id: 'intermediate',
      level: 'Intermediate',
      ntrp: 'NTRP 3.5',
      description: 'More reliable strokes with directional control. Improving net play, coverage, and teamwork.',
      isHighlighted: false,
    },
    {
      id: 'advanced-intermediate',
      level: 'Advanced Intermediate',
      ntrp: 'NTRP 4.0',
      description: 'Dependable strokes with control and depth; placement in point play shows teamwork, though rallies may end from impatience.',
      isHighlighted: false,
    },
  ];

  const handleContinue = () => {
    if (selectedRating && onContinue) {
      console.log('Selected tennis rating:', selectedRating);
      onContinue(selectedRating);
    }
  };

  return (
    <Overlay visible={visible} onClose={onClose} type="bottom">
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
        <Text style={styles.title}>Tell us about your game</Text>

        {/* Sport Badge */}
        <View style={styles.sportBadge}>
          <Text style={styles.sportBadgeText}>Tennis</Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>NTRP Rating</Text>

        {/* Rating Options */}
        <ScrollView 
          style={styles.ratingList}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.ratingGrid}>
            {ratings.map((rating) => (
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
                <Text style={[
                  styles.ratingLevel,
                  rating.isHighlighted && styles.ratingLevelHighlighted,
                  selectedRating === rating.id && styles.ratingLevelSelected,
                ]}>
                  {rating.level}
                </Text>
                <Text style={[
                  styles.ratingNtrp,
                  rating.isHighlighted && styles.ratingNtrpHighlighted,
                  selectedRating === rating.id && styles.ratingNtrpSelected,
                ]}>
                  {rating.ntrp}
                </Text>
                <Text style={[
                  styles.ratingDescription,
                  rating.isHighlighted && styles.ratingDescriptionHighlighted,
                  selectedRating === rating.id && styles.ratingDescriptionSelected,
                ]}>
                  {rating.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Continue Button */}
        <TouchableOpacity 
          style={[
            styles.continueButton,
            !selectedRating && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          activeOpacity={selectedRating ? 0.8 : 1}
          disabled={!selectedRating}
        >
          <Text style={[
            styles.continueButtonText,
            !selectedRating && styles.continueButtonTextDisabled
          ]}>
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
  ratingNtrp: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  ratingNtrpHighlighted: {
    color: '#E0F9F7',
  },
  ratingNtrpSelected: {
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

export default TennisRatingOverlay;
