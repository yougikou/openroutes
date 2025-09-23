import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text, Button } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { exchangeToken, fetchAuthenticatedUser } from "../apis/GitHubAPI";
import { useGithubAuth } from "../contexts/GithubAuthContext";

export default function GithubAuthScreen() {
  const { code: rawCode } = useLocalSearchParams();
  const { isAuthenticated, shouldPersistToken, hasLoaded, signIn } = useGithubAuth();
  const [tokenStatus, setTokenStatus] = useState('checking');
  const [hasHandledCode, setHasHandledCode] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const closeWindow = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.close();
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded || hasHandledCode) {
      return;
    }

    let isCancelled = false;

    const sanitizeUrl = () => {
      if (typeof window === 'undefined') {
        return;
      }
      const sanitizedUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState(null, '', sanitizedUrl);
    };

    const retrieveToken = async () => {
      try {
        const codeParam = Array.isArray(rawCode) ? rawCode[0] : rawCode;
        const code = codeParam ?? null;

        if (!code) {
          if (!isCancelled) {
            setTokenStatus(isAuthenticated ? 'success' : 'failed');
            sanitizeUrl();
            setHasHandledCode(true);
          }
          return;
        }

        const tokenPayload = await exchangeToken(code);
        const userProfile = await fetchAuthenticatedUser(tokenPayload.accessToken);
        await signIn({
          token: tokenPayload.accessToken,
          refreshToken: tokenPayload.refreshToken,
          tokenExpiry: tokenPayload.expiresAt,
          refreshTokenExpiry: tokenPayload.refreshTokenExpiresAt,
          user: userProfile,
          rememberToken: shouldPersistToken,
        });

        if (!isCancelled) {
          setTokenStatus('success');
          sanitizeUrl();
          setHasHandledCode(true);
        }
      } catch (error) {
        console.error("Error exchange Token:", error);
        if (!isCancelled) {
          setTokenStatus('failed');
          sanitizeUrl();
          setHasHandledCode(true);
        }
      }
    };

    retrieveToken();

    return () => {
      isCancelled = true;
    };
  }, [rawCode, isAuthenticated, shouldPersistToken, signIn, hasLoaded, hasHandledCode]);

  useEffect(() => {
    if (tokenStatus === 'success' || tokenStatus === 'failed') {
      setCountdown(5);
    } else {
      setCountdown(null);
    }
  }, [tokenStatus]);

  useEffect(() => {
    if (countdown === null) {
      return;
    }

    if (countdown <= 0) {
      closeWindow();
      return;
    }

    const timeoutId = setTimeout(() => {
      setCountdown((prev) => (prev === null ? prev : prev - 1));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [countdown, closeWindow]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text
        variant="headlineLarge"
        style={{ textAlign: 'center', margin: 10 }}>
        {tokenStatus === 'checking' && i18n.t('github_auth_in_progress')}
        {tokenStatus === 'success' && i18n.t('github_auth_success')}
        {tokenStatus === 'failed' && i18n.t('github_auth_failed')}
      </Text>
      {countdown !== null && (
        <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
          {i18n.t('github_auth_auto_close_notice', { seconds: countdown })}
        </Text>
      )}
      <Button mode="elevated" onPress={closeWindow}>{i18n.t('github_auth_close_window')}</Button>
    </View>
  );
}
