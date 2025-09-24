const persistGithubCredentials = async (
  credentials,
  shouldPersist,
  { saveGithubCredentials, clearGithubCredentials },
) => {
  const persistent = Boolean(shouldPersist);
  const targetOptions = { persistent };
  const oppositeOptions = { persistent: !persistent };

  if (typeof saveGithubCredentials === 'function') {
    await saveGithubCredentials(credentials, targetOptions);
  }

  if (typeof clearGithubCredentials === 'function') {
    await clearGithubCredentials(oppositeOptions);
  }
};

export { persistGithubCredentials };
