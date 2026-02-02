/**
 * App Navigator - Main navigation structure
 *
 * Architecture:
 * - Root Stack: Contains Main (tabs) and all shared screens
 * - Bottom Tabs: Home, Courts, Actions (opens sheet), Community, Chat
 * - Each tab has a minimal stack with only tab-specific screens
 * - Shared screens (UserProfile, Settings, etc.) are in Root Stack for full-screen experience
 *
 * Note: Splash animation is handled by SplashOverlay component in App.tsx
 */

import React, { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  Text as RNText,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { lightHaptic } from '@rallia/shared-utils';
import {
  ProfilePictureButton,
  NotificationButton,
  SettingsButton,
  SportSelector,
} from '@rallia/shared-components';
import { useActionsSheet, useSport, useOverlay } from '../context';
import { useUnreadNotificationCount, useProfile, useTotalUnreadCount } from '@rallia/shared-hooks';
import { useAuth, useThemeStyles, useTranslation, useRequireOnboarding } from '../hooks';
import { useTheme } from '@rallia/shared-hooks';
import { useAppNavigation } from './hooks';
import { spacingPixels, fontSizePixels, fontWeightNumeric } from '@rallia/design-system';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Screens
import Home from '../screens/Home';
import Map from '../screens/Map';
import Community from '../screens/Community';
import Chat from '../screens/Chat';
import ChatConversation from '../screens/ChatConversation';
import ArchivedChats from '../screens/ArchivedChats';
import SettingsScreen from '../screens/SettingsScreen';
import UserProfile from '../screens/UserProfile';
import SportProfile from '../screens/SportProfile';
import RatingProofs from '../screens/RatingProofs';
import IncomingReferenceRequests from '../screens/IncomingReferenceRequests';
import Notifications from '../screens/Notifications';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';
import PermissionsScreen from '../screens/PermissionsScreen';
import PlayerProfile from '../screens/PlayerProfile';
import SharedLists from '../screens/SharedLists';
import SharedListDetail from '../screens/SharedListDetail';
import Groups from '../screens/Groups';
import GroupDetail from '../screens/GroupDetail';
import PreOnboardingScreen from '../screens/PreOnboarding';
import GroupChatInfo from '../screens/GroupChatInfo';
import PlayedMatchDetail from '../screens/PlayedMatchDetail';
import Communities from '../screens/Communities';
import CommunityDetail from '../screens/CommunityDetail';

// Components
import { ThemeLogo } from '../components/ThemeLogo';
import { MatchDetailSheet } from '../components/MatchDetailSheet';

// Types
import type {
  RootStackParamList,
  BottomTabParamList,
  HomeStackParamList,
  CourtsStackParamList,
  CommunityStackParamList,
  ChatStackParamList,
} from './types';
import PublicMatches from '../features/matches/screens/PublicMatches';
import PlayerMatches from '../features/matches/screens/PlayerMatches';
import { FacilitiesDirectory, FacilityDetail } from '../features/facilities';

// =============================================================================
// TYPED NAVIGATORS
// =============================================================================

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();
const HomeStackNavigator = createNativeStackNavigator<HomeStackParamList>();
const CourtsStackNavigator = createNativeStackNavigator<CourtsStackParamList>();
const CommunityStackNavigator = createNativeStackNavigator<CommunityStackParamList>();
const ChatStackNavigator = createNativeStackNavigator<ChatStackParamList>();

// =============================================================================
// SHARED HEADER COMPONENTS
// =============================================================================

/**
 * Notification button with badge showing unread count
 */
function NotificationButtonWithBadge({ color }: { color?: string }) {
  const navigation = useAppNavigation();
  const { session } = useAuth();
  const { data: unreadCount } = useUnreadNotificationCount(session?.user?.id);
  const { colors } = useThemeStyles();

  return (
    <NotificationButton
      onPress={() => navigation.navigate('Notifications')}
      unreadCount={unreadCount ?? 0}
      color={color ?? colors.headerForeground}
      badgeColor={colors.error}
      badgeTextColor={colors.primaryForeground}
    />
  );
}

/**
 * Sport selector with context integration
 * Uses useSport hook to get/set selected sport and useTheme for dark mode
 * Shows for:
 * - Signed-out users (guests) browsing public matches
 * - Signed-in users who have completed onboarding
 */
function SportSelectorWithContext() {
  const { selectedSport, userSports, setSelectedSport } = useSport();
  const { theme } = useTheme();
  const { session } = useAuth();
  const { contentMode } = useActionsSheet();
  const { refetch } = useProfile();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  // Determine if user is a guest (not signed in)
  // const isGuest = !session?.user;

  // Refetch profile when auth state changes (e.g., user first authenticates)
  useEffect(() => {
    if (session?.user) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, refetch]);

  // Refetch profile when actions sheet mode changes from 'onboarding' to 'actions'
  // This indicates onboarding was completed and the profile needs to be refreshed
  const prevContentModeRef = React.useRef<typeof contentMode>(contentMode);
  useEffect(() => {
    if (prevContentModeRef.current === 'onboarding' && contentMode === 'actions' && session?.user) {
      // Onboarding was just completed, refetch profile to get updated onboarding_completed status
      refetch();
    }
    prevContentModeRef.current = contentMode;
  }, [contentMode, session?.user, refetch]);

  // For signed-in users, only show if onboarding is completed
  // For guests, always allow (they browse all public matches)
  // if (!isGuest && !profile?.onboarding_completed) {
  //   return null;
  // }

  // Don't show sport selector if user has only one or no sports
  if (!userSports || userSports.length <= 1) {
    return null;
  }

  return (
    <SportSelector
      selectedSport={selectedSport}
      userSports={userSports}
      onSelectSport={setSelectedSport}
      isDark={isDark}
      confirmBeforeSwitch
      t={t as (key: string) => string}
    />
  );
}

// =============================================================================
// SCREEN OPTIONS
// =============================================================================

/**
 * Common header style for shared screens (UserProfile, Settings, etc.)
 * Note: Colors are applied dynamically via inline styles in screen options
 */
const getSharedScreenOptions = (colors: ReturnType<typeof useThemeStyles>['colors']) => ({
  headerShown: true,
  headerStyle: { backgroundColor: colors.headerBackground },
  headerTintColor: colors.headerForeground,
  headerTitleStyle: {
    fontSize: fontSizePixels.lg,
    fontWeight: String(fontWeightNumeric.semibold) as '600',
    color: colors.headerForeground,
  },
  headerTitleAlign: 'center' as const,
});

/**
 * Profile picture button with auth and onboarding-aware behavior
 * - If authenticated and onboarded: navigates to UserProfile
 * - If not authenticated or not onboarded: opens auth/onboarding sheet
 */
function ProfilePictureButtonWithAuth() {
  const navigation = useAppNavigation();
  const { isReady, guardAction } = useRequireOnboarding();

  const handlePress = () => {
    if (isReady) {
      // Authenticated and onboarded: navigate to profile
      navigation.navigate('UserProfile', {});
    } else {
      // Not authenticated or not onboarded: open auth/onboarding sheet
      guardAction();
    }
  };

  const { isDark } = useThemeStyles();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ProfilePictureButton onPress={handlePress} isDark={isDark} />
      <ThemeLogo width={100} height={30} />
    </View>
  );
}

