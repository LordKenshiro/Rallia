import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  ProfilePictureButton,
  NotificationButton,
  SettingsButton,
  SportSelector,
} from '@rallia/shared-components';
import Landing from '../screens/Landing';
import Home from '../screens/Home';
import Map from '../screens/Map';
import Match from '../screens/Match';
import Community from '../screens/Community';
import Chat from '../screens/Chat';
import SettingsScreen from '../screens/SettingsScreen';
import UserProfile from '../screens/UserProfile';
import SportProfile from '../screens/SportProfile';
import RalliaLogo from '../../assets/images/light mode logo.svg';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Profile Stack Navigator - includes UserProfile, SportProfile, and Settings
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#C8F2EF' },
        headerTintColor: '#333',
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfile}
        options={({ navigation }) => ({
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
          headerTitle: (route.params as any)?.sportName || 'Sport Profile',
        })}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={({ navigation }) => ({
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

function BottomTabs() {
  const headerOptions = {
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
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00B8A9',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          ...headerOptions,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={Map}
        options={{
          ...headerOptions,
          tabBarIcon: ({ color, size }) => <Ionicons name="location" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Match"
        component={Match}
        options={{
          ...headerOptions,
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Community"
        component={Community}
        options={{
          ...headerOptions,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={Chat}
        options={{
          ...headerOptions,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  // stack screen
  // Landing screen first, then bottom tabs
  // Profile screens are accessed via ProfilePictureButton in header
  return (
    <Stack.Navigator initialRouteName="Landing">
      <Stack.Screen name="Landing" component={Landing} options={{ headerShown: false }} />
      <Stack.Screen name="Main" component={BottomTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileStack} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
