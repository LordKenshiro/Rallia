/**
 * AnimatedPressable Component
 *
 * A wrapper component that adds a subtle scale animation on press.
 * Use this to make cards and interactive elements feel more responsive.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleValue?: number;
  animationDuration?: number;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  disabled = false,
  scaleValue = 0.97,
  animationDuration = 100,
}) => {
  // Using useMemo to create stable Animated.Value instance
  const scaleAnim = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: scaleValue,
      duration: animationDuration,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, scaleValue, animationDuration]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: animationDuration,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, animationDuration]);

  return (
    <TouchableWithoutFeedback
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default AnimatedPressable;
