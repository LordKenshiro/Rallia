/**
 * Shared Services - Barrel Export
 */

export * from './supabase';
export * from './database';
// verification.ts is deprecated - use useAuth hook from @rallia/shared-hooks instead
// export * from './verification';
export * from './usta';
export * from './dupr';
export * from './logger';
export * from './notifications';
export * from './matches';
export * from './facilities';
export * from './availability';
export * from './players';
export * from './shared-contacts';
export * from './match-share';
export * from './groups';

// Export default DatabaseService
export { default } from './database';
export { default as DatabaseService } from './database';
