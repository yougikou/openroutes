import React, { useCallback, useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import { View, StyleSheet, Platform } from 'react-native';
import { Appbar, List, Switch } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { exchangeToken, fetchAuthenticatedUser } from "../apis/GitHubAPI";
import Redirector from "../Redirector";
import { useGithubAuth } from "../contexts/GithubAuthContext";

const useProxy = Platform.select({ web: false, default: true });

const githubClientId = 'cd019fec05aa5b74ad81';
const redirectUri = AuthSession.makeRedirectUri({
  useProxy,
  path: 'openroutes/githubauth',
});

export default function SettingScreen() {
  const {
    user,
    isAuthenticated,
    shouldPersistToken,
    hasLoaded,
    signIn,
    signOut,
    setPersistencePreference,
  } = useGithubAuth();
  const [rememberSelection, setRememberSelection] = useState(shouldPersistToken);
  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    clientId: githubClientId,
    scopes: ['identity', 'public_repo', 'offline_access'],
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
        const tokenPayload = await exchangeToken(code, { redirectUri });
        const profile = await fetchAuthenticatedUser(tokenPayload.accessToken);
        await signIn({
          token: tokenPayload.accessToken,
          refreshToken: tokenPayload.refreshToken,
          tokenExpiry: tokenPayload.expiresAt,
          refreshTokenExpiry: tokenPayload.refreshTokenExpiresAt,
          user: profile,
          rememberToken: rememberSelection,
        });
      } catch (error) {
        console.error('Failed to complete GitHub authentication:', error);
      }
    };

    handleAuthResponse();
  }, [response, rememberSelection, signIn]);

  useEffect(() => {
    setRememberSelection(shouldPersistToken);
  }, [shouldPersistToken]);

  const handleRememberToggle = async () => {
    const nextValue = !rememberSelection;
    setRememberSelection(nextValue);
    await setPersistencePreference(nextValue);
  };

  const handleGithubAuthPress = useCallback(async () => {
    if (!request) {
      return;
    }

    try {
      if (Platform.OS === 'web') {
        const authUrl = await request.makeAuthUrlAsync({ useProxy });
        if (authUrl && typeof window !== 'undefined') {
          window.location.assign(authUrl);
        }
        return;
      }

      await promptAsync({
        useProxy,
      });
    } catch (error) {
      console.error('Failed to initiate GitHub authentication flow:', error);
    }
  }, [promptAsync, request, useProxy]);

  const handleSignOut = async () => {
    await signOut();
  };

  const githubStatusDescription = isAuthenticated
    ? i18n.t('setting_github_status_signed_in', { login: user?.login ?? 'unknown', id: user?.id ?? '-' })
    : i18n.t('setting_github_status_signed_out');

  return (
    <View style={styles.container}>
      <Redirector />
      <Appbar.Header elevation={2}>
        <Appbar.Content title={i18n.t('title_setting')} />
        <Appbar.Action icon="github" color={isAuthenticated ? "#4CAF50" : "#000000"} />
      </Appbar.Header>
      <List.Section>
        <List.Subheader>{i18n.t('setting_account')}</List.Subheader>
        <List.Item
          left={(props) => <List.Icon {...props} icon="github" />}
          title={i18n.t('setting_github_oauth')}
          description={githubStatusDescription}
          onPress={handleGithubAuthPress}
        />
        <List.Item
          left={(props) => <List.Icon {...props} icon="content-save" />}
          title={i18n.t('setting_github_remember_token')}
          description={i18n.t('setting_github_remember_token_desc')}
          right={() => (
            <Switch
              value={rememberSelection}
              onValueChange={handleRememberToggle}
              disabled={!hasLoaded}
            />
          )}
        />
        <List.Item
          left={(props) => <List.Icon {...props} icon="logout" />}
          title={i18n.t('setting_github_sign_out')}
          onPress={handleSignOut}
          disabled={!hasLoaded}
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