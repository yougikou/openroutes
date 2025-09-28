import { InMemorySecureStorage } from '../../src/github/storage';

const sampleAccount = {
  userId: 1,
  login: 'demo',
  avatarUrl: 'avatar',
  accessToken: 'token',
  scopes: ['read:user'],
  tokenType: 'bearer',
  createdAt: new Date().toISOString(),
};

describe('InMemorySecureStorage', () => {
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('saves and retrieves account', async () => {
    const storage = new InMemorySecureStorage();
    await storage.saveAccount(sampleAccount);
    const result = await storage.getAccount();
    expect(result).toEqual(sampleAccount);
    await storage.clear();
    expect(await storage.getAccount()).toBeNull();
  });
});

