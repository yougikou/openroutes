export const convertBlobUrlToRawUrl = (githubBlobUrl: string): string => {
  if (githubBlobUrl.includes('/blob/')) {
    return githubBlobUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  return githubBlobUrl;
};
