import { Stack } from 'expo-router';
import React from 'react';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="map" />
      <Stack.Screen name="detail" />
      <Stack.Screen name="githubauth" />
    </Stack>
  );
}
