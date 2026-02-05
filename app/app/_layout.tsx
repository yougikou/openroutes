import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { PWAInstallPrompt } from '../../components/PWAInstallPrompt';

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="map" />
        <Stack.Screen name="detail" />
        <Stack.Screen name="githubauth" />
      </Stack>
      <PWAInstallPrompt />
    </View>
  );
}
