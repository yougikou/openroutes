const emptyGithubCredentials = {
  token: null,
  refreshToken: null,
  tokenExpiry: null,
  refreshTokenExpiry: null,
  user: null,
};

const sanitiseGithubCredentials = (credentials) => ({
  token: credentials?.token ?? null,
  refreshToken: credentials?.refreshToken ?? null,
  tokenExpiry: credentials?.tokenExpiry ?? null,
  refreshTokenExpiry: credentials?.refreshTokenExpiry ?? null,
  user: credentials?.user ?? null,
});

const parseExpiry = (value) => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? NaN : parsed;
};

const ensureValidGithubCredentials = async (
  credentials,
  storageOptions = {},
  {
    clearGithubCredentials,
    refreshGithubAccessToken,
    saveGithubCredentials,
  },
) => {
  const sanitised = sanitiseGithubCredentials(credentials);

  if (!sanitised.token || !sanitised.user || !sanitised.user.id) {
    return sanitised;
  }

  const tokenExpiryTime = parseExpiry(sanitised.tokenExpiry);
  if (
    tokenExpiryTime === null ||
    Number.isNaN(tokenExpiryTime) ||
    tokenExpiryTime > Date.now()
  ) {
    return sanitised;
  }

  const persistent = Boolean(storageOptions?.persistent);

  if (!persistent) {
    if (typeof clearGithubCredentials === 'function') {
      await clearGithubCredentials(storageOptions);
    }
    return { ...emptyGithubCredentials };
  }

  const refreshExpiryTime = parseExpiry(sanitised.refreshTokenExpiry);
  if (
    !sanitised.refreshToken ||
    (refreshExpiryTime !== null &&
      !Number.isNaN(refreshExpiryTime) &&
      refreshExpiryTime <= Date.now())
  ) {
    if (typeof clearGithubCredentials === 'function') {
      await clearGithubCredentials(storageOptions);
    }
    return { ...emptyGithubCredentials };
  }

  try {
    const refreshed = await refreshGithubAccessToken(sanitised.refreshToken);
    const nextCredentials = {
      token: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? sanitised.refreshToken,
      tokenExpiry: refreshed.expiresAt ?? null,
      refreshTokenExpiry:
        refreshed.refreshTokenExpiresAt ?? sanitised.refreshTokenExpiry ?? null,
      user: sanitised.user,
    };

    if (typeof saveGithubCredentials === 'function') {
      await saveGithubCredentials(nextCredentials, storageOptions);
    }

    return nextCredentials;
  } catch (error) {
    console.error('Failed to refresh stored GitHub token:', error);
    if (typeof clearGithubCredentials === 'function') {
      await clearGithubCredentials(storageOptions);
    }
    return { ...emptyGithubCredentials };
  }
};

export {
  emptyGithubCredentials,
  sanitiseGithubCredentials,
  ensureValidGithubCredentials,
};
