import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text, Button } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { exchangeToken, fetchAuthenticatedUser } from "../apis/GitHubAPI";
import { useGithubAuth } from "../contexts/GithubAuthContext";

export default function GithubAuthScreen() {
  const { code: rawCode } = useLocalSearchParams();
  const { isAuthenticated, shouldPersistToken, signIn } = useGithubAuth();
  const [tokenStatus, setTokenStatus] = useState('checking');

  useEffect(() => {
    const retrieveToken = async () => {
      try {
        const codeParam = Array.isArray(rawCode) ? rawCode[0] : rawCode;
        const code = codeParam ?? null;
        if (code) {
          const token = await exchangeToken(code);
          const userProfile = await fetchAuthenticatedUser(token);
          await signIn({ token, user: userProfile, rememberToken: shouldPersistToken });
          setTokenStatus('success');
          window.location.replace(window.location.origin + window.location.pathname);
        } else {
          setTokenStatus(isAuthenticated ? 'success' : 'failed');
        }
      } catch (error) {
        console.error("Error exchange Token:", error);
        setTokenStatus('failed');
        window.location.replace(window.location.origin + window.location.pathname);
      }
    };

    retrieveToken();
  }, [rawCode, isAuthenticated, shouldPersistToken, signIn]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text variant="headlineLarge"
        style={{ alignItems: 'center', margin: 10}}>
        {tokenStatus === 'success' && i18n.t('github_auth_success')}
        {tokenStatus === 'failed' && i18n.t('github_auth_failed')}
      </Text>
      <Button mode="elevated" onPress={() => window.close()}>Close</Button>
    </View>
  );
}
