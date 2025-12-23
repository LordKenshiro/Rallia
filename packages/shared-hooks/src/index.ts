/**
 * Shared Hooks - Barrel Export
 *
 * Note: useTheme and useThemeStyles are React Native-only hooks.
 * They are exported from separate files to avoid bundling react-native in web builds.
 * - For React Native: import from './useTheme.native' and './useThemeStyles.native'
 * - For Web: use `next-themes` instead
 */

export * from './useAuth';
export * from './useDebounce';
export * from './useProfile'; // Also exports ProfileProvider and ProfileContextType
export * from './useSports';
export * from './usePlayerSports';
export * from './usePlayer';
export * from './useNotifications';
export * from './useCreateMatch';
export * from './useMatches';
export * from './useNearbyMatches';
export * from './useRatingScoresForSport';
export * from './useFacilitySearch';

// Platform-specific exports - Metro resolves .native.ts for React Native builds
// Web bundlers will use the stub .ts files which throw helpful errors at runtime
export * from './useTheme';
export * from './useThemeStyles';
