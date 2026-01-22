/**
 * Simple cross-platform logger for shared packages
 * Works in both web and React Native environments
 */

type LogContext = Record<string, unknown>;

// Check if we're in development mode (works in both RN and web)
const isDev = (): boolean => {
  try {
    // React Native global
    if (typeof __DEV__ !== 'undefined') {
      return __DEV__;
    }
  } catch {
    // Ignore
  }
  // Web/Node.js environment variable
  return process.env.NODE_ENV === 'development';
};

const formatMessage = (message: string, context?: LogContext): string => {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }
  return `${message} ${JSON.stringify(context)}`;
};

export const Logger = {
  debug: (message: string, context?: LogContext): void => {
    if (isDev()) {
      console.debug(`[DEBUG] ${formatMessage(message, context)}`);
    }
  },

  info: (message: string, context?: LogContext): void => {
    console.info(`[INFO] ${formatMessage(message, context)}`);
  },

  warn: (message: string, context?: LogContext): void => {
    console.warn(`[WARN] ${formatMessage(message, context)}`);
  },

  error: (message: string, error?: Error, context?: LogContext): void => {
    const errorInfo = error ? { errorMessage: error.message, stack: error.stack } : {};
    console.error(`[ERROR] ${formatMessage(message, { ...context, ...errorInfo })}`);
  },
};

// Handle __DEV__ not being defined in web environments
declare const __DEV__: boolean | undefined;