/**
 * Header right component with notification and settings buttons
 */
function HeaderRightButtons() {
  const { colors } = useThemeStyles();
  return (
    <View style={{ flexDirection: 'row', gap: spacingPixels[2], marginRight: spacingPixels[2] }}>
      <NotificationButtonWithBadge color={colors.headerForeground} />
      <SettingsButton color={colors.headerForeground} />
    </View>
  );
}

/**
 * Header options for main tab screens (Home, Courts, Community, Chat)
 */
function useMainScreenOptions() {
  const { colors } = useThemeStyles();
  return {
    headerShown: true,
    headerStyle: {
      backgroundColor: colors.headerBackground,
    },
    headerTitleStyle: {
      fontSize: fontSizePixels.lg,
      fontWeight: String(fontWeightNumeric.semibold) as '600',
      color: colors.headerForeground,
    },
    headerLeft: () => <ProfilePictureButtonWithAuth />,
    headerTitle: () => <SportSelectorWithContext />,
    headerRight: () => <HeaderRightButtons />,
  };
}

// =============================================================================
// TAB STACKS - Minimal, tab-specific screens only
// =============================================================================

/**
 * Map icon button for header right
 */
function MapIconButton() {
  const navigation = useAppNavigation();
  const { colors } = useThemeStyles();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Map')}
      style={{ marginRight: spacingPixels[2] }}
      activeOpacity={0.7}
    >
      <Ionicons name="map" size={24} color={colors.headerForeground} />
    </TouchableOpacity>
  );
}

