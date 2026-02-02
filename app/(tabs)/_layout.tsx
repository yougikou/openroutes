import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../components/i18n/i18n';
import { useLanguage } from '../../components/i18n/LanguageContext';

export default function TabLayout() {
  const { locale } = useLanguage();

  return (
    <Tabs
      key={locale}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 95 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: i18n.t('bottom_explore'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          tabBarLabel: i18n.t('bottom_share'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cloud-upload" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="setting"
        options={{
          tabBarLabel: i18n.t('bottom_setting'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
