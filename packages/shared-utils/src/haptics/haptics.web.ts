/**
 * Haptic Feedback - Web Implementation
 *
 * Provides haptic feedback for web using the Vibration API
 * Falls back to no-op if not supported
 */

/**
 * Vibrate helper (checks for API availability)
 */
const vibrate = (pattern: number | number[]): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

/**
 * Light impact feedback for selections, toggles
 */
export const lightHaptic = async (): Promise<void> => {
  vibrate(10);
};

/**
 * Medium impact feedback for important actions
 */
export const mediumHaptic = async (): Promise<void> => {
  vibrate(20);
};

/**
 * Heavy impact feedback for critical actions
 */
export const heavyHaptic = async (): Promise<void> => {
  vibrate(30);
};

/**
 * Success notification feedback
 */
export const successHaptic = async (): Promise<void> => {
  vibrate([10, 50, 10]);
};

/**
 * Warning notification feedback
 */
export const warningHaptic = async (): Promise<void> => {
  vibrate([20, 30, 20]);
};

/**
 * Error notification feedback
 */
export const errorHaptic = async (): Promise<void> => {
  vibrate([30, 50, 30, 50, 30]);
};

/**
 * Selection changed feedback (lighter than light impact)
 */
export const selectionHaptic = async (): Promise<void> => {
  vibrate(5);
};
