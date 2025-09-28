import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, Button } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { exchangeToken, fetchAuthenticatedUser } from "../apis/GitHubAPI";
import { useGithubAuth } from "../contexts/GithubAuthContext";

export default function GithubAuthScreen() {
  const { code: rawCode } = useLocalSearchParams();
  const { isAuthenticated, shouldPersistToken, hasLoaded, signIn, user } = useGithubAuth();
  const [tokenStatus, setTokenStatus] = useState('checking');
  const [hasHandledCode, setHasHandledCode] = useState(false);
  const router = useRouter();
  const navigateToSettings = useCallback(() => {
    router.replace('/setting');
  }, [router]);

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
            const nextStatus = isAuthenticated ? 'success' : 'failed';
            setTokenStatus(nextStatus);
            sanitizeUrl();
            setHasHandledCode(true);
            if (nextStatus === 'success') {
              navigateToSettings();
            }
          }
          return;
        }

        const redirectUri = typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : undefined;
        const tokenPayload = await exchangeToken(code, { redirectUri });
        const userProfile = await fetchAuthenticatedUser(tokenPayload.accessToken);
        const credentialPayload = {
          token: tokenPayload.accessToken,
          refreshToken: tokenPayload.refreshToken,
          tokenExpiry: tokenPayload.expiresAt,
          refreshTokenExpiry: tokenPayload.refreshTokenExpiresAt,
          user: userProfile,
          rememberToken: shouldPersistToken,
        };

        await signIn(credentialPayload);

        if (!isCancelled) {
          setTokenStatus('success');
          sanitizeUrl();
          setHasHandledCode(true);
          navigateToSettings();
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
  }, [rawCode, isAuthenticated, shouldPersistToken, signIn, hasLoaded, hasHandledCode, navigateToSettings]);

  const successDetailMessage = useMemo(() => {
    if (tokenStatus !== 'success') {
      return null;
    }

    if (user?.login && user?.id) {
      return i18n.t('github_auth_success_detail_identified', {
        login: user.login,
        id: user.id,
      });
    }

    return i18n.t('github_auth_success_detail');
  }, [tokenStatus, user]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text
        variant="headlineLarge"
        style={{ textAlign: 'center', margin: 10 }}>
        {tokenStatus === 'checking' && i18n.t('github_auth_in_progress')}
        {tokenStatus === 'success' && i18n.t('github_auth_success')}
        {tokenStatus === 'failed' && i18n.t('github_auth_failed')}
      </Text>
      {tokenStatus === 'success' && (
        <Text
          variant="bodyLarge"
          style={{ textAlign: 'center', marginHorizontal: 10 }}>
          {successDetailMessage}
        </Text>
      )}
      {tokenStatus === 'failed' && (
        <Button mode="elevated" onPress={navigateToSettings}>
          {i18n.t('github_auth_return_to_settings')}
        </Button>
      )}
    </View>
  );
}
