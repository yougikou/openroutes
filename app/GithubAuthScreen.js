import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text, Button } from 'react-native-paper';
import { exchangeToken } from "../components/GitHubAPI";
import { readData } from "../components/StorageAPI";


export default function GithubAuthScreen() {
  const route = useRoute();
  const [tokenStatus, setTokenStatus] = useState('checking');

  useEffect(() => {
    const code = route.params?.code;
    if (code) {
      exchangeToken(code);
    }

    const token = readData('github_access_token');
    if (token) {
      setTokenStatus('success');
    } else {
      setTokenStatus('failed');
    }
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text variant="headlineLarge" 
        style={{ alignItems: 'center', margin: 10}}>
        {tokenStatus === 'success' && "Token Saved."}
        {tokenStatus === 'failed' && "Failed. Please try again."}
      </Text>
      <Button mode="elevated" onPress={() => window.close()}>Close</Button>
    </View>
  );
}
