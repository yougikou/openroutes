import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, List } from 'react-native-paper';
import i18n from '../components/i18n/i18n';

export default function SettingScreen() {
  return (
    <View style={styles.container}>
      <Appbar.Header elevation={2}>
        <Appbar.Content title={i18n.t('title_setting')} />
      </Appbar.Header>
      <List.Section>
        <List.Subheader>{i18n.t('setting_account')}</List.Subheader>
        <List.Item
          left={(props) => <List.Icon {...props} icon="github" />}
          title={i18n.t('setting_github_oauth')}
          onPress={() => {}}
        />
      </List.Section>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 100,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
  },
});