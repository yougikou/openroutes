import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../components/theme';
import { LanguageProvider } from '../components/i18n/LanguageContext';

export default function RootLayout(): React.ReactElement {
  return (
    <LanguageProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="map" />
          <Stack.Screen name="detail" />
          <Stack.Screen name="githubauth" />
        </Stack>
      </PaperProvider>
    </LanguageProvider>
  );
}
