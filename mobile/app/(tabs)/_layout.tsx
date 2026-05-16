import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0284c7', // Professional Blue
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
        },
      }}>
      
      {/* 1. DASHBOARD (HOME) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 2. RISK MAP */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Malaria Risk Map',
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 3. TRAVEL CHECKER */}
      <Tabs.Screen
        name="travel"
        options={{
          title: 'Travel Risk Check',
          tabBarLabel: 'Travel',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'airplane' : 'airplane-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 4. ALERTS */}
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Active Alerts',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}