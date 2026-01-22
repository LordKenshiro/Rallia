/**
 * SportStep - First step of the pre-onboarding wizard
 *
 * Allows users to select which sports they play.
 * Tracks selection order so the first-selected sport becomes the default view.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text, Spinner, Button } from '@rallia/shared-components';
import { spacingPixels, radiusPixels, primary, neutral } from '@rallia/design-system';
import { SportService, Logger } from '@rallia/shared-services';
import { selectionHaptic } from '@rallia/shared-utils';
import { useThemeStyles, useTranslation } from '../../hooks';
import type { Sport as DatabaseSport } from '@rallia/shared-types';

const BASE_WHITE = '#ffffff';

// Simplified Sport type for this component
export interface Sport {
  id: string;
  name: string;
  display_name: string;
  icon_url?: string | null;
}

interface SportStepProps {
  /** Called when user taps Continue with their selected sports */
  onContinue: (orderedSports: Sport[]) => void;
  /** Whether the step is currently active */
  isActive?: boolean;
}

export function SportStep({ onContinue, isActive = true }: SportStepProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();

  // State
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderedSelection, setOrderedSelection] = useState<Sport[]>([]);

  // Fetch sports on mount
  useEffect(() => {
    const fetchSports = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await SportService.getAllSports();

        if (error) {
          Logger.error('Failed to fetch sports for selection screen', error as Error);
          // Fallback sports
          setSports([
            { id: 'tennis-fallback', name: 'tennis', display_name: 'Tennis' },
            { id: 'pickleball-fallback', name: 'pickleball', display_name: 'Pickleball' },
          ]);
        } else if (data) {
          const activeSports: Sport[] = data
            .filter((sport: DatabaseSport) => sport.is_active)
            .map((sport: DatabaseSport) => ({
              id: sport.id,
              name: sport.name,
              display_name: sport.display_name,
              icon_url: sport.icon_url,
            }));
          setSports(activeSports);
        }
      } catch (error) {
        Logger.error('Unexpected error fetching sports', error as Error);
        setSports([
          { id: 'tennis-fallback', name: 'tennis', display_name: 'Tennis' },
          { id: 'pickleball-fallback', name: 'pickleball', display_name: 'Pickleball' },
        ]);
      }
      setIsLoading(false);
    };

    fetchSports();
  }, []);

  const toggleSport = useCallback((sport: Sport) => {
    selectionHaptic();

    setOrderedSelection(prev => {
      const existingIndex = prev.findIndex(s => s.id === sport.id);
      if (existingIndex >= 0) {
        // Remove from selection
        return prev.filter(s => s.id !== sport.id);
      } else {
        // Add to selection (order matters)
        return [...prev, sport];
      }
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (orderedSelection.length === 0) return;
    onContinue(orderedSelection);
  }, [orderedSelection, onContinue]);

  const getSportImage = (sportName: string) => {
    const lowerName = sportName.toLowerCase();
    if (lowerName.includes('tennis')) {
      return require('../../../assets/images/tennis.jpg');
    } else if (lowerName.includes('pickleball')) {
      return require('../../../assets/images/pickleball.jpg');
    }
    return require('../../../assets/images/tennis.jpg');
  };

  const getSelectionOrder = (sportId: string): number | null => {
    const index = orderedSelection.findIndex(s => s.id === sportId);
    return index >= 0 ? index + 1 : null;
  };

  if (!isActive) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <Animated.View
          entering={FadeInDown.delay(50).springify()}
          style={styles.headerSection}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' },
            ]}
          >
            <Ionicons
              name="tennisball"
              size={36}
              color={isDark ? primary[400] : primary[600]}
            />
          </View>

          <Text
            size="xl"
            weight="bold"
            color={colors.foreground}
            style={styles.title}
          >
            {t('sportSelectionOverlay.title')}
          </Text>

          <Text size="sm" color={colors.textMuted} style={styles.subtitle}>
            {t('sportSelectionOverlay.subtitle')}
          </Text>
        </Animated.View>

        {/* Sport Cards */}
        <View style={styles.cardsContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Spinner size="lg" />
              <Text size="sm" color={colors.textMuted} style={styles.loadingText}>
                {t('sportSelectionOverlay.loading')}
              </Text>
            </View>
          ) : (
            sports.map((sport, index) => {
              const selectionOrder = getSelectionOrder(sport.id);
              const isSelected = selectionOrder !== null;

              return (
                <Animated.View
                  key={sport.id}
                  entering={FadeInDown.delay(150 + index * 100).springify()}
                >
                  <TouchableOpacity
                    style={[
                      styles.sportCard,
                      isSelected ? styles.sportCardSelected : styles.sportCardUnselected,
                    ]}
                    onPress={() => toggleSport(sport)}
                    activeOpacity={0.85}
                  >
                    {/* Sport Image */}
                    <View style={styles.sportImageContainer}>
                      <Image
                        source={getSportImage(sport.name)}
                        style={styles.sportImage}
                        resizeMode="cover"
                      />
                      {/* Gradient overlay for better text readability */}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                        style={styles.sportImageGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                    </View>

                    {/* Sport Info */}
                    <View style={styles.sportInfoContainer}>
                      <View style={styles.sportNameRow}>
                        <Text size="xl" weight="bold" color={BASE_WHITE}>
                          {sport.display_name}
                        </Text>

                        {/* Selection indicator */}
                        {isSelected ? (
                          <View style={styles.selectionBadge}>
                            {orderedSelection.length > 1 ? (
                              <Text size="sm" weight="bold" color={BASE_WHITE}>
                                {selectionOrder}
                              </Text>
                            ) : (
                              <Ionicons name="checkmark" size={18} color={BASE_WHITE} />
                            )}
                          </View>
                        ) : (
                          <View style={styles.addButton}>
                            <Ionicons name="add" size={22} color={BASE_WHITE} />
                          </View>
                        )}
                      </View>

                      {/* Tap to select hint */}
                      <Text size="xs" color="rgba(255,255,255,0.7)" style={styles.tapHint}>
                        {isSelected
                          ? t('sportSelectionOverlay.tapToRemove')
                          : t('sportSelectionOverlay.tapToSelect')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </View>

        {/* Bottom Section */}
        <Animated.View
          entering={FadeInUp.delay(400).springify()}
          style={styles.bottomSection}
        >
          {orderedSelection.length > 1 && (
            <View
              style={[
                styles.hintBanner,
                {
                  backgroundColor: isDark ? neutral[800] : primary[50],
                  borderColor: isDark ? neutral[700] : primary[100],
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={isDark ? primary[400] : primary[600]}
              />
              <Text size="sm" color={isDark ? primary[300] : primary[700]} style={styles.hintText}>
                {t('sportSelectionOverlay.selectionHint', {
                  sport: orderedSelection[0].display_name,
                })}
              </Text>
            </View>
          )}

          <Button
            variant="primary"
            onPress={handleContinue}
            disabled={orderedSelection.length === 0}
            style={styles.continueButton}
          >
            {orderedSelection.length === 0
              ? t('sportSelectionOverlay.selectAtLeastOne')
              : t('sportSelectionOverlay.getStarted')}
          </Button>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: spacingPixels[5],
    justifyContent: 'space-between',
    paddingBottom: spacingPixels[4],
  },

  // Header section
  headerSection: {
    paddingTop: spacingPixels[2],
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingPixels[3],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacingPixels[1],
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacingPixels[2],
  },

  // Cards section
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacingPixels[4],
    gap: spacingPixels[3],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacingPixels[3],
  },

  // Sport card
  sportCard: {
    height: 180,
    borderRadius: radiusPixels.xl,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
  },
  sportCardSelected: {
    borderWidth: 3,
    borderColor: primary[500],
    shadowColor: primary[500],
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  sportCardUnselected: {
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
  sportImageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sportInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacingPixels[4],
  },
  sportNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tapHint: {
    marginTop: spacingPixels[1],
  },
  selectionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: primary[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },

  // Bottom section
  bottomSection: {
    paddingTop: spacingPixels[2],
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    marginBottom: spacingPixels[3],
  },
  hintText: {
    marginLeft: spacingPixels[2],
    flex: 1,
    lineHeight: 18,
  },
  continueButton: {
    width: '100%',
  },
});

export default SportStep;
