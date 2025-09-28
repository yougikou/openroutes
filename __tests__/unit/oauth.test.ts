import { MemorySessionStateStore } from '../../src/github/sessionStore';
import { GitHubOAuth, DeviceFlowSlowDownError, DeviceFlowPendingError } from '../../src/github/oauth';
import { InMemorySecureStorage } from '../../src/github/storage';
import type { DeviceFlowStart, OAuthConfig } from '../../src/github/types';

const config: OAuthConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'https://example.com/callback',
  defaultScopes: ['read:user'],
};

const createResponse = (status: number, body: any) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-OAuth-Scopes': 'read:user' },
  });

describe('GitHubOAuth', () => {
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.useRealTimers();
  });

  it('returns device flow when no browser is available', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      createResponse(200, {
        device_code: 'device-code',
        user_code: 'user-code',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5,
      })
    );
    const oauth = new GitHubOAuth({
      config,
      storage: new InMemorySecureStorage(),
      sessionStore: new MemorySessionStateStore(),
      fetchImpl: fetchMock,
    });
    const start = await oauth.startAuthorization({ browserAvailable: false });
    expect(start.flow).toBe('device');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('validates state during authorization code callback', async () => {
    const oauth = new GitHubOAuth({
      config,
      storage: new InMemorySecureStorage(),
      sessionStore: new MemorySessionStateStore(),
      fetchImpl: jest.fn(),
    });
    await expect(oauth.handleAuthorizationCodeCallback('code', 'invalid')).rejects.toThrow('State 校验失败');
  });

  it('exchanges authorization code and stores account', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(createResponse(200, { access_token: 'token', token_type: 'bearer', scope: 'read:user' }))
      .mockResolvedValueOnce(createResponse(200, { id: 1, login: 'demo', avatar_url: 'https://avatar' }));
    const storage = new InMemorySecureStorage();
    const sessionStore = new MemorySessionStateStore();
    const oauth = new GitHubOAuth({ config, storage, sessionStore, fetchImpl: fetchMock });
    await sessionStore.setState('state', Date.now() + 10_000);
    const result = await oauth.handleAuthorizationCodeCallback('code', 'state');
    expect(result.user.login).toBe('demo');
    const account = await storage.getAccount();
    expect(account?.login).toBe('demo');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('handles device flow pending and success', async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(createResponse(200, { error: 'authorization_pending' }))
      .mockResolvedValueOnce(createResponse(200, { access_token: 'token', token_type: 'bearer', scope: 'read:user' }))
      .mockResolvedValueOnce(createResponse(200, { id: 1, login: 'demo', avatar_url: 'avatar' }));
    const storage = new InMemorySecureStorage();
    const oauth = new GitHubOAuth({ config, storage, sessionStore: new MemorySessionStateStore(), fetchImpl: fetchMock });
    const start: DeviceFlowStart = {
      flow: 'device',
      deviceCode: 'device',
      userCode: 'user',
      verificationUri: 'https://github.com/login/device',
      expiresIn: 600,
      interval: 1,
      scopes: ['read:user'],
    };
    const promise = oauth.waitForDeviceToken(start);
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(1000);
    const result = await promise;
    expect(result.user.login).toBe('demo');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws specialized errors for device flow edge cases', async () => {
    const pendingFetch = jest.fn().mockResolvedValue(createResponse(200, { error: 'authorization_pending' }));
    const oauthPending = new GitHubOAuth({ config, storage: new InMemorySecureStorage(), sessionStore: new MemorySessionStateStore(), fetchImpl: pendingFetch });
    await expect((oauthPending as any).exchangeDeviceCode('device')).rejects.toBeInstanceOf(DeviceFlowPendingError);

    const slowFetch = jest.fn().mockResolvedValue(createResponse(200, { error: 'slow_down' }));
    const oauthSlow = new GitHubOAuth({ config, storage: new InMemorySecureStorage(), sessionStore: new MemorySessionStateStore(), fetchImpl: slowFetch });
    await expect((oauthSlow as any).exchangeDeviceCode('device')).rejects.toBeInstanceOf(DeviceFlowSlowDownError);

    const expiredFetch = jest.fn().mockResolvedValue(createResponse(200, { error: 'expired_token' }));
    const oauthExpired = new GitHubOAuth({ config, storage: new InMemorySecureStorage(), sessionStore: new MemorySessionStateStore(), fetchImpl: expiredFetch });
    await expect((oauthExpired as any).exchangeDeviceCode('device')).rejects.toThrow('设备码过期');

    const deniedFetch = jest.fn().mockResolvedValue(createResponse(200, { error: 'access_denied' }));
    const oauthDenied = new GitHubOAuth({ config, storage: new InMemorySecureStorage(), sessionStore: new MemorySessionStateStore(), fetchImpl: deniedFetch });
    await expect((oauthDenied as any).exchangeDeviceCode('device')).rejects.toThrow('用户拒绝了授权请求');
  });
});
