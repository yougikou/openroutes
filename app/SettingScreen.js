import React, { useEffect } from 'react';
import * as AuthSession from 'expo-auth-session';
import { View, StyleSheet, Platform } from 'react-native';
import { Appbar, List } from 'react-native-paper';
import i18n from '../components/i18n/i18n';

const useProxy = Platform.select({ web: false, default: true });

const githubClientId = 'cd019fec05aa5b74ad81';
const redirectUri = AuthSession.makeRedirectUri({
  useProxy: true,
  path: 'githubauth',
});

export default function SettingScreen() {
  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    clientId: githubClientId,
    scopes: ['identity', 'public_repo'],
    redirectUri,
  }, { authorizationEndpoint: 'https://github.com/login/oauth/authorize' });

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      console.log(code);
    }
  }, [response]);

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
          onPress={() => {promptAsync()}}
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