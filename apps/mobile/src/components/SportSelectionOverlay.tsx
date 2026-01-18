/**
 * SportSelectionOverlay - First-time sport selection overlay
 *
 * Shows after the splash animation for first-time users to select their
 * preferred sports. Tracks selection order so the first-selected sport
 * becomes the default view in the app.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Spinner, Button } from '@rallia/shared-components';
import { spacingPixels, radiusPixels, primary, neutral } from '@rallia/design-system';
import { SportService, Logger } from '@rallia/shared-services';
import { selectionHaptic, mediumHaptic } from '@rallia/shared-utils';
import { useThemeStyles, useTranslation } from '../hooks';
import type { Sport as DatabaseSport } from '@rallia/shared-types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WHITE = '#ffffff';

// Simplified Sport type for this component
interface Sport {
  id: string;
  name: string;
  display_name: string;
  icon_url?: string | null;
}

interface SportSelectionOverlayProps {
  /** Whether the overlay is visible (rendered in the tree) */
  visible: boolean;
  /** Whether to start the entrance animation (typically when splash completes) */
  startAnimation: boolean;
  /** Callback when user completes sport selection */
  onComplete: (orderedSports: Sport[]) => void;
}

export function SportSelectionOverlay({
  visible,
  startAnimation,
  onComplete,
}: SportSelectionOverlayProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();

  // State
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderedSelection, setOrderedSelection] = useState<Sport[]>([]);

  // Animation values - use useMemo to avoid accessing refs during render
  const containerOpacity = useMemo(() => new Animated.Value(0), []);
  const contentTranslateY = useMemo(() => new Animated.Value(50), []);
  const card1Opacity = useMemo(() => new Animated.Value(0), []);
  const card1TranslateY = useMemo(() => new Animated.Value(30), []);
  const card2Opacity = useMemo(() => new Animated.Value(0), []);
  const card2TranslateY = useMemo(() => new Animated.Value(30), []);
  const buttonOpacity = useMemo(() => new Animated.Value(0), []);
  const buttonTranslateY = useMemo(() => new Animated.Value(20), []);

  // Fetch sports on mount
  useEffect(() => {
    const fetchSports = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await SportService.getAllSports();

        if (error) {
          Logger.error('Failed to fetch sports for selection overlay', error as Error);
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

    if (visible) {
      fetchSports();
    }
  }, [visible]);

  // Track if we've already run the entrance animation
  const hasAnimated = useRef(false);

  // Entrance animation - only starts when startAnimation becomes true
  // This ensures the animation plays when splash fades out, not before
  useEffect(() => {
    if (visible && startAnimation && !isLoading && sports.length > 0 && !hasAnimated.current) {
      hasAnimated.current = true;

      // Reset animation values
      containerOpacity.setValue(0);
      contentTranslateY.setValue(50);
      card1Opacity.setValue(0);
      card1TranslateY.setValue(30);
      card2Opacity.setValue(0);
      card2TranslateY.setValue(30);
      buttonOpacity.setValue(0);
      buttonTranslateY.setValue(20);

      // Staggered entrance animation
      Animated.sequence([
        // Container fade in
        Animated.parallel([
          Animated.timing(containerOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(contentTranslateY, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        // Cards stagger
        Animated.stagger(100, [
          Animated.parallel([
            Animated.timing(card1Opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(card1TranslateY, {
              toValue: 0,
              tension: 80,
              friction: 10,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(card2Opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(card2TranslateY, {
              toValue: 0,
              tension: 80,
              friction: 10,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Button fade in
        Animated.parallel([
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(buttonTranslateY, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [
    visible,
    startAnimation,
    isLoading,
    sports.length,
    containerOpacity,
    contentTranslateY,
    card1Opacity,
    card1TranslateY,
    card2Opacity,
    card2TranslateY,
    buttonOpacity,
    buttonTranslateY,
  ]);

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

    mediumHaptic();

    // Exit animation
    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 250,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      onComplete(orderedSelection);
    });
  }, [orderedSelection, containerOpacity, onComplete]);

  const getSportImage = (sportName: string) => {
    const lowerName = sportName.toLowerCase();
    if (lowerName.includes('tennis')) {
      return require('../../assets/images/tennis.jpg');
    } else if (lowerName.includes('pickleball')) {
      return require('../../assets/images/pickleball.jpg');
    }
    return require('../../assets/images/tennis.jpg');
  };

  const getSelectionOrder = (sportId: string): number | null => {
    const index = orderedSelection.findIndex(s => s.id === sportId);
    return index >= 0 ? index + 1 : null;
  };

  // Memoize card animations array
  const cardAnimations = useMemo(
    () => [
      { opacity: card1Opacity, translateY: card1TranslateY },
      { opacity: card2Opacity, translateY: card2TranslateY },
    ],
    [card1Opacity, card1TranslateY, card2Opacity, card2TranslateY]
  );

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          opacity: containerOpacity,
          paddingTop: insets.top + spacingPixels[6],
          paddingBottom: insets.bottom + spacingPixels[6],
        },
      ]}
    >
      {/* Header Content */}
      <Animated.View
        style={[
          styles.headerContent,
          {
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        <Text size="2xl" weight="bold" color={colors.foreground} style={styles.title}>
          {t('sportSelectionOverlay.title')}
        </Text>
        <Text size="base" color={colors.textMuted} style={styles.subtitle}>
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
            const cardAnim = cardAnimations[index] || cardAnimations[0];

            return (
              <Animated.View
                key={sport.id}
                style={[
                  {
                    opacity: cardAnim.opacity,
                    transform: [{ translateY: cardAnim.translateY }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.sportCard,
                    {
                      borderColor: isSelected ? primary[500] : '#FFFFFF',
                    },
                  ]}
                  onPress={() => toggleSport(sport)}
                  activeOpacity={0.8}
                >
                  {/* Sport Image */}
                  <View style={styles.sportImageContainer}>
                    <Image
                      source={getSportImage(sport.name)}
                      style={styles.sportImage}
                      resizeMode="cover"
                    />
                    <View
                      style={[
                        styles.sportImageOverlay,
                        {
                          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.4)',
                        },
                      ]}
                    />
                  </View>

                  {/* Sport Name */}
                  <View style={styles.sportNameContainer}>
                    <Text size="xl" weight="bold" color={BASE_WHITE}>
                      {sport.display_name}
                    </Text>

                    {/* Selection Badge */}
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
                      <View style={styles.unselectedCircle}>
                        <Ionicons name="add" size={20} color={BASE_WHITE} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </View>

      {/* Continue Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          },
        ]}
      >
        <Button
          variant="primary"
          onPress={handleContinue}
          disabled={orderedSelection.length === 0}
          style={styles.continueButton}
        >
          {t('sportSelectionOverlay.getStarted')}
        </Button>

        {orderedSelection.length > 1 && (
          <Text size="sm" color={colors.textMuted} style={styles.selectionHint}>
            {t('sportSelectionOverlay.selectionHint', { sport: orderedSelection[0].display_name })}
          </Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998, // Below splash overlay (9999) but above everything else
    paddingHorizontal: spacingPixels[5],
    justifyContent: 'space-between',
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: spacingPixels[4],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacingPixels[2],
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacingPixels[4],
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacingPixels[6],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacingPixels[3],
  },
  sportCard: {
    height: 200,
    borderRadius: radiusPixels.xl,
    marginBottom: spacingPixels[4],
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 3,
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
  },
  sportNameContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacingPixels[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    paddingTop: spacingPixels[4],
  },
  continueButton: {
    width: '100%',
  },
  selectionHint: {
    textAlign: 'center',
    marginTop: spacingPixels[3],
    paddingHorizontal: spacingPixels[4],
  },
});

export default SportSelectionOverlay;
