import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearGithubCredentials,
  loadGithubCredentials,
  loadRememberPreference,
  refreshGithubAccessToken,
  saveGithubCredentials,
  saveRememberPreference,
} from '../apis/GitHubAPI';

const GithubAuthContext = createContext(undefined);

export const GithubAuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [refreshTokenExpiry, setRefreshTokenExpiry] = useState(null);
  const [user, setUser] = useState(null);
  const [shouldPersistToken, setShouldPersistTokenState] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const ensureValidCredentials = useCallback(async (credentials, storageOptions) => {
    const sanitised = {
      token: credentials?.token ?? null,
      refreshToken: credentials?.refreshToken ?? null,
      tokenExpiry: credentials?.tokenExpiry ?? null,
      refreshTokenExpiry: credentials?.refreshTokenExpiry ?? null,
      user: credentials?.user ?? null,
    };

    if (!sanitised.token || !sanitised.user || !sanitised.user.id) {
      return sanitised;
    }

    const tokenExpiryTime = sanitised.tokenExpiry ? Date.parse(sanitised.tokenExpiry) : null;
    if (tokenExpiryTime === null || Number.isNaN(tokenExpiryTime) || tokenExpiryTime > Date.now()) {
      return sanitised;
    }

    if (!storageOptions?.persistent) {
      await clearGithubCredentials(storageOptions);
      return {
        token: null,
        refreshToken: null,
        tokenExpiry: null,
        refreshTokenExpiry: null,
        user: null,
      };
    }

    const refreshExpiryTime = sanitised.refreshTokenExpiry ? Date.parse(sanitised.refreshTokenExpiry) : null;
    if (!sanitised.refreshToken || (refreshExpiryTime !== null && !Number.isNaN(refreshExpiryTime) && refreshExpiryTime <= Date.now())) {
      await clearGithubCredentials(storageOptions);
      return {
        token: null,
        refreshToken: null,
        tokenExpiry: null,
        refreshTokenExpiry: null,
        user: null,
      };
    }

    try {
      const refreshed = await refreshGithubAccessToken(sanitised.refreshToken);
      const nextCredentials = {
        token: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? sanitised.refreshToken,
        tokenExpiry: refreshed.expiresAt ?? null,
        refreshTokenExpiry: refreshed.refreshTokenExpiresAt ?? sanitised.refreshTokenExpiry ?? null,
        user: sanitised.user,
      };
      await saveGithubCredentials(nextCredentials, storageOptions);
      return nextCredentials;
    } catch (error) {
      console.error('Failed to refresh stored GitHub token:', error);
      await clearGithubCredentials(storageOptions);
      return {
        token: null,
        refreshToken: null,
        tokenExpiry: null,
        refreshTokenExpiry: null,
        user: null,
      };
    }
  }, [clearGithubCredentials, refreshGithubAccessToken, saveGithubCredentials]);

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

    if (nextShouldPersist) {
      await saveGithubCredentials(credentialPayload, { persistent: true });
      await clearGithubCredentials({ persistent: false });
    } else {
      await saveGithubCredentials(credentialPayload, { persistent: false });
      await clearGithubCredentials({ persistent: true });
    }
  }, [
    token,
    user,
    refreshToken,
    tokenExpiry,
    refreshTokenExpiry,
    clearGithubCredentials,
    saveGithubCredentials,
    saveRememberPreference,
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

    if (persist) {
      await saveGithubCredentials(credentialPayload, { persistent: true });
      await clearGithubCredentials({ persistent: false });
    } else {
      await saveGithubCredentials(credentialPayload, { persistent: false });
      await clearGithubCredentials({ persistent: true });
    }
  }, [shouldPersistToken, saveRememberPreference, saveGithubCredentials, clearGithubCredentials]);

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
