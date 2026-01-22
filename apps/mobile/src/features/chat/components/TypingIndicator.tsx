/**
 * TypingIndicator Component
 * Shows when other users are typing in a conversation
 */

import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

import { Text } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';
import { spacingPixels, fontSizePixels, primary } from '@rallia/design-system';
import type { TypingIndicator as TypingIndicatorType } from '@rallia/shared-services';

interface TypingIndicatorProps {
  typingUsers: TypingIndicatorType[];
}

function TypingIndicatorComponent({ typingUsers }: TypingIndicatorProps) {
  const { colors } = useThemeStyles();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingUsers.length === 0) return;

    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dot1, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dot2, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dot3, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dot1, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dot2, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dot3, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(animateDots);
    };

    animateDots();

    return () => {
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [typingUsers.length, dot1, dot2, dot3]);

  if (typingUsers.length === 0) return null;

  // Build the typing message
  let typingText = '';
  if (typingUsers.length === 1) {
    typingText = `${typingUsers[0].player_name} is typing`;
  } else if (typingUsers.length === 2) {
    typingText = `${typingUsers[0].player_name} and ${typingUsers[1].player_name} are typing`;
  } else {
    typingText = `${typingUsers[0].player_name} and ${typingUsers.length - 1} others are typing`;
  }

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.textMuted }]}>
          {typingText}
        </Text>
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: primary[500] }, dotStyle(dot1)]} />
          <Animated.View style={[styles.dot, { backgroundColor: primary[500] }, dotStyle(dot2)]} />
          <Animated.View style={[styles.dot, { backgroundColor: primary[500] }, dotStyle(dot3)]} />
        </View>
      </View>
    </View>
  );
}

export const TypingIndicator = memo(TypingIndicatorComponent);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[2],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: fontSizePixels.sm,
    fontStyle: 'italic',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginLeft: spacingPixels[1],
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
});
