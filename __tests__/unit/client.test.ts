import { GitHubClient } from '../../src/github/client';
import { InMemorySecureStorage } from '../../src/github/storage';
import { TokenRevokedError, InsufficientScopeError, ResourceNotFoundError, ValidationError } from '../../src/github/errors';

const account = {
  userId: 1,
  login: 'demo',
  avatarUrl: 'avatar',
  accessToken: 'token',
  scopes: ['read:user'],
  tokenType: 'token',
  createdAt: new Date().toISOString(),
};

const jsonResponse = (status: number, body: any) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('GitHubClient', () => {
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const setup = async (responses: Response[]) => {
    const fetchMock = jest.fn();
    responses.forEach((response) => fetchMock.mockResolvedValueOnce(response));
    const storage = new InMemorySecureStorage();
    await storage.saveAccount(account);
    return { client: new GitHubClient({ storage, fetchImpl: fetchMock }), fetchMock };
  };

  it('adds authorization header on requests', async () => {
    const { client, fetchMock } = await setup([
      jsonResponse(200, []),
    ]);
    await client.listRepos();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/user/repos'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `${account.tokenType} ${account.accessToken}` }),
      })
    );
  });

  it('retries on 500 errors', async () => {
    const { client, fetchMock } = await setup([
      jsonResponse(500, { message: 'server error' }),
      jsonResponse(200, []),
    ]);
    await client.listRepos();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws TokenRevokedError on 401', async () => {
    const { client } = await setup([
      jsonResponse(401, { message: 'Bad credentials' }),
    ]);
    await expect(client.listRepos()).rejects.toBeInstanceOf(TokenRevokedError);
  });

  it('throws InsufficientScopeError on 403 integration error', async () => {
    const { client } = await setup([
      jsonResponse(403, { message: 'Resource not accessible by integration' }),
    ]);
    await expect(client.listRepos()).rejects.toBeInstanceOf(InsufficientScopeError);
  });

  it('throws ResourceNotFoundError on 404', async () => {
    const { client } = await setup([
      jsonResponse(404, { message: 'Not Found' }),
    ]);
    await expect(client.listRepos()).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it('throws ValidationError on 422', async () => {
    const { client } = await setup([
      jsonResponse(422, { message: 'Validation Failed', errors: [{ field: 'title' }] }),
    ]);
    await expect(client.createIssue('owner', 'repo', { title: '' })).rejects.toBeInstanceOf(ValidationError);
  });
});
