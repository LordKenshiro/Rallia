/**
 * Server-only exports for @rallia/shared-services
 *
 * This module exports server-side only code (like Stripe) that should not
 * be bundled into React Native mobile apps.
 *
 * Usage in Next.js API routes:
 *   import { getStripeClient, createConnectAccount } from '@rallia/shared-services/server';
 *
 * Usage in other server code:
 *   import { ... } from '@rallia/shared-services/server';
 */

// Re-export everything from the main index
export * from './index';

// Export Stripe server-only code
export * from './stripe';
