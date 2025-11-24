import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utility functions for enhanced UX
 */

/**
 * Light impact feedback for selections, toggles
 */
export const lightHaptic = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // Haptics may not be available on all devices
    console.log('Haptics not available');
  }
};

/**
 * Medium impact feedback for important actions
 */
export const mediumHaptic = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Heavy impact feedback for critical actions
 */
export const heavyHaptic = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Success notification feedback
 */
export const successHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Warning notification feedback
 */
export const warningHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Error notification feedback
 */
export const errorHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.log('Haptics not available');
  }
};

/**
 * Selection changed feedback (lighter than light impact)
 */
export const selectionHaptic = async () => {
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.log('Haptics not available');
  }
};
