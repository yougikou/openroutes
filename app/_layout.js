// App.js
import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { NavigationContainer, useLinkTo } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './HomeScreen';
import ShareScreen from './ShareScreen';
import SettingScreen from './SettingScreen';
import GithubAuthScreen from "./GithubAuthScreen";
import { MD3LightTheme as DefaultTheme, PaperProvider, BottomNavigation } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../components/i18n/i18n';
import { storeData } from "../components/StorageAPI";

const theme = {
  ...DefaultTheme,
  // Specify custom property
  myOwnProperty: true,
  // Specify custom property in nested object
  "colors": {
    "primary": "rgb(0, 99, 154)",
    "onPrimary": "rgb(255, 255, 255)",
    "primaryContainer": "rgb(206, 229, 255)",
    "onPrimaryContainer": "rgb(0, 29, 50)",
    "secondary": "rgb(81, 96, 111)",
    "onSecondary": "rgb(255, 255, 255)",
    "secondaryContainer": "rgb(213, 228, 247)",
    "onSecondaryContainer": "rgb(14, 29, 42)",
    "tertiary": "rgb(104, 88, 122)",
    "onTertiary": "rgb(255, 255, 255)",
    "tertiaryContainer": "rgb(238, 219, 255)",
    "onTertiaryContainer": "rgb(35, 21, 51)",
    "error": "rgb(186, 26, 26)",
    "onError": "rgb(255, 255, 255)",
    "errorContainer": "rgb(255, 218, 214)",
    "onErrorContainer": "rgb(65, 0, 2)",
    "background": "rgb(252, 252, 255)",
    "onBackground": "rgb(26, 28, 30)",
    "surface": "rgb(252, 252, 255)",
    "onSurface": "rgb(26, 28, 30)",
    "surfaceVariant": "rgb(222, 227, 235)",
    "onSurfaceVariant": "rgb(66, 71, 78)",
    "outline": "rgb(114, 119, 127)",
    "outlineVariant": "rgb(194, 199, 207)",
    "shadow": "rgb(0, 0, 0)",
    "scrim": "rgb(0, 0, 0)",
    "inverseSurface": "rgb(47, 48, 51)",
    "inverseOnSurface": "rgb(240, 240, 244)",
    "inversePrimary": "rgb(150, 204, 255)",
    "elevation": {
      "level0": "transparent",
      "level1": "rgb(239, 244, 250)",
      "level2": "rgb(232, 240, 247)",
      "level3": "rgb(224, 235, 244)",
      "level4": "rgb(222, 234, 243)",
      "level5": "rgb(217, 231, 241)"
    },
    "surfaceDisabled": "rgba(26, 28, 30, 0.12)",
    "onSurfaceDisabled": "rgba(26, 28, 30, 0.38)",
    "backdrop": "rgba(44, 49, 55, 0.4)"
  }
};

const Tab = createBottomTabNavigator();

const linking = {
  prefixes: ['oproutes://', 'http://localhost:8081/'],
  config: {
    screens: {
      Home: 'home',
      Share: 'share',
      Setting: 'setting',
      GithubAuth: 'githubauth',
    }
  },
};

const MyTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={({ navigation, state, descriptors, insets }) => {
        const filteredRoutes = state.routes.filter(route => route.name !== "GithubAuth");
        const filteredState = {
          ...state,
          routes: filteredRoutes,
          index: state.index >= filteredRoutes.length ? filteredRoutes.length - 1 : state.index,
        };
        return (
          <BottomNavigation.Bar navigationState={filteredState} safeAreaInsets={insets}
            onTabPress={({ route, preventDefault }) => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (event.defaultPrevented) {
                preventDefault();
              } else {
                navigation.dispatch({
                  ...CommonActions.navigate(route.name, route.params),
                  target: state.key,
                });
              }
            }}

            renderIcon={({ route, focused, color }) => {
              const { options } = descriptors[route.key];
              if (options.tabBarIcon) {
                return options.tabBarIcon({ focused, color, size: 24 });
              }
              return null;
            }}

            getLabelText={({ route }) => {
              const { options } = descriptors[route.key];
              const label =
                options.tabBarLabel !== undefined
                  ? options.tabBarLabel
                  : options.title !== undefined
                  ? options.title
                  : route.title;
              return label;
            }}
          />
        )
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: i18n.t('bottom_explore'),
          tabBarIcon: ({ color, size }) => {
            return <Icon name="map-search" size={size} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Share"
        component={ShareScreen}
        options={{
          tabBarLabel: i18n.t('bottom_share'),
          tabBarIcon: ({ color, size }) => {
            return <Icon name="cloud-upload" size={size} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="Setting"
        component={SettingScreen}
        options={{
          tabBarLabel: i18n.t('bottom_setting'),
          tabBarIcon: ({ color, size }) => {
            return <Icon name="cog" size={size} color={color} />;
          },
        }}
      />
      <Tab.Screen
        name="GithubAuth"
        component={GithubAuthScreen}
      />
    </Tab.Navigator>
  );
}

function App() {

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer independent={true} linking={linking}>
        <MyTabs />
      </NavigationContainer>
    </PaperProvider>
  );
}

export default App;
