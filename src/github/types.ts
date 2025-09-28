import type { Logger } from './logger';

export type AuthFlow = 'auth_code' | 'device';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  defaultScopes: string[];
  allowPrivateRepo?: boolean;
}

export interface AuthorizationOptions {
  scopes?: string[];
  forceFlow?: AuthFlow;
  state?: string;
  browserAvailable?: boolean;
}

export interface AuthCodeStart {
  flow: 'auth_code';
  authorizationUrl: string;
  state: string;
  scopes: string[];
}

export interface DeviceFlowStart {
  flow: 'device';
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresIn: number;
  interval: number;
  scopes: string[];
}

export type AuthorizationStart = AuthCodeStart | DeviceFlowStart;

export interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface DeviceTokenResponse extends TokenResponse {}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

export interface StoredAccount {
  userId: number;
  login: string;
  avatarUrl: string;
  accessToken: string;
  scopes: string[];
  tokenType: string;
  createdAt: string;
}

export interface SecureStorage {
  saveAccount(account: StoredAccount): Promise<void>;
  getAccount(): Promise<StoredAccount | null>;
  clear(): Promise<void>;
}

export interface SessionStateStore {
  setState(state: string, expiresAt: number): Promise<void>;
  consumeState(state: string): Promise<boolean>;
}

export interface FetchLike {
  (input: RequestInfo, init?: RequestInit): Promise<Response>;
}

export interface RetryOptions {
  retries: number;
  factor: number;
  minTimeout: number;
  maxTimeout: number;
}

export interface GitHubClientOptions {
  storage: SecureStorage;
  fetchImpl?: FetchLike;
  logger?: Logger;
}

export interface ListIssuesQuery {
  state?: 'open' | 'closed' | 'all';
  labels?: string;
  milestone?: string;
  assignee?: string;
  creator?: string;
  mentioned?: string;
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  since?: string;
}

export interface CreateIssueInput {
  title: string;
  body?: string;
  labels?: string[];
}

export interface GitHubPermissions {
  admin: boolean;
  maintain: boolean;
  push: boolean;
  triage: boolean;
  pull: boolean;
}

export interface RepoAccessCheck {
  hasRead: boolean;
  hasWrite: boolean;
}

export interface RateLimitInfo {
  core: { limit: number; remaining: number; reset: number };
  search: { limit: number; remaining: number; reset: number };
  graphql?: { limit: number; remaining: number; reset: number };
}

export interface GitHubHealth {
  tokenValid: boolean;
  scopes: string[];
  rateLimit: RateLimitInfo;
  repoAccess?: RepoAccessCheck;
}

export interface GitHubClientHealth {
  checkToken(): Promise<{ user: GitHubUser; scopes: string[] }>; 
  checkRateLimit(): Promise<RateLimitInfo>;
  checkRepoAccess(owner: string, repo: string): Promise<RepoAccessCheck>;
}

export interface AuthorizationSuccess {
  account: StoredAccount;
  rawToken: TokenResponse;
  user: GitHubUser;
}

export interface OAuthLoggerContext {
  flow: AuthFlow;
  scopes: string[];
}

