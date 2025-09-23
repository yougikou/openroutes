import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearGithubCredentials,
  loadGithubCredentials,
  loadRememberPreference,
  saveGithubCredentials,
  saveRememberPreference,
} from '../apis/GitHubAPI';

const GithubAuthContext = createContext(undefined);

export const GithubAuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [shouldPersistToken, setShouldPersistTokenState] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const initialise = async () => {
      const preference = await loadRememberPreference();
      setShouldPersistTokenState(preference);

      const { token: storedToken, user: storedUser } = await loadGithubCredentials();
      if (storedToken && storedUser && storedUser.id) {
        setToken(storedToken);
        setUser(storedUser);
        setShouldPersistTokenState(true);
      }
      setHasLoaded(true);
    };

    initialise();
  }, []);

  const applyPersistencePreference = useCallback(async (nextShouldPersist) => {
    setShouldPersistTokenState(nextShouldPersist);
    await saveRememberPreference(nextShouldPersist);

    if (!token || !user || !user.id) {
      if (!nextShouldPersist) {
        await clearGithubCredentials();
      }
      return;
    }

    if (nextShouldPersist) {
      await saveGithubCredentials({ token, user });
    } else {
      await clearGithubCredentials();
    }
  }, [token, user]);

  const signIn = useCallback(async ({ token: nextToken, user: nextUser, rememberToken }) => {
    setToken(nextToken);
    setUser(nextUser);

    const persist = rememberToken ?? shouldPersistToken;
    setShouldPersistTokenState(persist);
    await saveRememberPreference(persist);

    if (persist) {
      await saveGithubCredentials({ token: nextToken, user: nextUser });
    } else {
      await clearGithubCredentials();
    }
  }, [shouldPersistToken]);

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    await clearGithubCredentials();
  }, []);

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
