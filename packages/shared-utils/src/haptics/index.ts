/**
 * Haptic Feedback - Platform-agnostic exports
 *
 * Automatically selects the correct implementation based on platform
 * - Native (React Native): Uses Expo Haptics
 * - Web: Uses Vibration API
 */

export {
  lightHaptic,
  mediumHaptic,
  heavyHaptic,
  successHaptic,
  warningHaptic,
  errorHaptic,
  selectionHaptic,
} from './haptics';
