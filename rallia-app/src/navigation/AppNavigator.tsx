import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from '@expo/vector-icons';
import Home from "../screens/Home";
import Map from "../screens/Map";
import Match from "../screens/Match";
import Community from "../screens/Community";
import Chat from "../screens/Chat";
import Profile from "../screens/Profile";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs () {
    return(
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
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen 
                name="Map" 
                component={Map}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="location" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen 
                name="Match" 
                component={Match}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="add-circle" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen 
                name="Community" 
                component={Community}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen 
                name="Chat" 
                component={Chat}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubbles" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    )
}
export default function AppNavigator() {

  // stack screen
  // inside stack ---> we will call out bottom tabs also as one of the screens, same for upper navigation
  return(
    <Stack.Navigator>
        <Stack.Screen
        name="Main"
        component={BottomTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={Profile}
        options={{ 
          headerShown: true,
          title: 'Profile',
          headerStyle: {
            backgroundColor: '#C8F2EF',
          },
        }}
      />
    </Stack.Navigator>
  );
  
}