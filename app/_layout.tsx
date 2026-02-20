import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../components/theme';
import { LanguageProvider } from '../components/i18n/LanguageContext';

export default function RootLayout(): React.ReactElement {
  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/openroutes/sw.js', { scope: '/openroutes/' })
        .catch((err) => console.error('SW registration failed:', err));
    }

    if (Platform.OS === 'web' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((persistent) => {
        if (persistent) {
          console.log('存储被标记为持久化，iOS 较难自动清理。');
        } else {
          console.log('无法获取持久化存储权限。');
        }
      });
    }
  }, []);

  return (
    <LanguageProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="app" />
          <Stack.Screen name="view" />
        </Stack>
      </PaperProvider>
    </LanguageProvider>
  );
}
