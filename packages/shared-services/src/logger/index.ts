/**
 * Logger Service - Barrel Export
 *
 * Export the Logger singleton with transports configured
 */

// React Native global for dev mode detection
declare const __DEV__: boolean | undefined;

export {
  Logger,
  LoggerService,
  LogLevel,
  type LogEntry,
  type Transport,
  type LoggerConfig,
} from './Logger';
export { ConsoleTransport } from './ConsoleTransport';
export { SentryTransport } from './SentryTransport';

// Initialize default transports
import { Logger } from './Logger';
import { ConsoleTransport } from './ConsoleTransport';
import { SentryTransport } from './SentryTransport';

// Detect environment
const isDevelopment =
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
  (typeof __DEV__ !== 'undefined' && __DEV__);

// Add console transport (always enabled)
Logger.addTransport(new ConsoleTransport(isDevelopment));

// Add Sentry transport (production only, when configured)
if (!isDevelopment) {
  Logger.addTransport(new SentryTransport());
}

// Default export
export default Logger;
