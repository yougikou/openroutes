import React, { useCallback, useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import { View, StyleSheet, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Appbar, List } from 'react-native-paper';
import i18n from '../i18n/i18n';
import {
  exchangeToken,
  ensureFreshGithubAuth,
  hasValidGithubCredentials,
  refreshGithubToken,
  shouldRefreshGithubToken,
} from "../apis/GitHubAPI";
import Redirector from "../Redirector";

const useProxy = Platform.select({ web: false, default: true });

const githubClientId = 'cd019fec05aa5b74ad81';
const redirectUri = AuthSession.makeRedirectUri({
  useProxy,
  path: 'openroutes/githubauth',
});

export default function SettingScreen() {
  const [githubAuth, setGithubAuth] = useState(null);
  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    clientId: githubClientId,
    scopes: ['identity', 'public_repo'],
    redirectUri,
  }, { authorizationEndpoint: 'https://github.com/login/oauth/authorize' });

  useEffect(() => {
    const handleAuthResponse = async () => {
      if (response?.type !== 'success') {
        return;
      }
      const { code } = response.params;
      if (!code) {
        return;
      }

      try {
        const auth = await exchangeToken(code);
        setGithubAuth(auth);
      } catch (error) {
        console.error('Failed to exchange GitHub code:', error);
      }
    };

    handleAuthResponse();
  }, [response]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchAuth = async () => {
        const stored = await ensureFreshGithubAuth();
        if (isActive) {
          setGithubAuth(stored);
        }
      };
      fetchAuth();
      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    const refreshIfNeeded = async () => {
      if (!githubAuth) {
        return;
      }

      if (shouldRefreshGithubToken(githubAuth) && githubAuth.refreshToken) {
        try {
          const refreshed = await refreshGithubToken(githubAuth);
          setGithubAuth(refreshed);
        } catch (error) {
          console.error('Failed to refresh GitHub auth token:', error);
        }
      }
    };

    refreshIfNeeded();
  }, [githubAuth]);
  const isAuthenticated = hasValidGithubCredentials(githubAuth);

  return (
    <View style={styles.container}>
      <Redirector />
      <Appbar.Header elevation={2}>
        <Appbar.Content title={i18n.t('title_setting')} />
        <Appbar.Action icon="github" color={isAuthenticated ? "#4CAF50" : ""} />
      </Appbar.Header>
      <List.Section>
        <List.Subheader>{i18n.t('setting_account')}</List.Subheader>
        <List.Item
          left={(props) => <List.Icon {...props} icon="github" />}
          title={i18n.t('setting_github_oauth')}
          onPress={() => {
            if (!request) {
              return;
            }
            promptAsync({
              useProxy,
            });
          }}
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