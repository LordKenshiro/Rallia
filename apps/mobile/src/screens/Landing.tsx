import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RalliaLogo from '../../assets/images/light mode logo.svg';
import { ANIMATION_DELAYS, COLORS } from '../constants';

const { width, height } = Dimensions.get('window');

// Use native driver only on native platforms
const useNativeDriver = Platform.OS !== 'web';

const Landing = () => {
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver,
      }),
      // Scale up with bounce
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver,
      }),
      // Slight rotation
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver,
      }),
    ]).start();

    // Wait for splash duration, then fade out and navigate
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver,
        }),
        Animated.timing(slideAnim, {
          toValue: -height,
          duration: 700,
          useNativeDriver,
        }),
      ]).start(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as never }],
        });
      });
    }, ANIMATION_DELAYS.SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, scaleAnim, rotateAnim, slideAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { rotate: spin }],
          },
        ]}
      >
        <RalliaLogo width={200} height={80} />
      </Animated.View>

      {/* Animated circles in background for extra coolness */}
      <Animated.View
        style={[
          styles.circle1,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.1],
            }),
            transform: [
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0.3, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle2,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.15],
            }),
            transform: [
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0.3, 1],
                  outputRange: [0, 1.2],
                }),
              },
            ],
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  circle1: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: (width * 1.5) / 2,
    backgroundColor: '#fff',
    top: -width * 0.5,
  },
  circle2: {
    position: 'absolute',
    width: width * 1.8,
    height: width * 1.8,
    borderRadius: (width * 1.8) / 2,
    backgroundColor: COLORS.primary,
    bottom: -width * 0.8,
  },
});

export default Landing;
