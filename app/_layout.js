// App.js
import React from 'react';
import HomeScreen from './HomeScreen';
import ShareScreen from './ShareScreen';
import SettingScreen from './SettingScreen';
import { BottomNavigation } from 'react-native-paper';
import i18n from '../components/i18n/i18n';

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
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
}

export default App;
