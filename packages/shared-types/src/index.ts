/**
 * Shared Types - Barrel Export
 *
 * Type Architecture:
 * - supabase.ts: Auto-generated types from Supabase (DO NOT EDIT)
 * - database.ts: Derived types from supabase.ts (row types, enums, composites)
 * - ui-types.ts: UI view models and navigation params (non-database types)
 * - constants.ts: Display labels and domain constants
 */

// Database types (derived from Supabase generated types)
export * from './database';

// UI-specific types (view models, navigation params)
export * from './ui-types';

// Domain constants (display labels, mappings)
export * from './constants';

// Re-export Database type and Supabase helper types for client typing
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './supabase';