/**
 * Header options for PublicMatches screen
 */
function usePublicMatchesScreenOptions() {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const sharedOptions = getSharedScreenOptions(colors);

  return ({
    navigation,
  }: {
    navigation: NativeStackNavigationProp<HomeStackParamList, 'PublicMatches'>;
  }) => ({
    ...sharedOptions,
    headerTitle: t('screens.publicMatches'),
    headerLeft: () => <ThemedBackButton navigation={navigation} />,
    headerRight: () => <MapIconButton />,
  });
}

/**
 * Header options for PlayerMatches screen
 */
function usePlayerMatchesScreenOptions() {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const sharedOptions = getSharedScreenOptions(colors);

  return ({
    navigation,
  }: {
    navigation: NativeStackNavigationProp<HomeStackParamList, 'PlayerMatches'>;
  }) => ({
    ...sharedOptions,
    headerTitle: t('screens.playerMatches'),
    headerLeft: () => <ThemedBackButton navigation={navigation} />,
  });
}

// Shared screen options for fast animations across all stacks
const fastAnimationOptions = {
  animation: 'slide_from_right' as const,
  animationDuration: 200,
  gestureEnabled: true,
};

/**
 * Home Stack - Match discovery and player's own matches
 */
function HomeStack() {
  const mainScreenOptions = useMainScreenOptions();
  const publicMatchesOptions = usePublicMatchesScreenOptions();
  const playerMatchesOptions = usePlayerMatchesScreenOptions();
  return (
    <HomeStackNavigator.Navigator id="HomeStack" screenOptions={fastAnimationOptions}>
      <HomeStackNavigator.Screen name="HomeScreen" component={Home} options={mainScreenOptions} />
      <HomeStackNavigator.Screen
        name="PublicMatches"
        component={PublicMatches}
        options={publicMatchesOptions}
      />
      <HomeStackNavigator.Screen
        name="PlayerMatches"
        component={PlayerMatches}
        options={playerMatchesOptions}
      />
    </HomeStackNavigator.Navigator>
  );
}

/**
 * Courts Stack - Facility discovery and booking
 */
