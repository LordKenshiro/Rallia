/**
 * Console Transport
 *
 * Logs messages to the browser/Node.js console
 * Includes color-coding and emojis in development mode
 */

import { LogEntry, LogLevel, Transport } from './Logger';

export class ConsoleTransport implements Transport {
  private isDevelopment: boolean;

  constructor(isDevelopment: boolean = process.env.NODE_ENV === 'development') {
    this.isDevelopment = isDevelopment;
  }

  /**
   * Get emoji for log level (for better visibility in dev)
   */
  private getLogEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '🚨';
      default:
        return '📝';
    }
  }

  /**
   * Get console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Format log message
   */
  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    parts.push(`[${entry.timestamp.toISOString()}]`);

    // Level
    parts.push(`[${entry.level.toUpperCase()}]`);

    // Message
    parts.push(entry.message);

    return parts.join(' ');
  }

  /**
   * Log entry to console
   */
  log(entry: LogEntry): void {
    const consoleMethod = this.getConsoleMethod(entry.level);
    const emoji = this.isDevelopment ? this.getLogEmoji(entry.level) : '';
    const message = `${emoji} ${this.formatMessage(entry)}`;

    consoleMethod(message);

    // Log context if available
    if (entry.context) {
      console.log('Context:', entry.context);
    }

    // Log error stack if available
    if (entry.error) {
      console.error('Error:', entry.error);
      if (entry.error.stack) {
        console.error('Stack:', entry.error.stack);
      }
    }
  }
}
