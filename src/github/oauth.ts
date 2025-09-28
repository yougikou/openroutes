import { randomBytes } from 'crypto';
import { z } from 'zod';
import { loadConfig } from './config';
import { consoleLogger } from './logger';
import { createSecureStorage } from './storage';
import { createSessionStore } from './sessionStore';
import type {
  AuthFlow,
  AuthCodeStart,
  AuthorizationOptions,
  AuthorizationStart,
  AuthorizationSuccess,
  DeviceFlowStart,
  FetchLike,
  GitHubUser,
  OAuthConfig,
  SecureStorage,
  SessionStateStore,
  TokenResponse,
} from './types';

const AUTHORIZATION_URL = 'https://github.com/login/oauth/authorize';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const DEVICE_CODE_URL = 'https://github.com/login/device/code';

const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  scope: z.string().default(''),
});

const deviceCodeSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string(),
  verification_uri_complete: z.string().optional(),
  expires_in: z.number(),
  interval: z.number().optional().default(5),
});

const deviceErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

const hasWindow = () => typeof window !== 'undefined';
const defaultFetch: FetchLike = (...args) => fetch(...args);

const joinScopes = (scopes: string[]) => Array.from(new Set(scopes.filter(Boolean))).join(' ');

const parseScopes = (scope: string | null | undefined) =>
  scope ? scope.split(',').map((item) => item.trim()).filter(Boolean) : [];

const browserAvailable = () => hasWindow() && typeof window.location !== 'undefined';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

/**
 * High-level orchestrator for GitHub OAuth flows (authorization code & device flow).
 * Inject custom storage/session/fetch implementations to adapt for web, mobile or CLI environments.
 *
 * @example
 * const storage = createSecureStorage();
 * const oauth = new GitHubOAuth({ storage });
 * const start = await oauth.startAuthorization();
 */
export class GitHubOAuth {
  private readonly config: OAuthConfig;

  private readonly storage: SecureStorage;

  private readonly sessionStore: SessionStateStore;

  private readonly fetchImpl: FetchLike;

  constructor({
    config = loadConfig(),
    storage = createSecureStorage(),
    sessionStore = createSessionStore(),
    fetchImpl = defaultFetch,
  }: {
    config?: OAuthConfig;
    storage?: SecureStorage;
    sessionStore?: SessionStateStore;
    fetchImpl?: FetchLike;
  } = {}) {
    this.config = config;
    this.storage = storage;
    this.sessionStore = sessionStore;
    this.fetchImpl = fetchImpl;
  }

  /**
   * Start the authorization flow. Automatically selects the best flow unless `forceFlow` is provided.
   *
   * @param options Flow hints (scopes override, forceFlow, browser availability).
   * @returns Authorization payload describing the chosen flow.
   */
  async startAuthorization(options: AuthorizationOptions = {}): Promise<AuthorizationStart> {
    const scopes = this.resolveScopes(options.scopes);
    const flow = this.pickFlow(options);
    consoleLogger.info('Starting GitHub authorization', { flow, scopes });
    if (flow === 'auth_code') {
      return this.startAuthCodeFlow(scopes, options.state);
    }
    return this.startDeviceFlow(scopes);
  }

  private resolveScopes(scopes?: string[]): string[] {
    const merged = scopes && scopes.length > 0 ? scopes : this.config.defaultScopes;
    if (this.config.allowPrivateRepo && !merged.includes('repo')) {
      return [...new Set([...merged, 'repo'])];
    }
    return [...new Set(merged)];
  }

  private pickFlow(options: AuthorizationOptions): AuthFlow {
    if (options.forceFlow) {
      return options.forceFlow;
    }
    const hasBrowser = options.browserAvailable ?? browserAvailable();
    return hasBrowser ? 'auth_code' : 'device';
  }

