import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearGithubCredentials,
  loadGithubCredentials,
  loadRememberPreference,
  refreshGithubAccessToken,
  saveGithubCredentials,
  saveRememberPreference,
} from '../apis/GitHubAPI';
import { ensureValidGithubCredentials } from './githubCredentialLifecycle';
import { persistGithubCredentials as persistGithubCredentialsHelper } from './githubCredentialPersistence';

const GithubAuthContext = createContext(undefined);

export const GithubAuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [refreshTokenExpiry, setRefreshTokenExpiry] = useState(null);
  const [user, setUser] = useState(null);
  const [shouldPersistToken, setShouldPersistTokenState] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const ensureValidCredentials = useCallback(async (credentials, storageOptions) => ensureValidGithubCredentials(
    credentials,
    storageOptions,
    {
      clearGithubCredentials,
      refreshGithubAccessToken,
      saveGithubCredentials,
    },
  ), [clearGithubCredentials, refreshGithubAccessToken, saveGithubCredentials]);

  const persistCredentials = useCallback(async (credentialPayload, persistent) => persistGithubCredentialsHelper(
    credentialPayload,
    persistent,
    {
      saveGithubCredentials,
      clearGithubCredentials,
    },
  ), [saveGithubCredentials, clearGithubCredentials]);

  useEffect(() => {
    const initialise = async () => {
      const preference = await loadRememberPreference();
      setShouldPersistTokenState(preference);

      const sessionCredentials = await loadGithubCredentials({ persistent: false });
      const persistentCredentials = await loadGithubCredentials({ persistent: true });

      let activeCredentials = preference ? persistentCredentials : sessionCredentials;
      let activeStorage = preference ? { persistent: true } : { persistent: false };

      if ((!activeCredentials?.token || !activeCredentials?.user?.id) && sessionCredentials?.token && sessionCredentials?.user?.id) {
        activeCredentials = sessionCredentials;
        activeStorage = { persistent: false };
      }

      const validated = await ensureValidCredentials(activeCredentials, activeStorage);

      let finalCredentials = validated;
      let finalStorage = activeStorage;

      if (
        (!finalCredentials || !finalCredentials.token || !finalCredentials.user?.id) &&
        activeStorage?.persistent &&
        sessionCredentials?.token &&
        sessionCredentials?.user?.id
      ) {
        finalCredentials = await ensureValidCredentials(sessionCredentials, { persistent: false });
        finalStorage = { persistent: false };
      }

      if (finalCredentials && finalCredentials.token && finalCredentials.user && finalCredentials.user.id) {
        setToken(finalCredentials.token);
        setRefreshToken(finalCredentials.refreshToken ?? null);
        setTokenExpiry(finalCredentials.tokenExpiry ?? null);
        setRefreshTokenExpiry(finalCredentials.refreshTokenExpiry ?? null);
        setUser(finalCredentials.user);
      } else {
        setToken(null);
        setRefreshToken(null);
        setTokenExpiry(null);
        setRefreshTokenExpiry(null);
        setUser(null);
      }

      if (finalStorage?.persistent) {
        setShouldPersistTokenState(true);
      }

      setHasLoaded(true);
    };

    initialise();
  }, [ensureValidCredentials]);

  const applyPersistencePreference = useCallback(async (nextShouldPersist) => {
    setShouldPersistTokenState(nextShouldPersist);
    await saveRememberPreference(nextShouldPersist);

    const credentialPayload = {
      token,
      user,
      refreshToken,
      tokenExpiry,
      refreshTokenExpiry,
    };

      if (!token || !user || !user.id) {
        if (nextShouldPersist) {
          await clearGithubCredentials({ persistent: false });
        } else {
          await clearGithubCredentials({ persistent: true });
        }
        return;
      }

      await persistCredentials(credentialPayload, nextShouldPersist);
    }, [
      token,
      user,
      refreshToken,
      tokenExpiry,
      refreshTokenExpiry,
      clearGithubCredentials,
      saveRememberPreference,
      persistCredentials,
    ]);

  const signIn = useCallback(async ({
    token: nextToken,
    user: nextUser,
    refreshToken: nextRefreshToken = null,
    tokenExpiry: nextTokenExpiry = null,
    refreshTokenExpiry: nextRefreshTokenExpiry = null,
    rememberToken,
  }) => {
    setToken(nextToken);
    setRefreshToken(nextRefreshToken);
    setTokenExpiry(nextTokenExpiry);
    setRefreshTokenExpiry(nextRefreshTokenExpiry);
    setUser(nextUser);

    const persist = rememberToken ?? shouldPersistToken;
    setShouldPersistTokenState(persist);
    await saveRememberPreference(persist);

    const credentialPayload = {
      token: nextToken,
      user: nextUser,
      refreshToken: nextRefreshToken,
      tokenExpiry: nextTokenExpiry,
      refreshTokenExpiry: nextRefreshTokenExpiry,
    };

      await persistCredentials(credentialPayload, persist);
    }, [shouldPersistToken, saveRememberPreference, persistCredentials]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleGithubAuthMessage = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const { data } = event;
      if (!data || data.source !== 'openroutes' || data.type !== 'github-auth-success') {
        return;
      }

      const payload = data.payload ?? {};
      if (!payload.token || !payload.user || !payload.user.id) {
        return;
      }

      signIn({
        token: payload.token,
        user: payload.user,
        refreshToken: payload.refreshToken ?? null,
        tokenExpiry: payload.tokenExpiry ?? null,
        refreshTokenExpiry: payload.refreshTokenExpiry ?? null,
        rememberToken: payload.rememberToken,
      });
    };

    window.addEventListener('message', handleGithubAuthMessage);
    return () => window.removeEventListener('message', handleGithubAuthMessage);
  }, [signIn]);

  const signOut = useCallback(async () => {
    setToken(null);
    setRefreshToken(null);
    setTokenExpiry(null);
    setRefreshTokenExpiry(null);
    setUser(null);
    await clearGithubCredentials({ persistent: true });
    await clearGithubCredentials({ persistent: false });
  }, [clearGithubCredentials]);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token && user && user.id),
    shouldPersistToken,
    hasLoaded,
    signIn,
    signOut,
    setPersistencePreference: applyPersistencePreference,
  }), [token, user, shouldPersistToken, hasLoaded, signIn, signOut, applyPersistencePreference]);

  return (
    <GithubAuthContext.Provider value={value}>
      {children}
    </GithubAuthContext.Provider>
  );
};

export const useGithubAuth = () => {
  const context = useContext(GithubAuthContext);
  if (context === undefined) {
    throw new Error('useGithubAuth must be used within GithubAuthProvider');
  }
  return context;
};
