import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

// Configure how notifications appear when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Use this for older versions
    shouldPlaySound: true,
    shouldSetBadge: false,
    // Modern version properties:
    priority: Notifications.AndroidPriority.MAX,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // Request permission for notifications
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
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="prevention" options={{ presentation: 'modal', headerShown: true, title: 'Guidance' }} />
      </Stack>
    </AuthProvider>
  );
}