/**
 * Sentry Transport
 *
 * Sends error logs to Sentry for production error tracking
 * Only logs ERROR level messages
 */

import { LogEntry, LogLevel, Transport } from './Logger';

export class SentryTransport implements Transport {
  private sentryEnabled: boolean;

  constructor() {
    this.sentryEnabled = false;
    // TODO: Initialize Sentry when ready
    // this.initializeSentry();
  }

  /**
   * Initialize Sentry (placeholder for future implementation)
   */
  private initializeSentry(): void {
    // TODO: Integrate with Sentry
    // Example Sentry initialization:
    //
    // import * as Sentry from '@sentry/react-native';
    // // or for web:
    // import * as Sentry from '@sentry/nextjs';
    //
    // Sentry.init({
    //   dsn: process.env.SENTRY_DSN,
    //   environment: process.env.NODE_ENV,
    //   enableAutoSessionTracking: true,
    //   tracesSampleRate: 1.0,
    // });
    //
    // this.sentryEnabled = true;
  }

  /**
   * Only log errors to Sentry
   */
  shouldLog(level: LogLevel): boolean {
    return level === LogLevel.ERROR;
  }

  /**
   * Send error to Sentry
   */
  log(entry: LogEntry): void {
    if (!this.sentryEnabled) {
      // Fallback to console in production if Sentry not configured
      if (process.env.NODE_ENV === 'production') {
        console.error('[Sentry Transport] Not configured:', entry.message, entry.error);
      }
      return;
    }

    try {
      // TODO: Send to Sentry
      // Example Sentry integration:
      //
      // if (entry.error) {
      //   Sentry.captureException(entry.error, {
      //     level: 'error',
      //     tags: {
      //       component: entry.context?.component as string,
      //     },
      //     extra: entry.context,
      //   });
      // } else {
      //   Sentry.captureMessage(entry.message, {
      //     level: 'error',
      //     extra: entry.context,
      //   });
      // }
    } catch (error) {
      console.error('Failed to send error to Sentry:', error);
    }
  }
}
