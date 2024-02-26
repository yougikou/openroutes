import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Text, Button } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { exchangeToken } from "../apis/GitHubAPI";
import { readData } from "../apis/StorageAPI";

export default function GithubAuthScreen() {
  const route = useRoute();
  const [tokenStatus, setTokenStatus] = useState('checking');

  useEffect(() => {
    const retrieveToken = async () => {
      try {
        const code = route.params?.code ?? null;
        if (code) {
          await exchangeToken(code);
          window.location.replace(window.location.origin + window.location.pathname);
        } else {
          const token = await readData('github_access_token');
          if (token) {
            setTokenStatus('success');
          } else {
            setTokenStatus('failed');
          }
        }
      } catch (error) {
        console.error("Error exchange Token:", error);
        window.location.replace(window.location.origin + window.location.pathname);
      }
    };
  
    retrieveToken();
  }, []);

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
