/**
 * StarRating Component
 *
 * A reusable 5-star rating input with animations and haptic feedback.
 * Used in the match feedback wizard for rating opponents.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels } from '@rallia/design-system';
import { lightHaptic, selectionHaptic } from '@rallia/shared-utils';

// =============================================================================
// TYPES
// =============================================================================

interface StarRatingProps {
  /** Current rating value (1-5, undefined if not set) */
  value?: number;
  /** Callback when rating changes */
  onChange: (rating: number) => void;
  /** Size of the star icons */
  size?: number;
  /** Color for filled stars */
  activeColor: string;
  /** Color for empty stars */
  inactiveColor: string;
  /** Whether the rating is disabled */
  disabled?: boolean;
  /** Optional label text */
  label?: string;
  /** Label text color */
  labelColor?: string;
}

// =============================================================================
// ANIMATED STAR COMPONENT
// =============================================================================

interface AnimatedStarProps {
  index: number;
  filled: boolean;
  onPress: () => void;
  size: number;
  activeColor: string;
  inactiveColor: string;
  disabled: boolean;
}

const AnimatedStar: React.FC<AnimatedStarProps> = ({
  index,
  filled,
  onPress,
  size,
  activeColor,
  inactiveColor,
  disabled,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (disabled) return;

    // Trigger scale animation
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );

    // Haptic feedback
    selectionHaptic();

    onPress();
  }, [disabled, onPress, scale]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Rate ${index + 1} star${index === 0 ? '' : 's'}`}
      accessibilityState={{ selected: filled }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={size}
          color={filled ? activeColor : inactiveColor}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  size = 32,
  activeColor,
  inactiveColor,
  disabled = false,
  label,
  labelColor,
}) => {
  const handleStarPress = useCallback(
    (starIndex: number) => {
      const newRating = starIndex + 1;

      // If tapping the same star that's already selected, toggle it off
      // Otherwise, set the new rating
      if (value === newRating) {
        // Could implement toggle-off behavior here if needed
        // For now, just confirm the selection
        lightHaptic();
      }

      onChange(newRating);
    },
    [value, onChange]
  );

  return (
    <View style={styles.container}>
      {label && (
        <Text size="sm" weight="semibold" color={labelColor} style={styles.label}>
          {label}
        </Text>
      )}
      <View style={styles.starsContainer}>
        {[0, 1, 2, 3, 4].map(index => (
          <AnimatedStar
            key={index}
            index={index}
            filled={value !== undefined && index < value}
            onPress={() => handleStarPress(index)}
            size={size}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            disabled={disabled}
          />
        ))}
      </View>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    marginBottom: spacingPixels[2],
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacingPixels[2],
  },
});

export default StarRating;
