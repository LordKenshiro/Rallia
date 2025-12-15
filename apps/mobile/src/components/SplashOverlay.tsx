import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import RalliaLogoDark from '../../assets/images/logo-dark.svg';
import RalliaLogoLight from '../../assets/images/logo-light.svg';
import { ANIMATION_DELAYS } from '../constants';
import { useThemeStyles } from '@rallia/shared-hooks';
import { primary } from '@rallia/design-system';

const { width } = Dimensions.get('window');

/**
 * SplashOverlay - Animated splash overlay shown on app launch
 *
 * Renders on top of the entire app and fades out after the animation completes.
 * This avoids navigation transitions since it's an overlay, not a screen.
 */
export function SplashOverlay() {
  const { colors, isDark } = useThemeStyles();
  const [isVisible, setIsVisible] = useState(true);

  // Logo animations
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoTranslateY = useRef(new Animated.Value(20)).current;

  // Background circle animations
  const circle1Scale = useRef(new Animated.Value(0.8)).current;
  const circle1Opacity = useRef(new Animated.Value(0)).current;
  const circle2Scale = useRef(new Animated.Value(0.8)).current;
  const circle2Opacity = useRef(new Animated.Value(0)).current;

  // Exit animation
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // All entrance animations run in parallel with staggered delays
    Animated.parallel([
      // Circle 1: fade in and scale up
      Animated.timing(circle1Opacity, {
        toValue: 0.1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(circle1Scale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      // Circle 2: slightly delayed fade in and scale up
      Animated.sequence([
        Animated.delay(80),
        Animated.timing(circle2Opacity, {
          toValue: 0.15,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(80),
        Animated.spring(circle2Scale, {
          toValue: 1,
          tension: 35,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Logo: delayed entrance with bounce
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 80,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(logoTranslateY, {
            toValue: 0,
            tension: 80,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    // Exit animation after splash duration
    const timer = setTimeout(() => {
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }, ANIMATION_DELAYS.SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [
    logoOpacity,
    logoScale,
    logoTranslateY,
    circle1Scale,
    circle1Opacity,
    circle2Scale,
    circle2Opacity,
    exitOpacity,
  ]);

  // Don't render anything after animation completes
  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          opacity: exitOpacity,
        },
      ]}
      pointerEvents="none"
    >
      {/* Background circles */}
      <Animated.View
        style={[
          styles.circle1,
          {
            backgroundColor: colors.card,
            opacity: circle1Opacity,
            transform: [{ scale: circle1Scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle2,
          {
            backgroundColor: isDark ? primary[500] : primary[600],
            opacity: circle2Opacity,
            transform: [{ scale: circle2Scale }],
          },
        ]}
      />

      {/* Logo with bounce entrance */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
          },
        ]}
      >
        {isDark ? (
          <RalliaLogoLight width={200} height={80} />
        ) : (
          <RalliaLogoDark width={200} height={80} />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  circle1: {
    position: 'absolute',
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: (width * 1.4) / 2,
    top: -width * 0.4,
    left: -width * 0.2,
  },
  circle2: {
    position: 'absolute',
    width: width * 1.6,
    height: width * 1.6,
    borderRadius: (width * 1.6) / 2,
    bottom: -width * 0.6,
    right: -width * 0.3,
  },
});
