import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import ProgressIndicator from '../ProgressIndicator';
import { selectionHaptic, mediumHaptic } from '../../../../utils/haptics';

interface SportSelectionOverlayProps {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  onContinue?: (selectedSports: string[]) => void;
  currentStep?: number;
  totalSteps?: number;
}

interface Sport {
  id: string;
  name: string;
  image: any; // For now, we'll use placeholder images
}

const SportSelectionOverlay: React.FC<SportSelectionOverlayProps> = ({
  visible,
  onClose,
  onBack,
  onContinue,
  currentStep = 1,
  totalSteps = 8,
}) => {
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

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

  const sports: Sport[] = [
    { id: 'tennis', name: 'Tennis', image: require('../../../../../assets/images/tennis.jpg') },
    {
      id: 'pickleball',
      name: 'Pickleball',
      image: require('../../../../../assets/images/pickleball.jpg'),
    },
    // Add more sports as needed
  ];

  const toggleSport = (sportId: string) => {
    selectionHaptic();
    setSelectedSports(prev => {
      if (prev.includes(sportId)) {
        return prev.filter(id => id !== sportId);
      } else {
        return [...prev, sportId];
      }
    });
  };

  const handleContinue = () => {
    mediumHaptic();
    console.log('Selected sports:', selectedSports);
    if (onContinue) {
      onContinue(selectedSports);
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
        {/* Progress Indicator */}
        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />

        {/* Title */}
        <Text style={styles.title}>Which sports would you{'\n'}like to play?</Text>
        <Text style={styles.subtitle}>Select all that apply</Text>

        {/* Sports Grid */}
        <ScrollView style={styles.sportsContainer} showsVerticalScrollIndicator={false}>
          {sports.map(sport => {
            const isSelected = selectedSports.includes(sport.id);
            return (
              <TouchableOpacity
                key={sport.id}
                style={[styles.sportCard, isSelected && styles.sportCardSelected]}
                onPress={() => toggleSport(sport.id)}
                activeOpacity={0.8}
              >
                {/* Sport Image Placeholder */}
                <View style={styles.sportImageContainer}>
                  <Image source={sport.image} style={styles.sportImage} resizeMode="cover" />
                  {/* Overlay for darkening effect */}
                  <View style={styles.sportImageOverlay} />
                </View>

                {/* Sport Name */}
                <View style={styles.sportNameContainer}>
                  <Text style={styles.sportName}>{sport.name}</Text>
                  {isSelected && <Ionicons name="checkmark" size={24} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedSports.length === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedSports.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  sportsContainer: {
    maxHeight: 400,
    marginBottom: 20,
  },
  sportCard: {
    height: 140,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  sportCardSelected: {
    borderColor: COLORS.primary,
  },
  sportImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  sportImage: {
    width: '100%',
    height: '100%',
  },
  sportImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sportNameContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sportName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  continueButton: {
    backgroundColor: COLORS.buttonPrimary,
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.overlayDark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.buttonDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SportSelectionOverlay;
