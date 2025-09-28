import React, { useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import { View, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Appbar, List } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { readData } from '../apis/StorageAPI';
import Redirector from '../Redirector';

const GITHUB_CLIENT_ID = 'cd019fec05aa5b74ad81';
const redirectUri = AuthSession.makeRedirectUri({
  path: 'openroutes/githubauth',
});

const SettingScreen = (): React.ReactElement => {
  const [githubToken, setGithubToken] = useState<string | null>(null);

  const [, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GITHUB_CLIENT_ID,
      scopes: ['identity', 'public_repo'],
      redirectUri,
    },
    { authorizationEndpoint: 'https://github.com/login/oauth/authorize' },
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params ?? {};
      console.log('Received GitHub auth code', code);
    }
  }, [response]);

  const route = useRoute();
  useEffect(() => {
    const fetchToken = async () => {
      const token = await readData('github_access_token');
      if (token) {
        setGithubToken(token);
      }
    };
    fetchToken();
  }, [route]);

  return (
    <View style={styles.container}>
      <Redirector />
      <Appbar.Header>
        <Appbar.Content title={i18n.t('title_setting')} />
        <Appbar.Action icon="github" color={githubToken ? '#4CAF50' : undefined} />
      </Appbar.Header>
      <List.Section>
        <List.Subheader>{i18n.t('setting_account')}</List.Subheader>
        <List.Item
          left={(props) => <List.Icon {...props} icon="github" />}
          title={i18n.t('setting_github_oauth')}
          onPress={() => {
            void promptAsync();
          }}
        />
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default SettingScreen;
