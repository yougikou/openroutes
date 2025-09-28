import { GitHubClient } from '../../src/github/client';
import { InMemorySecureStorage } from '../../src/github/storage';
import type { StoredAccount } from '../../src/github/types';

declare const process: NodeJS.Process;

const token = process.env.GITHUB_TEST_TOKEN;

(token ? describe : describe.skip)('GitHub integration', () => {
  const storage = new InMemorySecureStorage();
  const account: StoredAccount = {
    userId: Number(process.env.GITHUB_TEST_USER_ID || '0'),
    login: process.env.GITHUB_TEST_LOGIN || 'integration',
    avatarUrl: '',
    accessToken: token!,
    scopes: (process.env.GITHUB_TEST_SCOPES || 'repo').split(',').map((s) => s.trim()),
    tokenType: 'token',
    createdAt: new Date().toISOString(),
  };

  beforeAll(async () => {
    await storage.saveAccount(account);
  });

  it('fetches current user and rate limits', async () => {
    const client = new GitHubClient({ storage });
    const who = await client.checkToken();
    expect(who.user.login).toBeTruthy();
    const limits = await client.checkRateLimit();
    expect(limits.core.limit).toBeGreaterThan(0);
  });
});
