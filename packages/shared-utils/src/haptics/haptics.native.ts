/**
 * Haptic Feedback - Native Implementation (React Native)
 *
 * Provides haptic feedback for mobile devices using Expo Haptics
 */

import * as Haptics from 'expo-haptics';

/**
 * Light impact feedback for selections, toggles
 */
export const lightHaptic = async (): Promise<void> => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // Haptics may not be available on all devices - fail silently
  }
};

/**
 * Medium impact feedback for important actions
 */
export const mediumHaptic = async (): Promise<void> => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    // Fail silently
  }
};

/**
 * Heavy impact feedback for critical actions
 */
export const heavyHaptic = async (): Promise<void> => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    // Fail silently
  }
};

/**
 * Success notification feedback
 */
export const successHaptic = async (): Promise<void> => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    // Fail silently
  }
};

/**
 * Warning notification feedback
 */
export const warningHaptic = async (): Promise<void> => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    // Fail silently
  }
};

/**
 * Error notification feedback
 */
export const errorHaptic = async (): Promise<void> => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    // Fail silently
  }
};

/**
 * Selection changed feedback (lighter than light impact)
 */
export const selectionHaptic = async (): Promise<void> => {
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    // Fail silently
  }
};
