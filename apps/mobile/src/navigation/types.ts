/**
 * Navigation Types - Centralized type definitions for all navigation routes
 *
 * Architecture:
 * - RootStackParamList: Root-level navigator including shared screens
 * - BottomTabParamList: Bottom tab navigator
 * - [Tab]StackParamList: Individual tab stack navigators (minimal, tab-specific only)
 *
 * Shared screens (UserProfile, SportProfile, Settings, etc.) live in the Root Stack
 * and are accessible from any tab. This eliminates duplication and provides full-screen experience.
 */

import type { NavigatorScreenParams, CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  RatingProofsScreenParams,
  SportProfileScreenParams,
  FacilityDetailScreenParams,
} from '@rallia/shared-types';

// =============================================================================
// ROOT STACK PARAM LIST
// Includes all shared screens that are accessible from anywhere in the app
// =============================================================================

export type RootStackParamList = {
  // App entry point
  Main: NavigatorScreenParams<BottomTabParamList>;

  // Shared screens - full screen, hides tabs when navigated to
  UserProfile: { userId?: string }; // undefined = current user's profile
  SportProfile: SportProfileScreenParams;
  Settings: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  Map: { focusLocation?: { lat: number; lng: number } } | undefined;
  RatingProofs: RatingProofsScreenParams;
};

// =============================================================================
// BOTTOM TAB PARAM LIST
// =============================================================================

export type BottomTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Courts: NavigatorScreenParams<CourtsStackParamList>;
  Actions: undefined; // Doesn't navigate - opens bottom sheet
  Community: NavigatorScreenParams<CommunityStackParamList>;
  Chat: NavigatorScreenParams<ChatStackParamList>;
};

// =============================================================================
// TAB-SPECIFIC STACK PARAM LISTS
// Each tab only defines screens specific to that tab's flow
// =============================================================================

/**
 * Home Stack - Match discovery and player's own matches
 */
export type HomeStackParamList = {
  HomeScreen: undefined;
  PlayerMatches: undefined;
  PublicMatches: undefined;
};

/**
 * Courts Stack - Facility discovery and booking
 */
export type CourtsStackParamList = {
  FacilitiesDirectory: undefined;
  FacilityDetail: FacilityDetailScreenParams;
};

/**
 * Community Stack - Social features, groups, tournaments
 */
export type CommunityStackParamList = {
  PlayerDirectory: undefined;
  ShareLists: undefined;
  Groups: undefined;
  Communities: undefined;
  Tournaments: undefined;
  Leagues: undefined;
  CommunityDetail: { communityId: string };
  TournamentDetail: { tournamentId: string };
  LeagueDetail: { leagueId: string };
};

/**
 * Chat Stack - Messaging
 */
export type ChatStackParamList = {
  Conversations: undefined;
  ChatScreen: { conversationId: string; title?: string };
};

// =============================================================================
// COMPOSITE SCREEN PROPS
// For screens that need access to both their stack navigation and root navigation
// =============================================================================

/**
 * Props for screens in the Home Stack
 * Provides typed navigation that can navigate within HomeStack AND to Root screens
 */
export type HomeStackScreenProps<T extends keyof HomeStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

/**
 * Props for screens in the Courts Stack
 */
export type CourtsStackScreenProps<T extends keyof CourtsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<CourtsStackParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

/**
 * Props for screens in the Community Stack
 */
export type CommunityStackScreenProps<T extends keyof CommunityStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<CommunityStackParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

/**
 * Props for screens in the Chat Stack
 */
export type ChatStackScreenProps<T extends keyof ChatStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ChatStackParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

/**
 * Props for screens in the Root Stack (shared screens)
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

// =============================================================================
// GLOBAL TYPE DECLARATION
// Enables untyped useNavigation() calls to still resolve correctly
// This maintains backward compatibility with existing navigation calls
// =============================================================================

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
