/**
 * Navigation - Barrel exports
 */

// Main navigator
export { default as AppNavigator } from './AppNavigator';

// Typed hooks
export {
  useAppNavigation,
  useRootRoute,
  useHomeRoute,
  useCourtsRoute,
  useCommunityRoute,
  useChatRoute,
  useHomeNavigation,
  useCourtsNavigation,
  useCommunityNavigation,
  useChatNavigation,
} from './hooks';

// Types
export type {
  RootStackParamList,
  BottomTabParamList,
  HomeStackParamList,
  CourtsStackParamList,
  CommunityStackParamList,
  ChatStackParamList,
  HomeStackScreenProps,
  CourtsStackScreenProps,
  CommunityStackScreenProps,
  ChatStackScreenProps,
  RootStackScreenProps,
} from './types';
