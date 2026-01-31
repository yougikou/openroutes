import React from 'react';
import { Tabs } from 'expo-router/tabs';
import { PaperProvider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../components/i18n/i18n';
import { theme } from '../components/theme';
import { LanguageProvider, useLanguage } from '../components/i18n/LanguageContext';

function AppTabs(): React.ReactElement {
  const { locale } = useLanguage();

  return (
    <Tabs key={locale} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: i18n.t('bottom_explore'),
          href: '/',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          tabBarLabel: i18n.t('bottom_share'),
          href: '/share',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cloud-upload" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="setting"
        options={{
          tabBarLabel: i18n.t('bottom_setting'),
          href: '/setting',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="githubauth" options={{ href: null }} />
      <Tabs.Screen name="detail" options={{ href: null }} />
    </Tabs>
  );
}

export default function RootLayout(): React.ReactElement {
  return (
    <LanguageProvider>
      <PaperProvider theme={theme}>
        <AppTabs />
      </PaperProvider>
    </LanguageProvider>
  );
}
