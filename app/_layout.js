// App.js
import React from 'react';
import HomeScreen from './HomeScreen';
import ShareScreen from './ShareScreen';
import SettingScreen from './SettingScreen';
import { MD3LightTheme as DefaultTheme, PaperProvider, BottomNavigation } from 'react-native-paper';
import i18n from '../components/i18n/i18n';

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

function App() {
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'home', title: i18n.t('bottom_explore'), focusedIcon: 'map-search', unfocusedIcon: 'map-search-outline' },
    { key: 'share', title: i18n.t('bottom_share'), focusedIcon: 'cloud-upload', unfocusedIcon: 'map-search-outline' },
    { key: 'setting', title: i18n.t('bottom_setting'), focusedIcon: 'cog', unfocusedIcon: 'cog-outline' }
  ]);

  const renderScene = BottomNavigation.SceneMap({
    home: HomeScreen,
    share: ShareScreen,
    setting: SettingScreen,
  });

  return (
    <PaperProvider theme={theme}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
      />
    </PaperProvider>
  );
}

export default App;
