/**
 * SuccessStep Component
 *
 * Final success screen of onboarding - animated celebration.
 * Shows after completing all onboarding steps.
 * If user selected multiple sports, shows sport picker to select initial sport.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { selectionHaptic } from '@rallia/shared-utils';

const BASE_WHITE = '#ffffff';
import type { TranslationKey } from '@rallia/shared-translations';

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  buttonActive: string;
  buttonInactive: string;
  buttonTextActive: string;
  success: string;
}

export interface Sport {
  id: string;
  name: string;
  display_name: string;
  icon_url?: string | null;
}

interface SuccessStepProps {
  onComplete: () => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
  isDark: boolean;
  selectedSports: Sport[];
  onSelectInitialSport: (sport: Sport) => void | Promise<void>;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({
  onComplete,
  colors,
  t,
  isDark,
  selectedSports,
  onSelectInitialSport,
}) => {
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const hasMultipleSports = selectedSports.length > 1;

  // Auto-select if only one sport
  useEffect(() => {
    if (selectedSports.length === 1) {
      const sport = selectedSports[0];
      setSelectedSportId(sport.id);
      onSelectInitialSport(sport);
    }
  }, [selectedSports, onSelectInitialSport]);

  // Animation values
  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const sportPickerOpacity = useSharedValue(0);

  // Trigger animations on mount
  useEffect(() => {
    // Icon animation - pop in with bounce
    iconScale.value = withDelay(200, withSpring(1, { damping: 40, stiffness: 300 }));
    iconOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));

    // Text animation - fade in
    textOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));

    // Sport picker animation (if multiple sports)
    if (hasMultipleSports) {
      sportPickerOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    }

    // Button animation - slide up and fade in
    buttonOpacity.value = withDelay(
      hasMultipleSports ? 1000 : 800,
      withTiming(1, { duration: 400 })
    );
    buttonTranslateY.value = withDelay(
      hasMultipleSports ? 1000 : 800,
      withSpring(0, { damping: 40, stiffness: 300 })
    );
  }, [
    iconScale,
    iconOpacity,
    textOpacity,
    buttonOpacity,
    buttonTranslateY,
    sportPickerOpacity,
    hasMultipleSports,
  ]);

  const handleSportSelect = (sport: Sport) => {
    selectionHaptic();
    setSelectedSportId(sport.id);
    onSelectInitialSport(sport);
  };

  const canComplete = !hasMultipleSports || selectedSportId !== null;

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const sportPickerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sportPickerOpacity.value,
  }));

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Success Icon */}
      <Animated.View
        style={[styles.iconContainer, { backgroundColor: colors.buttonActive }, iconAnimatedStyle]}
      >
        <Ionicons name="checkmark" size={48} color={BASE_WHITE} />
      </Animated.View>

      {/* Success Text */}
      <Animated.View style={textAnimatedStyle}>
        <Text size="xl" weight="bold" color={colors.text} style={styles.title}>
          {t('onboarding.success.title' as TranslationKey)}
        </Text>
        <Text size="base" color={colors.textMuted} style={styles.subtitle}>
          {hasMultipleSports
            ? 'Select a sport to start exploring'
            : t('onboarding.success.subtitle' as TranslationKey)}
        </Text>
      </Animated.View>

      {/* Sport Picker (only if multiple sports) */}
      {hasMultipleSports && (
        <Animated.View style={[styles.sportPickerContainer, sportPickerAnimatedStyle]}>
          <Text size="base" weight="semibold" color={colors.text} style={styles.sportPickerTitle}>
            Choose your starting sport
          </Text>
          <View style={styles.sportCardsContainer}>
            {selectedSports.map(sport => {
              const isSelected = selectedSportId === sport.id;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportCard,
                    {
                      borderColor: isSelected ? colors.buttonActive : colors.border,
                      backgroundColor: isSelected
                        ? `${colors.buttonActive}15`
                        : colors.cardBackground,
                    },
                  ]}
                  onPress={() => handleSportSelect(sport)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sportCardContent}>
                    <Ionicons
                      name={
                        sport.name.toLowerCase() === 'pickleball'
                          ? 'baseball-outline'
                          : 'tennisball-outline'
                      }
                      size={24}
                      color={isSelected ? colors.buttonActive : colors.textMuted}
                    />
                    <Text
                      size="base"
                      weight={isSelected ? 'semibold' : 'regular'}
                      color={isSelected ? colors.buttonActive : colors.text}
                      style={styles.sportCardText}
                    >
                      {sport.display_name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.buttonActive} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Continue Button */}
      <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: canComplete ? colors.buttonActive : colors.buttonInactive,
            },
          ]}
          onPress={canComplete ? onComplete : undefined}
          activeOpacity={canComplete ? 0.8 : 1}
          disabled={!canComplete}
        >
          <Text size="base" weight="semibold" color={colors.buttonTextActive}>
            {t('onboarding.success.getStarted' as TranslationKey)}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingPixels[6],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: radiusPixels.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingPixels[4],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacingPixels[2],
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacingPixels[6],
  },
  sportPickerContainer: {
    width: '100%',
    marginBottom: spacingPixels[6],
  },
  sportPickerTitle: {
    textAlign: 'center',
    marginBottom: spacingPixels[3],
  },
  sportCardsContainer: {
    width: '100%',
    gap: spacingPixels[3],
  },
  sportCard: {
    borderRadius: radiusPixels.lg,
    borderWidth: 2,
    padding: spacingPixels[4],
  },
  sportCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[3],
  },
  sportCardText: {
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
  },
  continueButton: {
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    alignItems: 'center',
  },
});

export default SuccessStep;
