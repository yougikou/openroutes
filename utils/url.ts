export const convertBlobUrlToRawUrl = (githubBlobUrl: string): string => {
  return githubBlobUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
};
