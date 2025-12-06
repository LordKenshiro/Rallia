/**
 * Type Definitions - Barrel Export
 * 
 * Export order matters: database.ts types take precedence over legacy types
 * See TYPE_MIGRATION_GUIDE.md for type conflict resolution details
 */

// Export database types first (canonical source of truth)
export * from './database';

// Export UI-specific match types (non-conflicting)
export type { Match, AccessType } from './match';

// Export deprecated types for backwards compatibility (will be removed in v2.0)
export type { LegacyMatchStatus, LegacyMatchType } from './match';

// Export player types and preferences
export * from './player';
