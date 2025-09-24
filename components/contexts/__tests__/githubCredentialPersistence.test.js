import { persistGithubCredentials } from '../githubCredentialPersistence';

describe('githubCredentialPersistence.persistGithubCredentials', () => {
  let dependencies;

  beforeEach(() => {
    dependencies = {
      saveGithubCredentials: jest.fn().mockResolvedValue(undefined),
      clearGithubCredentials: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('stores credentials in persistent storage when persistence is enabled', async () => {
    const credentials = { token: 'token', user: { id: 1 } };

    await persistGithubCredentials(credentials, true, dependencies);

    expect(dependencies.saveGithubCredentials).toHaveBeenCalledWith(credentials, { persistent: true });
    expect(dependencies.clearGithubCredentials).toHaveBeenCalledWith({ persistent: false });
  });

  it('stores credentials in session storage when persistence is disabled', async () => {
    const credentials = { token: 'token', user: { id: 1 } };

    await persistGithubCredentials(credentials, false, dependencies);

    expect(dependencies.saveGithubCredentials).toHaveBeenCalledWith(credentials, { persistent: false });
    expect(dependencies.clearGithubCredentials).toHaveBeenCalledWith({ persistent: true });
  });
});
