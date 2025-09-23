import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text, Button } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { exchangeToken, getStoredGithubAuth, hasValidGithubCredentials } from "../apis/GitHubAPI";

export default function GithubAuthScreen() {
  const { code: rawCode } = useLocalSearchParams();
  const [tokenStatus, setTokenStatus] = useState('checking');

  useEffect(() => {
    const retrieveToken = async () => {
      try {
        const codeParam = Array.isArray(rawCode) ? rawCode[0] : rawCode;
        const code = codeParam ?? null;
        if (code) {
          const auth = await exchangeToken(code);
          setTokenStatus(hasValidGithubCredentials(auth) ? 'success' : 'failed');
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.replace(window.location.origin + window.location.pathname);
          }
        } else {
          const auth = await getStoredGithubAuth();
          setTokenStatus(hasValidGithubCredentials(auth) ? 'success' : 'failed');
        }
      } catch (error) {
        console.error("Error exchange Token:", error);
        setTokenStatus('failed');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.replace(window.location.origin + window.location.pathname);
        }
      }
    };

    retrieveToken();
  }, [rawCode]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text variant="headlineLarge"
        style={{ alignItems: 'center', margin: 10}}>
        {tokenStatus === 'success' && i18n.t('github_auth_success')}
        {tokenStatus === 'failed' && i18n.t('github_auth_failed')}
      </Text>
      <Button mode="elevated" onPress={() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.close();
        }
      }}>Close</Button>
    </View>
  );
}
