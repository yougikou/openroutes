import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Text, Button } from 'react-native-paper';
import { exchangeToken } from "../apis/GitHubAPI";
import { readData } from "../apis/StorageAPI";


export default function GithubAuthScreen() {
  const route = useRoute();
  const [tokenStatus, setTokenStatus] = useState('checking');

  useEffect(() => {
    const retrieveToken = async () => {
      try {
        const { code } = route.params
        if (code) {
          await exchangeToken(code);
        }
    
        const token = await readData('github_access_token');
        if (token) {
          setTokenStatus('success');
        } else {
          setTokenStatus('failed');
        }
      } catch (error) {
        console.error("Error exchange Token:", error);
        setTokenStatus('failed');
      }
    };
  
    retrieveToken();
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
