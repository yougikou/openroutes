import React from 'react';
import { Tabs } from 'expo-router/tabs';
import { MD3LightTheme as DefaultTheme, PaperProvider } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../components/i18n/i18n';

const theme: MD3Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: 'rgb(0, 122, 255)',
    onPrimary: 'rgb(255, 255, 255)',
    primaryContainer: 'rgb(204, 228, 255)',
    onPrimaryContainer: 'rgb(0, 61, 126)',
    secondary: 'rgb(50, 50, 50)',
    onSecondary: 'rgb(255, 255, 255)',
    secondaryContainer: 'rgb(232, 232, 232)',
    onSecondaryContainer: 'rgb(35, 35, 35)',
    tertiary: 'rgb(59, 89, 152)',
    onTertiary: 'rgb(255, 255, 255)',
    tertiaryContainer: 'rgb(222, 235, 255)',
    onTertiaryContainer: 'rgb(17, 45, 78)',
    error: 'rgb(255, 69, 58)',
    onError: 'rgb(255, 255, 255)',
    errorContainer: 'rgb(255, 235, 230)',
    onErrorContainer: 'rgb(102, 0, 0)',
    background: 'rgb(255, 255, 255)',
    onBackground: 'rgb(28, 28, 30)',
    surface: 'rgb(255, 255, 255)',
    onSurface: 'rgb(28, 28, 30)',
    surfaceVariant: 'rgb(235, 235, 245)',
    onSurfaceVariant: 'rgb(99, 99, 102)',
    outline: 'rgb(199, 199, 204)',
    outlineVariant: 'rgb(174, 174, 178)',
    shadow: 'rgb(0, 0, 0)',
    scrim: 'rgb(0, 0, 0)',
    inverseSurface: 'rgb(28, 28, 30)',
    inverseOnSurface: 'rgb(255, 255, 255)',
    inversePrimary: 'rgb(100, 210, 255)',
    elevation: {
      level0: 'transparent',
      level1: 'rgb(245, 245, 245)',
      level2: 'rgb(238, 238, 238)',
      level3: 'rgb(230, 230, 230)',
      level4: 'rgb(222, 222, 222)',
      level5: 'rgb(214, 214, 214)',
    },
    surfaceDisabled: 'rgba(28, 28, 30, 0.12)',
    onSurfaceDisabled: 'rgba(28, 28, 30, 0.38)',
    backdrop: 'rgba(44, 49, 55, 0.4)',
  },
};

export default function AppLayout(): React.ReactElement {
  return (
    <PaperProvider theme={theme}>
      <Tabs screenOptions={{ headerShown: false }}>
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
    </PaperProvider>
  );
}
