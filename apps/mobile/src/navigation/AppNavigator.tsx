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
import { View, TouchableOpacity, StyleProp, ViewStyle, GestureResponderEvent } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { lightHaptic } from '@rallia/shared-utils';
import {
  ProfilePictureButton,
  NotificationButton,
  SettingsButton,
  SportSelector,
} from '@rallia/shared-components';
import { useUnreadNotificationCount, useProfile } from '@rallia/shared-hooks';
import { useActionsSheet, useSport } from '../context';
import { useAuth, useThemeStyles } from '../hooks';
import { useTheme } from '@rallia/shared-hooks';
import { useAppNavigation } from './hooks';
import { spacingPixels, fontSizePixels, fontWeightNumeric } from '@rallia/design-system';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Screens
import Home from '../screens/Home';
import Map from '../screens/Map';
import Match from '../screens/Match';
import Community from '../screens/Community';
import Chat from '../screens/Chat';
import SettingsScreen from '../screens/SettingsScreen';
import UserProfile from '../screens/UserProfile';
import SportProfile from '../screens/SportProfile';
import RatingProofs from '../screens/RatingProofs';
import Notifications from '../screens/Notifications';

// Components
import { ThemeLogo } from '../components/ThemeLogo';

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
 * Only displays when onboarding is completed
 */
function SportSelectorWithContext() {
  const { selectedSport, userSports, setSelectedSport } = useSport();
  const { theme } = useTheme();
  const { session } = useAuth();
  const { contentMode } = useActionsSheet();
  const { profile, refetch } = useProfile();
  const isDark = theme === 'dark';

  // Refetch profile when screen comes into focus
  // This ensures the sport selector appears when onboarding completes
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Refetch profile when auth state changes (e.g., user first authenticates)
  useEffect(() => {
    if (session?.user) {
      refetch();
    }
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

  // Only show sport selector if onboarding is completed
  if (!profile?.onboarding_completed) {
    return null;
  }

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
 * Profile picture button with auth-aware behavior
 * - If authenticated: navigates to UserProfile
 * - If not authenticated: opens auth sheet
 */
function ProfilePictureButtonWithAuth() {
  const navigation = useAppNavigation();
  const { session } = useAuth();
  const { openSheet } = useActionsSheet();

  const handlePress = () => {
    if (session?.user) {
      // Authenticated: navigate to profile
      navigation.navigate('UserProfile', {});
    } else {
      // Not authenticated: open auth sheet
      openSheet();
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
  const sharedOptions = getSharedScreenOptions(colors);

  return ({
    navigation,
  }: {
    navigation: NativeStackNavigationProp<HomeStackParamList, 'PublicMatches'>;
  }) => ({
    ...sharedOptions,
    headerTitle: 'Public Matches',
    headerLeft: () => <ThemedBackButton navigation={navigation} />,
    headerRight: () => <MapIconButton />,
  });
}

/**
 * Header options for PlayerMatches screen
 */
function usePlayerMatchesScreenOptions() {
  const { colors } = useThemeStyles();
  const sharedOptions = getSharedScreenOptions(colors);

  return ({
    navigation,
  }: {
    navigation: NativeStackNavigationProp<HomeStackParamList, 'PlayerMatches'>;
  }) => ({
    ...sharedOptions,
    headerTitle: 'My Matches',
    headerLeft: () => <ThemedBackButton navigation={navigation} />,
  });
}

/**
 * Home Stack - Match discovery and player's own matches
 */
function HomeStack() {
  const mainScreenOptions = useMainScreenOptions();
  const publicMatchesOptions = usePublicMatchesScreenOptions();
  const playerMatchesOptions = usePlayerMatchesScreenOptions();
  return (
    <HomeStackNavigator.Navigator id="HomeStack">
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
 * Courts Stack - Facility discovery
 * Note: Currently uses Map component as placeholder for FacilitiesDirectory
 */
function CourtsStack() {
  const mainScreenOptions = useMainScreenOptions();
  return (
    <CourtsStackNavigator.Navigator id="CourtsStack">
      <CourtsStackNavigator.Screen
        name="FacilitiesDirectory"
        component={Match} // Placeholder - will be FacilitiesDirectory
        options={mainScreenOptions}
      />
      {/* Future screens: FacilityDetail */}
    </CourtsStackNavigator.Navigator>
  );
}

/**
 * Community Stack - Social features
 */
function CommunityStack() {
  const mainScreenOptions = useMainScreenOptions();
  return (
    <CommunityStackNavigator.Navigator id="CommunityStack">
      <CommunityStackNavigator.Screen
        name="PlayerDirectory"
        component={Community}
        options={mainScreenOptions}
      />
      {/* Future screens: ShareLists, Groups, Communities, Tournaments, Leagues, etc. */}
    </CommunityStackNavigator.Navigator>
  );
}

/**
 * Chat Stack - Messaging
 */
function ChatStack() {
  const mainScreenOptions = useMainScreenOptions();
  return (
    <ChatStackNavigator.Navigator id="ChatStack">
      <ChatStackNavigator.Screen
        name="Conversations"
        component={Chat}
        options={mainScreenOptions}
      />
      {/* Future screens: ChatScreen (individual conversation) */}
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

// =============================================================================
// BOTTOM TABS
// =============================================================================

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
          tabBarIcon: ({ color, size }) => <Ionicons name="tennisball" size={size} color={color} />,
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
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
    <Ionicons
      name={icon as keyof typeof Ionicons.glyphMap}
      size={28}
      color={colors.headerForeground}
      onPress={() => navigation.goBack()}
      style={{ marginLeft: spacingPixels[2] }}
    />
  );
}

/**
 * Main App Navigator
 *
 * Structure:
 * - Main: Bottom tabs with minimal stacks
 * - Shared screens: UserProfile, SportProfile, Settings, Notifications, Map, RatingProofs
 *   These are full-screen (tabs hidden) and accessible from anywhere
 */
export default function AppNavigator() {
  const { colors } = useThemeStyles();
  const sharedOptions = getSharedScreenOptions(colors);

  return (
    <RootStack.Navigator id="RootStack" initialRouteName="Main">
      {/* Main app entry */}
      <RootStack.Screen name="Main" component={BottomTabs} options={{ headerShown: false }} />

      {/* Shared screens - full screen, tabs hidden */}
      <RootStack.Screen
        name="UserProfile"
        component={UserProfile}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: 'Profile',
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="SportProfile"
        component={SportProfile}
        options={({ route, navigation }) => ({
          ...sharedOptions,
          headerTitle: route.params?.sportName || 'Sport Profile',
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: 'Settings',
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />

      <RootStack.Screen
        name="Notifications"
        component={Notifications}
        options={({ navigation }) => ({
          ...sharedOptions,
          headerTitle: 'Notifications',
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
          headerTitle: 'Rating Proofs',
          headerLeft: () => <ThemedBackButton navigation={navigation} />,
        })}
      />
    </RootStack.Navigator>
  );
}
