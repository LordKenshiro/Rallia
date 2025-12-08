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
import { useOverlay } from '../context';
import { useAuth } from '../hooks';
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
import RalliaLogo from '../../assets/images/light mode logo.svg';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Profile screens that can be accessed from any tab
// These are defined as reusable screen options
const profileScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: '#C8F2EF' },
  headerTintColor: '#333',
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  headerTitleAlign: 'center' as const,
};

// Common header options for main tab screens
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
  headerTitle: () => <SportSelector />,
  headerRight: () => (
    <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
      <NotificationButton />
      <SettingsButton />
    </View>
  ),
});

// Create stack navigators for each tab so they can all navigate to Profile screens
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeScreen" component={Home} options={getMainScreenOptions()} />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfile}
        options={({ navigation }) => ({
          ...profileScreenOptions,
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
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
              <NotificationButton />
              <SettingsButton />
            </View>
          ),
        })}
      />
      <Stack.Screen 
        name="SportProfile" 
        component={SportProfile}
        options={({ route }) => ({
          ...profileScreenOptions,
          headerTitle: (route.params as any)?.sportName || 'Sport Profile',
        })}
      />
      <Stack.Screen name="RatingProofs" component={RatingProofs} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...profileScreenOptions,
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
    </Stack.Navigator>
  );
}

function MapStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MapScreen" component={Map} options={getMainScreenOptions()} />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfile}
        options={({ navigation }) => ({
          ...profileScreenOptions,
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
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
              <NotificationButton />
              <SettingsButton />
            </View>
          ),
        })}
      />
      <Stack.Screen 
        name="SportProfile" 
        component={SportProfile}
        options={({ route }) => ({
          ...profileScreenOptions,
          headerTitle: (route.params as any)?.sportName || 'Sport Profile',
        })}
      />
      <Stack.Screen name="RatingProofs" component={RatingProofs} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...profileScreenOptions,
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
    </Stack.Navigator>
  );
}

function MatchStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MatchScreen" component={Match} options={getMainScreenOptions()} />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfile}
        options={({ navigation }) => ({
          ...profileScreenOptions,
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
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
              <NotificationButton />
              <SettingsButton />
            </View>
          ),
        })}
      />
      <Stack.Screen 
        name="SportProfile" 
        component={SportProfile}
        options={({ route }) => ({
          ...profileScreenOptions,
          headerTitle: (route.params as any)?.sportName || 'Sport Profile',
        })}
      />
      <Stack.Screen name="RatingProofs" component={RatingProofs} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...profileScreenOptions,
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
    </Stack.Navigator>
  );
}

function CommunityStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CommunityScreen" component={Community} options={getMainScreenOptions()} />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfile}
        options={({ navigation }) => ({
          ...profileScreenOptions,
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
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
              <NotificationButton />
              <SettingsButton />
            </View>
          ),
        })}
      />
      <Stack.Screen 
        name="SportProfile" 
        component={SportProfile}
        options={({ route }) => ({
          ...profileScreenOptions,
          headerTitle: (route.params as any)?.sportName || 'Sport Profile',
        })}
      />
      <Stack.Screen name="RatingProofs" component={RatingProofs} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...profileScreenOptions,
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
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ChatScreen" component={Chat} options={getMainScreenOptions()} />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfile}
        options={({ navigation }) => ({
          ...profileScreenOptions,
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
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
              <NotificationButton />
              <SettingsButton />
            </View>
          ),
        })}
      />
      <Stack.Screen 
        name="SportProfile" 
        component={SportProfile}
        options={({ route }) => ({
          ...profileScreenOptions,
          headerTitle: (route.params as any)?.sportName || 'Sport Profile',
        })}
      />
      <Stack.Screen name="RatingProofs" component={RatingProofs} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...profileScreenOptions,
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
    </Stack.Navigator>
  );
}

// Custom center tab button component that handles auth/onboarding state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CenterTabButton({ children, onPress }: { children: React.ReactNode; onPress?: (e: any) => void }) {
  const { session } = useAuth();
  const { startOnboarding, resumeOnboarding, needsOnboarding } = useOverlay();

  const handlePress = () => {
    // Not authenticated -> Start signup flow
    if (!session?.user) {
      startOnboarding();
      return;
    }

    // Authenticated but onboarding not complete -> Resume onboarding
    if (needsOnboarding) {
      resumeOnboarding();
      return;
    }

    // Fully onboarded -> Navigate to Match screen normally
    if (onPress) {
      onPress(null);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
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

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Headers are now in each Stack
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
        name="Map"
        component={MapStack}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="location" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Match"
        component={MatchStack}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
          tabBarButton: (props) => <CenterTabButton {...props} />,
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

export default function AppNavigator() {
  // Landing screen first, then bottom tabs
  // Each tab is a Stack Navigator that can navigate to Profile screens
  // This keeps bottom tabs visible on ALL screens including Profile/Settings/RatingProofs
  return (
    <Stack.Navigator initialRouteName="Landing">
      <Stack.Screen name="Landing" component={Landing} options={{ headerShown: false }} />
      <Stack.Screen name="Main" component={BottomTabs} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
