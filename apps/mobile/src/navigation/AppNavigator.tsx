/**
 * App Navigator - Main navigation structure
 *
 * Architecture:
 * - Root Stack: Contains Landing, Main (tabs), and all shared screens
 * - Bottom Tabs: Home, Courts, Actions (opens sheet), Community, Chat
 * - Each tab has a minimal stack with only tab-specific screens
 * - Shared screens (UserProfile, Settings, etc.) are in Root Stack for full-screen experience
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  ProfilePictureButton,
  NotificationButton,
  SettingsButton,
  SportSelector,
} from '@rallia/shared-components';
import { useUnreadNotificationCount } from '@rallia/shared-hooks';
import { useActionsSheet, useSport } from '../context';
import { useAuth } from '../hooks';
import { useTheme } from '../hooks/useTheme';
import { useAppNavigation } from './hooks';

// Screens
import Landing from '../screens/Landing';
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

// Assets
import RalliaLogo from '../../assets/images/light mode logo.svg';

// Types
import type {
  RootStackParamList,
  BottomTabParamList,
  HomeStackParamList,
  CourtsStackParamList,
  CommunityStackParamList,
  ChatStackParamList,
} from './types';

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
function NotificationButtonWithBadge() {
  const navigation = useAppNavigation();
  const { session } = useAuth();
  const { data: unreadCount } = useUnreadNotificationCount(session?.user?.id);

  return (
    <NotificationButton
      onPress={() => navigation.navigate('Notifications')}
      unreadCount={unreadCount ?? 0}
    />
  );
}

/**
 * Sport selector with context integration
 * Uses useSport hook to get/set selected sport and useTheme for dark mode
 */
function SportSelectorWithContext() {
  const { selectedSport, userSports, setSelectedSport } = useSport();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
 */
const sharedScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: '#C8F2EF' },
  headerTintColor: '#333',
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  headerTitleAlign: 'center' as const,
};

/**
 * Header options for main tab screens (Home, Courts, Community, Chat)
 */
const getMainScreenOptions = () => ({
  headerShown: true,
  headerStyle: { backgroundColor: '#C8F2EF' },
  headerTitleStyle: { fontSize: 18, fontWeight: '600' as const },
  headerLeft: () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ProfilePictureButton />
      <RalliaLogo width={100} height={30} />
    </View>
  ),
  headerTitle: () => <SportSelectorWithContext />,
  headerRight: () => (
    <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
      <NotificationButtonWithBadge />
      <SettingsButton />
    </View>
  ),
});

// =============================================================================
// TAB STACKS - Minimal, tab-specific screens only
// =============================================================================

/**
 * Home Stack - Match discovery and player's own matches
 */
function HomeStack() {
  return (
    <HomeStackNavigator.Navigator>
      <HomeStackNavigator.Screen
        name="HomeScreen"
        component={Home}
        options={getMainScreenOptions()}
      />
      {/* Future screens: PlayerMatches, PublicMatches */}
    </HomeStackNavigator.Navigator>
  );
}

/**
 * Courts Stack - Facility discovery
 * Note: Currently uses Map component as placeholder for FacilitiesDirectory
 */
function CourtsStack() {
  return (
    <CourtsStackNavigator.Navigator>
      <CourtsStackNavigator.Screen
        name="FacilitiesDirectory"
        component={Match} // Placeholder - will be FacilitiesDirectory
        options={getMainScreenOptions()}
      />
      {/* Future screens: FacilityDetail */}
    </CourtsStackNavigator.Navigator>
  );
}

/**
 * Community Stack - Social features
 */
function CommunityStack() {
  return (
    <CommunityStackNavigator.Navigator>
      <CommunityStackNavigator.Screen
        name="PlayerDirectory"
        component={Community}
        options={getMainScreenOptions()}
      />
      {/* Future screens: ShareLists, Groups, Communities, Tournaments, Leagues, etc. */}
    </CommunityStackNavigator.Navigator>
  );
}

/**
 * Chat Stack - Messaging
 */
function ChatStack() {
  return (
    <ChatStackNavigator.Navigator>
      <ChatStackNavigator.Screen
        name="Conversations"
        component={Chat}
        options={getMainScreenOptions()}
      />
      {/* Future screens: ChatScreen (individual conversation) */}
    </ChatStackNavigator.Navigator>
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
}: {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}) {
  const { openSheet } = useActionsSheet();

  return (
    <TouchableOpacity
      onPress={openSheet}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00B8A9',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
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
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
          tabBarButton: props => <CenterTabButton {...props} />,
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
 * Main App Navigator
 *
 * Structure:
 * - Landing: Initial screen
 * - Main: Bottom tabs with minimal stacks
 * - Shared screens: UserProfile, SportProfile, Settings, Notifications, Map, RatingProofs
 *   These are full-screen (tabs hidden) and accessible from anywhere
 */
export default function AppNavigator() {
  return (
    <RootStack.Navigator initialRouteName="Landing">
      {/* App entry points */}
      <RootStack.Screen name="Landing" component={Landing} options={{ headerShown: false }} />
      <RootStack.Screen name="Main" component={BottomTabs} options={{ headerShown: false }} />

      {/* Shared screens - full screen, tabs hidden */}
      <RootStack.Screen
        name="UserProfile"
        component={UserProfile}
        options={({ navigation }) => ({
          ...sharedScreenOptions,
          headerTitle: 'Profile',
          headerLeft: () => (
            <Ionicons
              name="chevron-back"
              size={28}
              color="#333"
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 8 }}
            />
          ),
        })}
      />

      <RootStack.Screen
        name="SportProfile"
        component={SportProfile}
        options={({ route, navigation }) => ({
          ...sharedScreenOptions,
          headerTitle: route.params?.sportName || 'Sport Profile',
          headerLeft: () => (
            <Ionicons
              name="chevron-back"
              size={28}
              color="#333"
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 8 }}
            />
          ),
        })}
      />

      <RootStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...sharedScreenOptions,
          headerTitle: 'Settings',
          headerLeft: () => (
            <Ionicons
              name="chevron-back"
              size={28}
              color="#333"
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 8 }}
            />
          ),
        })}
      />

      <RootStack.Screen
        name="Notifications"
        component={Notifications}
        options={({ navigation }) => ({
          ...sharedScreenOptions,
          headerTitle: 'Notifications',
          headerLeft: () => (
            <Ionicons
              name="chevron-back"
              size={28}
              color="#333"
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 8 }}
            />
          ),
        })}
      />

      <RootStack.Screen
        name="Map"
        component={Map}
        options={({ navigation }) => ({
          ...sharedScreenOptions,
          headerTitle: 'Map',
          presentation: 'fullScreenModal' as const,
          headerLeft: () => (
            <Ionicons
              name="close"
              size={28}
              color="#333"
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 8 }}
            />
          ),
        })}
      />

      <RootStack.Screen
        name="RatingProofs"
        component={RatingProofs}
        options={{ headerShown: false }}
      />
    </RootStack.Navigator>
  );
}
