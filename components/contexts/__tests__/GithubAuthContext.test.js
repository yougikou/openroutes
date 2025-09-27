/** @jest-environment jsdom */

import React, { useEffect } from 'react';
import { render, waitFor, act } from '@testing-library/react';

const mockGithubApi = {
  __esModule: true,
  loadRememberPreference: jest.fn(),
  loadGithubCredentials: jest.fn(),
  saveGithubCredentials: jest.fn(),
  clearGithubCredentials: jest.fn(),
  refreshGithubAccessToken: jest.fn(),
  saveRememberPreference: jest.fn(),
};

jest.mock('../../apis/GitHubAPI', () => mockGithubApi);

const mockLifecycle = {
  __esModule: true,
  ensureValidGithubCredentials: jest.fn(),
};

jest.mock('../githubCredentialLifecycle', () => mockLifecycle);

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
  refreshGithubAccessToken: mockRefreshGithubAccessToken,
  saveRememberPreference: mockSaveRememberPreference,
} = mockGithubApi;

const { ensureValidGithubCredentials: mockEnsureValidGithubCredentials } = mockLifecycle;
const { persistGithubCredentials: mockPersistGithubCredentials } = mockPersistence;

const emptyCredentials = {
  token: null,
  refreshToken: null,
  tokenExpiry: null,
  refreshTokenExpiry: null,
  user: null,
};

const createCredentialPayload = (overrides = {}) => ({
  token: 'access-token',
  refreshToken: 'refresh-token',
  tokenExpiry: '2025-01-01T00:00:00.000Z',
  refreshTokenExpiry: '2025-02-01T00:00:00.000Z',
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
    mockLoadGithubCredentials.mockImplementation(async (options) => {
      if (options?.persistent) {
        return { ...emptyCredentials };
      }
      return { ...emptyCredentials };
    });

    mockEnsureValidGithubCredentials.mockImplementation(async (credentials) => credentials ?? { ...emptyCredentials });
    mockPersistGithubCredentials.mockResolvedValue(undefined);
    mockSaveGithubCredentials.mockResolvedValue(undefined);
    mockClearGithubCredentials.mockResolvedValue(undefined);
    mockRefreshGithubAccessToken.mockResolvedValue(undefined);
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
    expect(mockEnsureValidGithubCredentials).toHaveBeenCalledWith(
      expect.objectContaining(emptyCredentials),
      { persistent: false },
      expect.objectContaining({
        clearGithubCredentials: mockClearGithubCredentials,
        refreshGithubAccessToken: mockRefreshGithubAccessToken,
        saveGithubCredentials: mockSaveGithubCredentials,
      }),
    );
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
    expect(mockEnsureValidGithubCredentials).toHaveBeenCalledWith(
      sessionCredentials,
      { persistent: false },
      expect.any(Object),
    );
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

