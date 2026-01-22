/**
 * Error Handler - Base Implementation
 *
 * This file is used for TypeScript type checking.
 * At runtime, bundlers will resolve to platform-specific files:
 * - errorHandler.native.ts (React Native)
 * - errorHandler.web.ts (Web)
 */

export {
  showError,
  showSuccess,
  showWarning,
  showConfirmation,
  showDestructiveConfirmation,
} from './errorHandler.web';
