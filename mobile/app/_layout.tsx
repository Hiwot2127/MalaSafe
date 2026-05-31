import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

// Configure how notifications appear when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, 
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidPriority.MAX,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // Request permission for notifications on startup
    const registerForNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions denied');
      }
    };
    registerForNotifications();
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 1. The Entry Point (Redirector) */}
        <Stack.Screen name="index" />

        {/* 2. Authentication Group (Login/Register) */}
        <Stack.Screen name="(auth)" />

        {/* 3. Main App Group (Dashboard/Map/Alerts/Travel) */}
        <Stack.Screen name="(tabs)" />

        {/* 4. Symptom Checker (Slides up as a Modal) */}
        <Stack.Screen 
          name="symptoms" 
          options={{ 
            presentation: 'modal', 
            headerShown: false 
          }} 
        />

        {/* 5. Prevention Guidance (Slides up as a Modal) */}
        <Stack.Screen 
          name="prevention" 
          options={{ 
            presentation: 'modal', 
            headerShown: true, 
            title: 'Medical Guidance' 
          }} 
        />
      </Stack>
    </AuthProvider>
  );
}