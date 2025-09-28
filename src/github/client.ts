import { consoleLogger } from './logger';
import { TokenRevokedError, InsufficientScopeError, ResourceNotFoundError, ValidationError, GitHubApiError } from './errors';
import type {
  CreateIssueInput,
  FetchLike,
  GitHubClientHealth,
  GitHubClientOptions,
  GitHubPermissions,
  GitHubUser,
  ListIssuesQuery,
  RateLimitInfo,
  RepoAccessCheck,
  RetryOptions,
  StoredAccount,
} from './types';

const API_BASE = 'https://api.github.com';

const defaultFetch: FetchLike = (...args) => fetch(...args);

const DEFAULT_RETRY: RetryOptions = {
  retries: 3,
  factor: 2,
  minTimeout: 500,
  maxTimeout: 4000,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isInsufficientScope = (payload: { message?: string }) =>
  payload.message?.includes('Resource not accessible by integration') ?? false;

const isValidationError = (status: number) => status === 422;

const isTokenInvalid = (status: number, payload: { message?: string }) =>
  status === 401 && (payload.message?.includes('Bad credentials') || payload.message?.includes('expired'));

const buildQuery = (query: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === 'undefined' || value === null || value === '') {
      return;
    }
    params.set(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : '';
};

/**
 * Thin wrapper around the GitHub REST API that automatically attaches the stored token
 * and converts common error codes into descriptive exceptions.
 */
export class GitHubClient implements GitHubClientHealth {
  private readonly fetchImpl: FetchLike;

  private readonly retry: RetryOptions;

  constructor(private readonly options: GitHubClientOptions) {
    this.fetchImpl = options.fetchImpl ?? defaultFetch;
    this.retry = DEFAULT_RETRY;
  }

  private async getAccount(): Promise<StoredAccount> {
    const account = await this.options.storage.getAccount();
    if (!account) {
      throw new Error('尚未完成 GitHub 授权');
    }
    return account;
  }

  private async request<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
    const account = await this.getAccount();
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
      Authorization: `${account.tokenType} ${account.accessToken}`,
      'User-Agent': 'openroutes-github-oauth',
      ...init.headers,
    };
    const response = await this.fetchImpl(`${API_BASE}${path}`, { ...init, headers });
    if (response.status >= 500 && attempt < this.retry.retries) {
      const delay = Math.min(this.retry.maxTimeout, this.retry.minTimeout * Math.pow(this.retry.factor, attempt));
      consoleLogger.warn('GitHub API 5xx，等待后重试', { path, attempt, delay });
      await sleep(delay);
      return this.request(path, init, attempt + 1);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as any) : {};
    if (response.ok) {
      consoleLogger.debug('GitHub API success', {
        path,
        remaining: response.headers.get('x-ratelimit-remaining'),
      });
      return payload as T;
    }
    if (isValidationError(response.status)) {
      throw new ValidationError(payload.message || '请求参数错误', payload.errors);
    }
    if (isInsufficientScope(payload)) {
      throw new InsufficientScopeError('scope 不足或仓库无权限', response.status);
    }
    if (isTokenInvalid(response.status, payload)) {
      throw new TokenRevokedError();
    }
    if (response.status === 404) {
      throw new ResourceNotFoundError(payload.message || '资源不存在');
    }
    throw new GitHubApiError(payload.message || 'GitHub API 调用失败', response.status, payload.documentation_url, payload.errors);
  }

  /**
   * List repositories available to the authenticated user.
   */
  async listRepos(): Promise<any> {
    return this.request('/user/repos?per_page=100');
  }

  /**
   * List issues inside a repository using GitHub's query parameters.
   */
  async listIssues(owner: string, repo: string, query: ListIssuesQuery = {}): Promise<any> {
    const qs = buildQuery(query as Record<string, string>);
    return this.request(`/repos/${owner}/${repo}/issues${qs}`);
  }

  /**
   * Create a new issue.
   */
  async createIssue(owner: string, repo: string, input: CreateIssueInput): Promise<any> {
    const body = JSON.stringify({ title: input.title, body: input.body, labels: input.labels });
    return this.request(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  /**
   * Add a comment to an existing issue.
   */
  async commentIssue(owner: string, repo: string, issueNumber: number, body: string): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
  }

  /**
   * Close an issue by number.
   */
  async closeIssue(owner: string, repo: string, issueNumber: number): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'closed' }),
    });
  }

  /**
   * Check that the stored token is valid and return the GitHub profile + scopes.
   */
  async checkToken(): Promise<{ user: GitHubUser; scopes: string[] }> {
    const payload = await this.request<GitHubUser>('/user');
    const account = await this.getAccount();
    return { user: payload, scopes: account.scopes };
  }

  /**
   * Inspect current rate limits.
   */
  async checkRateLimit(): Promise<RateLimitInfo> {
    const payload = await this.request<{ resources: RateLimitInfo }>('/rate_limit');
    const info = payload.resources;
    consoleLogger.info('GitHub Rate Limit', info.core);
    return info;
  }

  /**
   * Determine read/write access to a repository based on the permissions object.
   */
  async checkRepoAccess(owner: string, repo: string): Promise<RepoAccessCheck> {
    const repoData = await this.request<{ permissions: GitHubPermissions }>(`/repos/${owner}/${repo}`);
    return {
      hasRead: repoData.permissions.pull,
      hasWrite: repoData.permissions.push || repoData.permissions.maintain || repoData.permissions.admin,
    };
  }
}

/**
 * Factory helper for consumers that prefer functions over `new`.
 *
 * @example
 * const storage = createSecureStorage();
 * const client = createGitHubClient({ storage });
 * const issues = await client.listIssues('owner', 'repo', { state: 'open' });
 */
export const createGitHubClient = (options: GitHubClientOptions) => new GitHubClient(options);

