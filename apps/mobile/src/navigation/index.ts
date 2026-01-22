/**
 * Navigation - Barrel exports
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList, HomeStackParamList } from './types';

// Navigation ref for use outside NavigationContainer (e.g., ActionsBottomSheet)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen from outside the NavigationContainer.
 * This is useful for components like ActionsBottomSheet that render outside the navigation tree.
 */
export function navigateFromOutside<T extends keyof HomeStackParamList>(
  screen: T,
  params?: HomeStackParamList[T]
) {
  if (navigationRef.isReady()) {
    // Navigate to the Home tab first, then to the nested screen
    navigationRef.navigate('Main', {
      screen: 'Home',
      params: {
        screen,
        params,
      },
    });
  }
}

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
