/**
 * Logging Service (Shared)
 *
 * Centralized logging service for the entire Rallia monorepo
 * Supports both mobile and web platforms with pluggable transports
 *
 * Features:
 * - Environment-aware logging (dev vs production)
 * - Multiple log levels (debug, info, warn, error)
 * - Pluggable transports (Console, Sentry, Analytics)
 * - Structured logging with context
 * - Performance tracking
 * - Platform-agnostic
 *
 * @example
 * ```typescript
 * import { Logger } from '@rallia/shared-services/logger';
 *
 * Logger.info('User signed in', { userId: '123' });
 * Logger.error('Failed to load profile', error, { userId: '123' });
 * Logger.warn('Slow network detected', { latency: 5000 });
 * ```
 */

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Log entry structure
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

// Transport interface for pluggable logging destinations
export interface Transport {
  log(entry: LogEntry): void;
  shouldLog?(level: LogLevel): boolean;
}

// Logger configuration
export interface LoggerConfig {
  minLevel: LogLevel;
  includeTimestamp: boolean;
  includeContext: boolean;
  isDevelopment?: boolean;
}

/**
 * Logger class for centralized logging
 */
class LoggerService {
  private config: LoggerConfig;
  private transports: Transport[] = [];
  private isDevelopment: boolean;

  constructor() {
    // Detect development mode (works for both React Native and Next.js)
    this.isDevelopment =
      (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
      (typeof __DEV__ !== 'undefined' && __DEV__);

    this.config = {
      minLevel: this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
      includeTimestamp: true,
      includeContext: true,
      isDevelopment: this.isDevelopment,
    };
  }

  /**
   * Configure logger settings
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add a transport (logging destination)
   */
  addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  /**
   * Remove all transports
   */
  clearTransports(): void {
    this.transports = [];
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minLevelIndex = levels.indexOf(this.config.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    return currentLevelIndex >= minLevelIndex;
  }

  /**
   * Core logging method
   */
  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Send to all transports
    this.transports.forEach((transport) => {
      try {
        // Check if transport has its own shouldLog method
        if (transport.shouldLog && !transport.shouldLog(entry.level)) {
          return;
        }
        transport.log(entry);
      } catch (error) {
        // Fallback to console if transport fails
        console.error('Transport failed:', error);
      }
    });
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date(),
      context,
    });
  }

  /**
   * Info level logging
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: LogLevel.INFO,
      message,
      timestamp: new Date(),
      context,
    });
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: LogLevel.WARN,
      message,
      timestamp: new Date(),
      context,
    });
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log({
      level: LogLevel.ERROR,
      message,
      timestamp: new Date(),
      error,
      context,
    });
  }

  /**
   * Log API request
   */
  logApiRequest(method: string, url: string, duration?: number): void {
    this.debug(`API ${method} ${url}`, {
      method,
      url,
      duration,
      type: 'api_request',
    });
  }

  /**
   * Log API error
   */
  logApiError(method: string, url: string, error: Error, statusCode?: number): void {
    this.error(`API ${method} ${url} failed`, error, {
      method,
      url,
      statusCode,
      type: 'api_error',
    });
  }

  /**
   * Log user action
   */
  logUserAction(action: string, details?: Record<string, unknown>): void {
    this.info(`User action: ${action}`, {
      ...details,
      type: 'user_action',
    });
  }

  /**
   * Log navigation event
   */
  logNavigation(screen: string, params?: Record<string, unknown>): void {
    this.debug(`Navigation to ${screen}`, {
      screen,
      params,
      type: 'navigation',
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    this.log({
      level,
      message: `Performance: ${operation} took ${duration}ms`,
      timestamp: new Date(),
      context: {
        operation,
        duration,
        ...metadata,
        type: 'performance',
      },
    });
  }

  /**
   * Create a performance timer
   */
  startTimer(operation: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.logPerformance(operation, duration);
    };
  }
}

// Export singleton instance
export const Logger = new LoggerService();

// Export class for testing
export { LoggerService };

// Default export
export default Logger;
