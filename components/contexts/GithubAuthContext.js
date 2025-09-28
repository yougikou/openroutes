import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearGithubCredentials,
  loadGithubCredentials,
  loadRememberPreference,
  saveGithubCredentials,
  saveRememberPreference,
} from '../apis/GitHubAPI';
import { persistGithubCredentials as persistGithubCredentialsHelper } from './githubCredentialPersistence';

const GithubAuthContext = createContext(undefined);

const hasValidCredentials = (credentials) => Boolean(credentials?.token && credentials?.user?.id);

export const GithubAuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [shouldPersistToken, setShouldPersistTokenState] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const persistCredentials = useCallback(async (credentialPayload, persistent) => persistGithubCredentialsHelper(
    credentialPayload,
    persistent,
    {
      saveGithubCredentials,
      clearGithubCredentials,
    },
  ), [clearGithubCredentials, saveGithubCredentials]);

  useEffect(() => {
    const initialise = async () => {
      const preference = await loadRememberPreference();
      const [sessionCredentials, persistentCredentials] = await Promise.all([
        loadGithubCredentials({ persistent: false }),
        loadGithubCredentials({ persistent: true }),
      ]);

      const sessionValid = hasValidCredentials(sessionCredentials);
      const persistentValid = hasValidCredentials(persistentCredentials);

      let activeCredentials = null;
      let activeStorage = null;

      if (preference && persistentValid) {
        activeCredentials = persistentCredentials;
        activeStorage = { persistent: true };
      } else if (!preference && sessionValid) {
        activeCredentials = sessionCredentials;
        activeStorage = { persistent: false };
      } else if (sessionValid) {
        activeCredentials = sessionCredentials;
        activeStorage = { persistent: false };
      } else if (persistentValid) {
        activeCredentials = persistentCredentials;
        activeStorage = { persistent: true };
      }

      if (activeCredentials) {
        setToken(activeCredentials.token);
        setUser(activeCredentials.user);
      } else {
        setToken(null);
        setUser(null);
      }

      if (activeStorage?.persistent === true) {
        setShouldPersistTokenState(true);
      } else if (activeStorage?.persistent === false) {
        setShouldPersistTokenState(false);
      } else {
        setShouldPersistTokenState(preference);
      }

      setHasLoaded(true);
    };

    initialise();
  }, []);

  const applyPersistencePreference = useCallback(async (nextShouldPersist) => {
    setShouldPersistTokenState(nextShouldPersist);
    await saveRememberPreference(nextShouldPersist);

    if (!token || !user || !user.id) {
      if (nextShouldPersist) {
        await clearGithubCredentials({ persistent: false });
      } else {
        await clearGithubCredentials({ persistent: true });
      }
      return;
    }

    await persistCredentials({ token, user }, nextShouldPersist);
  }, [token, user, persistCredentials, clearGithubCredentials, saveRememberPreference]);

  const signIn = useCallback(async ({
    token: nextToken,
    user: nextUser,
    rememberToken,
  }) => {
    setToken(nextToken);
    setUser(nextUser);

    const persist = rememberToken ?? shouldPersistToken;
    setShouldPersistTokenState(persist);
    await saveRememberPreference(persist);

    await persistCredentials({ token: nextToken, user: nextUser }, persist);
  }, [shouldPersistToken, persistCredentials, saveRememberPreference]);

  const signOut = useCallback(async () => {
    setToken(null);
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
