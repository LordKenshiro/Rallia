/**
 * Error Handler - Platform-agnostic exports
 *
 * Automatically selects the correct implementation based on platform
 */

export {
  showError,
  showSuccess,
  showWarning,
  showConfirmation,
  showDestructiveConfirmation,
} from './errorHandler';
