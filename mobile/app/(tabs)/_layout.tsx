import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../constants/Colors'; // Import our new hook

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text, fontWeight: 'bold' },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.subtext,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 10,
        },
      }}>
      
      <Tabs.Screen name="index" options={{ title: 'MalaSafe', tabBarLabel: 'Home', 
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} /> }} />

      <Tabs.Screen name="map" options={{ title: 'Risk Map', tabBarLabel: 'Map', 
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} /> }} />

      <Tabs.Screen name="travel" options={{ title: 'Travel Safety', tabBarLabel: 'Travel', 
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'airplane' : 'airplane-outline'} size={24} color={color} /> }} />

      <Tabs.Screen name="alerts" options={{ title: 'Notifications', tabBarLabel: 'Alerts', 
        tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={color} /> }} />
    </Tabs>
  );
}