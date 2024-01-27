import FontAwesome from '@expo/vector-icons/FontAwesome';
import { React, useEffect} from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function AppLayout() {
  const [loaded, error] = useFonts({
    MPLUS1p: require('../assets/fonts/MPLUS1p-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tabs>
        <Tabs.Screen
          name="index"
          options={{
            title: "ルート",
            tabBarLabel: 'ルート',
            tabBarStyle: { fontFamily: 'MPLUS1p'},
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="route" color={color} size={size} />
            ),
            href: "/",
            headerStyle: { fontFamily: 'MPLUS1p'}
          }}
        />
        <Tabs.Screen
          name="Upload"
          options={{
            title: "シェア",
            tabBarLabel: 'シェア',
            tabBarLabelStyle: { fontFamily: 'MPLUS1p'},
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="file-upload" color={color} size={size} />
            ),
            href: "/Upload",
            headerStyle: { fontFamily: 'MPLUS1p'}
          }}
        />
      </Tabs>
    </ThemeProvider>
  );
}