  private async startAuthCodeFlow(scopes: string[], providedState?: string): Promise<AuthCodeStart> {
    const state = providedState ?? randomBytes(16).toString('hex');
    await this.sessionStore.setState(state, Date.now() + 10 * 60 * 1000);
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: joinScopes(scopes),
      state,
      allow_signup: 'false',
    });
    consoleLogger.info('Generated authorization URL', { scopes });
    return {
      flow: 'auth_code',
      authorizationUrl: `${AUTHORIZATION_URL}?${params.toString()}`,
      state,
      scopes,
    };
  }

  private async startDeviceFlow(scopes: string[]): Promise<DeviceFlowStart> {
    const response = await this.fetchImpl(DEVICE_CODE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        scope: joinScopes(scopes),
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to start device authorization: ${response.status}`);
    }
    const payload = await response.json();
    const parsed = deviceCodeSchema.parse(payload);
    consoleLogger.info('Device authorization initialized', {
      scopes,
      interval: parsed.interval,
      expiresIn: parsed.expires_in,
    });
    return {
      flow: 'device',
      deviceCode: parsed.device_code,
      userCode: parsed.user_code,
      verificationUri: parsed.verification_uri,
      verificationUriComplete: parsed.verification_uri_complete,
      expiresIn: parsed.expires_in,
      interval: parsed.interval,
      scopes,
    };
  }

  /**
   * Complete the authorization-code flow after GitHub redirects back with `code` and `state`.
   *
   * @param code GitHub-provided authorization code.
   * @param state State returned by GitHub, validated against the locally stored value.
   * @returns Authorized account, raw token payload and user profile.
   */
  async handleAuthorizationCodeCallback(code: string, state: string): Promise<AuthorizationSuccess> {
    const valid = await this.sessionStore.consumeState(state);
    if (!valid) {
      throw new Error('State 校验失败，可能存在 CSRF 风险');
    }
    const token = await this.exchangeAuthCode(code);
    return this.finalizeAuthorization(token);
  }

  private async exchangeAuthCode(code: string): Promise<TokenResponse> {
    const response = await this.fetchImpl(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to exchange authorization code: ${response.status}`);
    }
    const payload = await response.json();
    if ('error' in payload) {
      throw new Error(payload.error_description || '授权失败');
    }
    return tokenResponseSchema.parse(payload);
  }

  /**
   * Poll the device-flow endpoint until GitHub issues a token.
   * Handles `authorization_pending`, `slow_down`, `expired_token` and `access_denied` cases.
   *
   * @param start Device flow descriptor returned by {@link startAuthorization}.
   * @param abortSignal Optional signal to cancel polling (e.g. CTRL+C).
   */
  async waitForDeviceToken(start: DeviceFlowStart, abortSignal?: AbortSignal): Promise<AuthorizationSuccess> {
    const startedAt = Date.now();
    let interval = start.interval * 1000;
    while (Date.now() - startedAt < start.expiresIn * 1000) {
      if (abortSignal?.aborted) {
        throw new Error('授权已取消');
      }
      await sleep(interval);
      try {
        const token = await this.exchangeDeviceCode(start.deviceCode);
        return this.finalizeAuthorization(token);
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        if (error instanceof DeviceFlowPendingError) {
          continue;
        }
        if (error instanceof DeviceFlowSlowDownError) {
          interval = Math.min(interval + 5000, 30000);
          continue;
        }
        throw error;
      }
    }
    throw new Error('设备码已过期，请重新开始授权');
  }

  private async exchangeDeviceCode(deviceCode: string): Promise<TokenResponse> {
    const response = await this.fetchImpl(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const payload = await response.json();
    if (payload.error) {
      const parsed = deviceErrorSchema.parse(payload);
      switch (parsed.error) {
        case 'authorization_pending':
          throw new DeviceFlowPendingError(parsed.error_description || '等待用户完成授权');
        case 'slow_down':
          throw new DeviceFlowSlowDownError(parsed.error_description || '轮询过快，请稍后重试');
        case 'expired_token':
          throw new Error('设备码过期，请重新开始授权');
        case 'access_denied':
          throw new Error('用户拒绝了授权请求');
        default:
          throw new Error(parsed.error_description || parsed.error);
      }
    }
    return tokenResponseSchema.parse(payload);
  }

  private async finalizeAuthorization(token: TokenResponse): Promise<AuthorizationSuccess> {
    const scopes = parseScopes(token.scope);
    const userResponse = await this.fetchImpl('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `${token.token_type} ${token.access_token}`,
      },
    });
    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user profile: ${userResponse.status}`);
    }
    const user: GitHubUser = await userResponse.json();
    const headerScopes = parseScopes(userResponse.headers.get('x-oauth-scopes'));
    const finalScopes = headerScopes.length > 0 ? headerScopes : scopes;
    consoleLogger.info('Token issued', { scopes: finalScopes });
    const account = {
      userId: user.id,
      login: user.login,
      avatarUrl: user.avatar_url,
      accessToken: token.access_token,
      scopes: finalScopes,
      tokenType: token.token_type,
      createdAt: new Date().toISOString(),
    };
    await this.storage.saveAccount(account);
    return { account, rawToken: token, user };
  }

  /**
   * Load the currently stored account information.
   */
  async getCurrentAccount() {
    return this.storage.getAccount();
  }

  /**
   * Clear local storage without revoking the remote token.
   */
  async signOut() {
    await this.storage.clear();
  }

  /**
   * Revoke the stored token via GitHub API and clear local storage.
   */
  async revokeToken(): Promise<void> {
    const account = await this.storage.getAccount();
    if (!account) {
      return;
    }
    const response = await this.fetchImpl(`https://api.github.com/applications/${this.config.clientId}/grant`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: account.accessToken }),
    });
    if (response.status === 404) {
      consoleLogger.warn('Token already revoked or unknown to application');
    }
    await this.storage.clear();
  }
}

class DeviceFlowPendingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceFlowPendingError';
  }
}

class DeviceFlowSlowDownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceFlowSlowDownError';
  }
}

export { DeviceFlowPendingError, DeviceFlowSlowDownError };

