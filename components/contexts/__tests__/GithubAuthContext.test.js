/** @jest-environment jsdom */

import React, { useEffect } from 'react';
import { render, waitFor, act } from '@testing-library/react';

const mockGithubApi = {
  __esModule: true,
  loadRememberPreference: jest.fn(),
  loadGithubCredentials: jest.fn(),
  saveGithubCredentials: jest.fn(),
  clearGithubCredentials: jest.fn(),
  saveRememberPreference: jest.fn(),
};

jest.mock('../../apis/GitHubAPI', () => mockGithubApi);

const mockPersistence = {
  __esModule: true,
  persistGithubCredentials: jest.fn(),
};

jest.mock('../githubCredentialPersistence', () => mockPersistence);

const { GithubAuthProvider, useGithubAuth } = require('../GithubAuthContext');

const {
  loadRememberPreference: mockLoadRememberPreference,
  loadGithubCredentials: mockLoadGithubCredentials,
  saveGithubCredentials: mockSaveGithubCredentials,
  clearGithubCredentials: mockClearGithubCredentials,
  saveRememberPreference: mockSaveRememberPreference,
} = mockGithubApi;

const { persistGithubCredentials: mockPersistGithubCredentials } = mockPersistence;

const emptyCredentials = {
  token: null,
  user: null,
};

const createCredentialPayload = (overrides = {}) => ({
  token: 'access-token',
  user: { id: 123, login: 'openroutes-user' },
  ...overrides,
});

const ContextObserver = ({ onChange }) => {
  const value = useGithubAuth();

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  return null;
};

describe('GithubAuthContext integration', () => {
  let latestContext;

  const renderContext = () => {
    latestContext = undefined;

    render(
      <GithubAuthProvider>
        <ContextObserver onChange={(value) => { latestContext = value; }} />
      </GithubAuthProvider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLoadRememberPreference.mockResolvedValue(false);
    mockLoadGithubCredentials.mockImplementation(async () => ({ ...emptyCredentials }));
    mockPersistGithubCredentials.mockResolvedValue(undefined);
    mockSaveGithubCredentials.mockResolvedValue(undefined);
    mockClearGithubCredentials.mockResolvedValue(undefined);
    mockSaveRememberPreference.mockResolvedValue(undefined);
  });

  const waitForContextReady = async () => {
    await waitFor(() => {
      expect(latestContext).toBeDefined();
      expect(latestContext.hasLoaded).toBe(true);
    });
  };

  it('remains signed out when no stored credentials are available', async () => {
    renderContext();
    await waitForContextReady();

    expect(latestContext.isAuthenticated).toBe(false);
    expect(latestContext.token).toBeNull();
    expect(mockLoadGithubCredentials).toHaveBeenCalledWith({ persistent: false });
    expect(mockLoadGithubCredentials).toHaveBeenCalledWith({ persistent: true });
  });

  it('restores session credentials when persistence is disabled', async () => {
    const sessionCredentials = createCredentialPayload();

    mockLoadGithubCredentials.mockImplementation(async (options) => {
      if (options?.persistent) {
        return { ...emptyCredentials };
      }
      return { ...sessionCredentials };
    });

    renderContext();
    await waitForContextReady();

    expect(latestContext.isAuthenticated).toBe(true);
    expect(latestContext.shouldPersistToken).toBe(false);
    expect(latestContext.user).toEqual(sessionCredentials.user);
  });

  it('restores persistent credentials when preference is enabled', async () => {
    const persistentCredentials = createCredentialPayload();

    mockLoadRememberPreference.mockResolvedValue(true);
    mockLoadGithubCredentials.mockImplementation(async (options) => {
      if (options?.persistent) {
        return { ...persistentCredentials };
      }
      return { ...emptyCredentials };
    });

    renderContext();
    await waitForContextReady();

    expect(latestContext.isAuthenticated).toBe(true);
    expect(latestContext.shouldPersistToken).toBe(true);
    expect(latestContext.user).toEqual(persistentCredentials.user);
  });

  it('persists credentials to session storage when the user opts out of remembering tokens', async () => {
    renderContext();
    await waitForContextReady();

    const credentialPayload = createCredentialPayload({ rememberToken: false });

    await act(async () => {
      await latestContext.signIn(credentialPayload);
    });

    expect(mockSaveRememberPreference).toHaveBeenCalledWith(false);
    expect(mockPersistGithubCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        token: credentialPayload.token,
        user: credentialPayload.user,
      }),
      false,
      expect.objectContaining({
        saveGithubCredentials: mockSaveGithubCredentials,
        clearGithubCredentials: mockClearGithubCredentials,
      }),
    );
  });

  it('persists credentials to local storage when the user opts in to remembering tokens', async () => {
    renderContext();
    await waitForContextReady();

    const credentialPayload = createCredentialPayload({ rememberToken: true });

    await act(async () => {
      await latestContext.signIn(credentialPayload);
    });

    expect(mockSaveRememberPreference).toHaveBeenCalledWith(true);
    expect(mockPersistGithubCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        token: credentialPayload.token,
        user: credentialPayload.user,
      }),
      true,
      expect.objectContaining({
        saveGithubCredentials: mockSaveGithubCredentials,
        clearGithubCredentials: mockClearGithubCredentials,
      }),
    );
  });

  it('updates persistence preference for an authenticated user', async () => {
    const sessionCredentials = createCredentialPayload();
    mockLoadGithubCredentials.mockImplementation(async (options) => {
      if (options?.persistent) {
        return { ...emptyCredentials };
      }
      return { ...sessionCredentials };
    });

    renderContext();
    await waitForContextReady();

    await act(async () => {
      await latestContext.setPersistencePreference(true);
    });

    expect(mockSaveRememberPreference).toHaveBeenCalledWith(true);
    expect(mockPersistGithubCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ token: sessionCredentials.token, user: sessionCredentials.user }),
      true,
      expect.any(Object),
    );
  });

  it('clears unused storage when persistence preference is changed while signed out', async () => {
    renderContext();
    await waitForContextReady();

    await act(async () => {
      await latestContext.setPersistencePreference(true);
    });

    await act(async () => {
      await latestContext.setPersistencePreference(false);
    });

    expect(mockClearGithubCredentials).toHaveBeenNthCalledWith(1, { persistent: false });
    expect(mockClearGithubCredentials).toHaveBeenNthCalledWith(2, { persistent: true });
  });
});
