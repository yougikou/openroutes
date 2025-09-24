import {
  emptyGithubCredentials,
  ensureValidGithubCredentials,
  sanitiseGithubCredentials,
} from '../githubCredentialLifecycle';

describe('githubCredentialLifecycle.ensureValidGithubCredentials', () => {
  const now = new Date('2025-01-01T00:00:00.000Z').valueOf();
  let dependencies;
  let consoleErrorSpy;
  let dateNowSpy;

  beforeEach(() => {
    dependencies = {
      clearGithubCredentials: jest.fn().mockResolvedValue(undefined),
      refreshGithubAccessToken: jest.fn(),
      saveGithubCredentials: jest.fn().mockResolvedValue(undefined),
    };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns sanitised credentials when token or user information is missing', async () => {
    const credentials = { user: { id: 123 } };
    const result = await ensureValidGithubCredentials(credentials, { persistent: false }, dependencies);

    expect(result).toEqual(sanitiseGithubCredentials(credentials));
    expect(dependencies.clearGithubCredentials).not.toHaveBeenCalled();
    expect(dependencies.refreshGithubAccessToken).not.toHaveBeenCalled();
    expect(dependencies.saveGithubCredentials).not.toHaveBeenCalled();
  });

  it('clears session credentials when the token has expired', async () => {
    const credentials = {
      token: 'expired-token',
      user: { id: 1 },
      tokenExpiry: '2024-12-31T23:59:59.000Z',
    };

    const result = await ensureValidGithubCredentials(credentials, { persistent: false }, dependencies);

    expect(dependencies.clearGithubCredentials).toHaveBeenCalledWith({ persistent: false });
    expect(result).toEqual(emptyGithubCredentials);
  });

  it('refreshes persistent credentials when the access token is expired but the refresh token is valid', async () => {
    const credentials = {
      token: 'expired-token',
      refreshToken: 'refresh-token',
      tokenExpiry: '2024-12-30T00:00:00.000Z',
      refreshTokenExpiry: '2025-02-01T00:00:00.000Z',
      user: { id: 2 },
    };

    dependencies.refreshGithubAccessToken.mockResolvedValue({
      accessToken: 'new-token',
      refreshToken: 'new-refresh-token',
      expiresAt: '2025-01-02T00:00:00.000Z',
      refreshTokenExpiresAt: '2025-03-01T00:00:00.000Z',
    });

    const result = await ensureValidGithubCredentials(credentials, { persistent: true }, dependencies);

    expect(dependencies.refreshGithubAccessToken).toHaveBeenCalledWith('refresh-token');
    expect(dependencies.saveGithubCredentials).toHaveBeenCalledWith({
      token: 'new-token',
      refreshToken: 'new-refresh-token',
      tokenExpiry: '2025-01-02T00:00:00.000Z',
      refreshTokenExpiry: '2025-03-01T00:00:00.000Z',
      user: { id: 2 },
    }, { persistent: true });
    expect(result).toEqual({
      token: 'new-token',
      refreshToken: 'new-refresh-token',
      tokenExpiry: '2025-01-02T00:00:00.000Z',
      refreshTokenExpiry: '2025-03-01T00:00:00.000Z',
      user: { id: 2 },
    });
  });

  it('clears persistent credentials when refreshing the token fails', async () => {
    const credentials = {
      token: 'expired-token',
      refreshToken: 'refresh-token',
      tokenExpiry: '2024-12-01T00:00:00.000Z',
      refreshTokenExpiry: '2025-02-01T00:00:00.000Z',
      user: { id: 3 },
    };

    dependencies.refreshGithubAccessToken.mockRejectedValue(new Error('network error'));

    const result = await ensureValidGithubCredentials(credentials, { persistent: true }, dependencies);

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(dependencies.clearGithubCredentials).toHaveBeenCalledWith({ persistent: true });
    expect(result).toEqual(emptyGithubCredentials);
  });

  it('clears persistent credentials when the refresh token has expired', async () => {
    const credentials = {
      token: 'expired-token',
      refreshToken: 'refresh-token',
      tokenExpiry: '2024-12-01T00:00:00.000Z',
      refreshTokenExpiry: '2024-12-15T00:00:00.000Z',
      user: { id: 4 },
    };

    const result = await ensureValidGithubCredentials(credentials, { persistent: true }, dependencies);

    expect(dependencies.refreshGithubAccessToken).not.toHaveBeenCalled();
    expect(dependencies.clearGithubCredentials).toHaveBeenCalledWith({ persistent: true });
    expect(result).toEqual(emptyGithubCredentials);
  });
});