function CourtsStack() {
  const mainScreenOptions = useMainScreenOptions();
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const sharedOptions = getSharedScreenOptions(colors);

  return (
    <CourtsStackNavigator.Navigator id="CourtsStack" screenOptions={fastAnimationOptions}>
      <CourtsStackNavigator.Screen
        name="FacilitiesDirectory"
        component={FacilitiesDirectory}
        options={mainScreenOptions}
      />
      <CourtsStackNavigator.Screen
        name="FacilityDetail"
        component={FacilityDetail}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('facilitiesTab.title'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />
    </CourtsStackNavigator.Navigator>
  );
}

/**
 * Community Stack - Social features
 */
function CommunityStack() {
  const mainScreenOptions = useMainScreenOptions();
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const sharedOptions = getSharedScreenOptions(colors);

  return (
    <CommunityStackNavigator.Navigator id="CommunityStack" screenOptions={fastAnimationOptions}>
      <CommunityStackNavigator.Screen
        name="PlayerDirectory"
        component={Community}
        options={mainScreenOptions}
      />
      <CommunityStackNavigator.Screen
        name="ShareLists"
        component={SharedLists}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('community.shareLists') || 'Shared Lists',
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />
      <CommunityStackNavigator.Screen
        name="SharedListDetail"
        component={SharedListDetail}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('sharedLists.title') || 'List',
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />
      <CommunityStackNavigator.Screen
        name="Groups"
        component={Groups}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('community.groups') || 'Groups',
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />
      <CommunityStackNavigator.Screen
        name="Communities"
        component={Communities}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('community.communities') || 'Communities',
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />
    </CommunityStackNavigator.Navigator>
  );
}

/**
 * Chat Stack - Messaging
 */
function ChatStack() {
  const mainScreenOptions = useMainScreenOptions();
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const sharedOptions = getSharedScreenOptions(colors);
  return (
    <ChatStackNavigator.Navigator id="ChatStack" screenOptions={fastAnimationOptions}>
      <ChatStackNavigator.Screen
        name="Conversations"
        component={Chat}
        options={mainScreenOptions}
      />
      <ChatStackNavigator.Screen
        name="ArchivedChats"
        component={ArchivedChats}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('chat.archivedChats.title'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />
    </ChatStackNavigator.Navigator>
  );
}

// =============================================================================
// TAB BUTTON WITH HAPTICS
// =============================================================================

/**
 * Wrapper component for tab bar buttons that adds haptic feedback
 */
function TabButtonWithHaptic(props: {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  [key: string]: unknown;
}) {
  const { children, onPress, ...otherProps } = props;

  const handlePress = (e: GestureResponderEvent) => {
    lightHaptic();
    if (onPress) {
      onPress(e);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} {...otherProps}>
      {children}
    </TouchableOpacity>
  );
}

// =============================================================================
// CENTER TAB BUTTON - Opens Actions Bottom Sheet
// =============================================================================

/**
 * Custom center tab button that opens the Actions bottom sheet
 * instead of navigating to a screen
 */
function CenterTabButton({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  // These are passed by React Navigation but we intentionally ignore them
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: ((e: GestureResponderEvent) => void) | null;
  accessibilityRole?: string;
  accessibilityState?: { selected?: boolean };
  testID?: string;
}) {
  const { openSheet } = useActionsSheet();

  return (
    <TouchableOpacity
      onPress={() => {
        lightHaptic();
        openSheet();
      }}
      style={[
        {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

/**
 * Dummy component for Actions tab - never rendered since we intercept the tap
 */
function ActionsPlaceholder() {
  return null;
}

/**
 * Main screen wrapper: tabs + MatchDetailSheet.
 * MatchDetailSheet is rendered inside the navigation tree so it can use useNavigation()
 * for Chat and PlayerProfile without ref-based helpers.
 */
function MainWithSheets() {
  return (
    <>
      <BottomTabs />
      <MatchDetailSheet />
    </>
  );
}

// =============================================================================
// BOTTOM TABS
// =============================================================================

/**
 * Chat tab icon with unread message badge
 */
function ChatTabIcon({ color, size }: { color: string; size: number }) {
  const { session } = useAuth();
  const { data: unreadCount } = useTotalUnreadCount(session?.user?.id);
  const { colors } = useThemeStyles();

  const count = unreadCount ?? 0;
  const showBadge = count > 0;
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View
      style={{ width: size + 12, height: size + 8, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name="chatbubbles" size={size} color={color} />
      {showBadge && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            backgroundColor: colors.error,
            borderRadius: 10,
            minWidth: count > 99 ? 24 : count > 9 ? 20 : 16,
            height: 16,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <RNText
            style={{
              color: '#FFFFFF',
              fontSize: count > 99 ? 8 : count > 9 ? 9 : 10,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {displayCount}
          </RNText>
        </View>
      )}
    </View>
  );
}

function BottomTabs() {
  const { colors } = useThemeStyles();
  return (
    <Tab.Navigator
      id="BottomTabs"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: spacingPixels[20],
          paddingBottom: spacingPixels[2],
          paddingTop: spacingPixels[2],
        },
        tabBarButton: props => <TabButtonWithHaptic {...props} />,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Courts"
        component={CourtsStack}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Actions"
        component={ActionsPlaceholder}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size * 1.2} color={color} />
          ),
          tabBarButton: props => <CenterTabButton {...props} />,
        }}
        listeners={{
          tabPress: e => {
            // Prevent default navigation to the Actions tab
            e.preventDefault();
            // The actual sheet opening is handled by CenterTabButton
          },
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityStack}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          tabBarIcon: ({ color, size }) => <ChatTabIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

// =============================================================================
// ROOT NAVIGATOR
// =============================================================================

/**
 * Back button component with theme-aware colors
 * Uses TouchableOpacity for proper touch handling and immediate response
 */
function ThemedBackButton({
  navigation,
  icon = 'chevron-back',
}: {
  navigation: { goBack: () => void };
  icon?: string;
}) {
  const { colors } = useThemeStyles();
  return (
    <TouchableOpacity
      onPress={() => {
        lightHaptic();
        navigation.goBack();
      }}
      activeOpacity={0.6}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ marginLeft: spacingPixels[2], padding: spacingPixels[1] }}
    >
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={28}
        color={colors.headerForeground}
      />
    </TouchableOpacity>
  );
}

/**
 * Main App Navigator
 *
 * Structure:
 * - PreOnboarding: First-time wizard (sports, postal code, location permission) for new users
 * - Main: Bottom tabs with minimal stacks (shown after pre-onboarding complete)
 * - Shared screens: UserProfile, SportProfile, Settings, Notifications, Map, RatingProofs
 *   These are full-screen (tabs hidden) and accessible from anywhere
 */
export default function AppNavigator() {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const { isSportSelectionComplete } = useOverlay();
  const sharedOptions = getSharedScreenOptions(colors);

  return (
    <RootStack.Navigator
      id="RootStack"
      initialRouteName={isSportSelectionComplete ? 'Main' : 'PreOnboarding'}
      screenOptions={fastAnimationOptions}
    >
      {/* First-time pre-onboarding wizard - shown before Main for new users */}
      {!isSportSelectionComplete && (
        <RootStack.Screen
          name="PreOnboarding"
          component={PreOnboardingScreen}
          options={{ headerShown: false, animation: 'fade' }}
        />
      )}

      {/* Main app entry - only rendered after sport selection is complete */}
      <RootStack.Screen name="Main" component={MainWithSheets} options={{ headerShown: false }} />

      {/* Shared screens - full screen, tabs hidden */}
      <RootStack.Screen
        name="UserProfile"
        component={UserProfile}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('screens.profile'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="PlayerProfile"
        component={PlayerProfile}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('screens.playerProfile'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="SportProfile"
        component={SportProfile}
        options={({ route, navigation }) => ({
          ...sharedOptions,
          headerTitle: route.params?.sportName || t('screens.sportProfile'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('screens.settings'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="Notifications"
        component={Notifications}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('screens.notifications'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('screens.notificationPreferences'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="Permissions"
        component={PermissionsScreen}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('screens.permissions'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="Map"
        component={Map}
        options={{
          headerShown: false,
          presentation: 'fullScreenModal' as const,
        }}
      />

      <RootStack.Screen
        name="RatingProofs"
        component={RatingProofs}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('screens.ratingProofs'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="IncomingReferenceRequests"
        component={IncomingReferenceRequests}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: t('referenceRequest.screenTitle'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="GroupDetail"
        component={GroupDetail}
        options={({ route, navigation }) => ({
          ...sharedOptions,
          headerTitle: route.params?.groupName || t('screens.group'),
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="CommunityDetail"
        component={CommunityDetail}
        options={({ route, navigation }) => ({
          ...sharedOptions,
          headerTitle: route.params?.communityName || 'Community',
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="GroupChatInfo"
        component={GroupChatInfo}
        options={{
          headerShown: false,
        }}
      />

      <RootStack.Screen
        name="PlayedMatchDetail"
        component={PlayedMatchDetail}
        options={{
          headerShown: false,
        }}
      />

      <RootStack.Screen
        name="ChatConversation"
        component={ChatConversation}
        options={{
          headerShown: false,
        }}
      />
    </RootStack.Navigator>
  );
}
