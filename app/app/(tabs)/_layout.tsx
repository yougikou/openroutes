import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../../components/i18n/i18n';
import { useLanguage } from '../../../components/i18n/LanguageContext';
import { readData, storeData } from '../../../components/apis/StorageAPI';
import { fetchUser } from '../../../components/apis/GitHubAPI';

export default function TabLayout() {
  const { locale } = useLanguage();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      // 1. Check stored username
      const storedUser = await readData('github_user_login');
      if (storedUser) {
        setUsername(storedUser);
        return;
      }

      // 2. If not stored, try to fetch using token
      const token = await readData('github_access_token');
      if (token) {
        try {
          const userProfile = await fetchUser(token);
          if (userProfile && userProfile.login) {
            await storeData('github_user_login', userProfile.login);
            setUsername(userProfile.login);
          }
        } catch (e) {
          console.warn('Failed to fetch user profile for tab visibility', e);
        }
      }
    };
    checkUser();
  }, []);

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
        name="world"
        options={{
          href: (username === 'yougikou' || process.env.EXPO_PUBLIC_map_debug === 'true') ? '/app/world' : null,
          tabBarLabel: i18n.t('bottom_map_search'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-radius" color={color} size={size} />
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
