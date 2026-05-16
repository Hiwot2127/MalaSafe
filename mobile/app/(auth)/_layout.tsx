import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* 'index' now refers to your login page */}
      <Stack.Screen name="index" /> 
      <Stack.Screen name="register" />
    </Stack>
  );
}