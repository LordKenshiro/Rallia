/**
 * TourCompleteModal - Celebration modal shown after completing a tour
 *
 * This modal appears when:
 * 1. User completes all steps of the main navigation tour
 * 2. User finishes on the last step (not skip)
 *
 * It celebrates the completion and encourages the user to start exploring.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@rallia/shared-constants';
import { Logger } from '@rallia/shared-services';
import { Ionicons } from '@expo/vector-icons';

interface TourCompleteModalProps {
  /** Whether the modal should be visible */
  visible: boolean;
  /** Callback when modal is dismissed */
  onDismiss: () => void;
  /** The tour that was completed (for analytics) */
  tourId?: string;
}

export const TourCompleteModal: React.FC<TourCompleteModalProps> = ({
  visible,
  onDismiss,
  tourId = 'main_navigation',
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [confettiAnim] = useState(new Animated.Value(0));

  // Animate in when visible changes
  useEffect(() => {
    if (visible) {
      // Animate in with a bouncy effect
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        // Confetti animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(confettiAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(confettiAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      Logger.logUserAction('tour_complete_modal_shown', { tourId });
    }
  }, [visible, fadeAnim, scaleAnim, confettiAnim, tourId]);

  const handleDismiss = useCallback(() => {
    Logger.logUserAction('tour_complete_modal_dismissed', { tourId });

    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [fadeAnim, scaleAnim, onDismiss, tourId]);

  if (!visible) {
    return null;
  }

  // Confetti rotation interpolation
  const confettiRotate = confettiAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              marginBottom: insets.bottom,
            },
          ]}
        >
          {/* Celebration icon with animation */}
          <Animated.View
            style={[styles.iconContainer, { transform: [{ rotate: confettiRotate }] }]}
          >
            <Text style={styles.emoji}>🎉</Text>
          </Animated.View>

          {/* Checkmark badge */}
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('tour.complete.title')}</Text>

          {/* Description */}
          <Text style={styles.description}>{t('tour.complete.description')}</Text>

          {/* Feature summary */}
          <View style={styles.summaryContainer}>
            <SummaryItem icon="home-outline" label={t('tour.mainNavigation.home.title')} />
            <SummaryItem icon="map-outline" label={t('tour.mainNavigation.courts.title')} />
            <SummaryItem icon="add-circle-outline" label={t('tour.mainNavigation.actions.title')} />
            <SummaryItem icon="chatbubbles-outline" label={t('tour.mainNavigation.chat.title')} />
            <SummaryItem icon="person-outline" label={t('tour.mainNavigation.profile.title')} />
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleDismiss}
            accessibilityLabel={t('tour.complete.button')}
            accessibilityRole="button"
          >
            <Text style={styles.ctaButtonText}>{t('tour.complete.button')}</Text>
            <Ionicons
              name="arrow-forward-outline"
              size={20}
              color={COLORS.white}
              style={styles.ctaIcon}
            />
          </TouchableOpacity>

          {/* Subtle tip */}
          <Text style={styles.tip}>{t('tour.complete.tip')}</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Summary item component
interface SummaryItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ icon, label }) => (
  <View style={styles.summaryItem}>
    <View style={styles.summaryIconContainer}>
      <Ionicons name={icon} size={16} color={COLORS.primary} />
    </View>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Ionicons name="checkmark-outline" size={16} color={COLORS.success} />
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconContainer: {
    marginBottom: 8,
  },
  emoji: {
    fontSize: 64,
  },
  checkBadge: {
    position: 'absolute',
    top: 70,
    right: '35%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 2,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryContainer: {
    width: '100%',
    backgroundColor: COLORS.veryLightGray,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  ctaIcon: {
    marginLeft: 8,
  },
  tip: {
    marginTop: 16,
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default TourCompleteModal;
