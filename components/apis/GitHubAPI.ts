import yaml from 'js-yaml';
import type { FeatureCollection } from 'geojson';
import { Platform } from 'react-native';
import { deleteData, storeData } from './StorageAPI';

interface IssueAttachment {
  type?: string;
  uri?: string;
}

interface IssueLabel {
  id: number;
  name: string;
  description: string | null;
}

interface IssueUser {
  login: string;
  id: number;
  avatar_url: string;
}

interface IssueReactions {
  total_count: number;
  '+1': number;
  '-1': number;
  laugh: number;
  hooray: number;
  confused: number;
  heart: number;
  rocket: number;
  eyes: number;
}

interface GitHubIssue {
  comments: number;
  comments_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  id: number;
  number: number;
  state: string;
  title: string;
  body: string;
  user: IssueUser;
  labels: IssueLabel[];
  reactions: IssueReactions;
}

interface RouteMetadata {
  distance_km?: number | string;
  duration_hour?: number | string;
  description?: string;
  coverimg?: string;
  geojson?: string;
}

export interface RouteIssue {
  distance?: number | string;
  duration?: number | string;
  description?: string;
  coverimg: IssueAttachment;
  geojson: IssueAttachment;
  comments_url: string;
  id: number;
  number: number;
  title: string;
  user: IssueUser;
  labels: IssueLabel[];
  state: string;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  body: string;
  reactions: IssueReactions;
}

export interface RouteDraft {
  name: string;
  type: string;
  difficulty: string;
  date: Date;
  distance_km: number | string | null;
  duration_hour: number | string | null;
  description: string | null;
  coverimg: string | null;
  geojson: string;
}

export interface RouteFilters {
  [key: string]: string | number | undefined;
}

interface GitHubRelease {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  tag_name: string;
  target_commitish: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
}

interface GitHubReleaseAsset {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label: string | null;
  uploader: IssueUser;
  content_type: string;
  state: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}

const fallbackRepoInfo = {
  owner: 'yougikou',
  repo: 'yougikou.github.io',
};

const resolveRepoInfo = () => {
  const owner = process.env.EXPO_PUBLIC_GITHUB_OWNER || fallbackRepoInfo.owner;
  const repo = process.env.EXPO_PUBLIC_GITHUB_REPO || fallbackRepoInfo.repo;
  return { owner, repo };
};

const parseAttachFile = (text?: string | null): IssueAttachment => {
  if (!text) {
    return {};
  }

  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;
  const matches = pattern.exec(text);
  if (matches) {
    return {
      type: matches[1],
      uri: matches[2],
    };
  }
  return {};
};

const parseYaml = <T extends object>(yamlString?: string | null): T => {
  try {
    const parsed = yaml.load(yamlString ?? '');
    return (parsed as T) ?? ({} as T);
  } catch (error) {
    console.error(error);
    return {} as T;
  }
};

export const fetchIssues = async (
  page = 1,
  perPage = 10,
  filters: RouteFilters = {},
  token?: string | null,
  searchQuery?: string,
): Promise<RouteIssue[]> => {
  const { owner, repo } = resolveRepoInfo();

  if (!owner || !repo) {
    console.warn('GitHub repository information is missing in environment variables.');
    return [];
  }

  let url = '';
  const searchParams = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && key !== 'labels') {
      searchParams.append(key, String(value));
    }
  });

  if (searchQuery && searchQuery.trim().length > 0) {
    const q = `repo:${owner}/${repo} is:issue label:route ${searchQuery}`;
    searchParams.append('q', q);
    url = 'https://api.github.com/search/issues?' + searchParams.toString();
  } else {
    searchParams.append('labels', 'route');
    url = 'https://api.github.com/repos/' + owner + '/' + repo + '/issues?' + searchParams.toString();
  }

  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = 'token ' + token;
      headers.Accept = 'application/vnd.github.v3+json';
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('GitHub API responded with status ' + response.status);
    }

    let rawData: GitHubIssue[] = [];
    if (searchQuery && searchQuery.trim().length > 0) {
      const searchResult = (await response.json()) as { items: GitHubIssue[] };
      rawData = searchResult.items;
    } else {
      rawData = (await response.json()) as GitHubIssue[];
    }

    return rawData.map((issue) => {
      const bodyObj = parseYaml<RouteMetadata>(issue.body);
      return {
        distance: bodyObj.distance_km,
        duration: bodyObj.duration_hour,
        description: bodyObj.description,
        coverimg: parseAttachFile(bodyObj.coverimg),
        geojson: parseAttachFile(bodyObj.geojson),
        comments_url: issue.comments_url,
        id: issue.id,
        number: issue.number,
        title: issue.title,
        user: issue.user,
        labels: issue.labels
          .filter((label) => label.name !== 'route')
          .map((label) => ({
            id: label.id,
            name: label.name,
            description: label.description,
          })),
        state: issue.state,
        comments: issue.comments,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        closed_at: issue.closed_at,
        body: issue.body,
        reactions: issue.reactions,
      };
    });
  } catch (error) {
    console.error('Failed to fetch issues from GitHub:', error);
    throw error;
  }
};

export const createIssue = async (routeData: RouteDraft, token: string): Promise<unknown> => {
  const { owner, repo } = resolveRepoInfo();

  if (!owner || !repo) {
    throw new Error('GitHub repository information is missing in environment variables.');
  }

  if (!token) {
    throw new Error('GitHub token is required to create an issue.');
  }

  const coverImageMarkdown = routeData.coverimg ? '![img](' + routeData.coverimg + ')' : '';
  const geojsonMarkdown = '[file](' + routeData.geojson + ')';

  const year = routeData.date.getFullYear();
  const month = String(routeData.date.getMonth() + 1).padStart(2, '0');
  const day = String(routeData.date.getDate()).padStart(2, '0');

  const issueData = {
    title: year + '-' + month + '-' + day + ' ' + routeData.name,
    body: yaml.dump({
      name: routeData.name,
      date: routeData.date,
      distance_km: routeData.distance_km,
      duration_hour: routeData.duration_hour,
      description: routeData.description ?? '',
      coverimg: coverImageMarkdown,
      geojson: geojsonMarkdown,
    }),
    labels: [routeData.type, routeData.difficulty, 'route'],
  };

  const url = 'https://api.github.com/repos/' + owner + '/' + repo + '/issues';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'token ' + token,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(issueData),
  });

  const resJson = await response.json();
  return resJson;
};

export const exchangeToken = async (code: string): Promise<void> => {
  const workerUrl = 'https://github-auth-worker.yougikou.workers.dev/exchange-token';

  try {
    await deleteData('github_access_token');
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Worker responded with status ' + response.status);
    }

    const data = (await response.json()) as { access_token?: string; error?: string };

    if (data.error) {
      throw new Error(data.error);
    }

    if (data.access_token) {
      await storeData('github_access_token', data.access_token);
    } else {
      console.error('No access token found in response:', data);
      throw new Error('No access token received');
    }
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

const getOrCreateInboxRelease = async (token: string): Promise<GitHubRelease> => {
  const { owner, repo } = resolveRepoInfo();
  const tagName = 'inbox';

  // 1. Check if release exists
  const getUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tagName}`;
  const getResponse = await fetch(getUrl, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (getResponse.ok) {
    return (await getResponse.json()) as GitHubRelease;
  }

  if (getResponse.status !== 404) {
    throw new Error(`Failed to check for inbox release: ${getResponse.status}`);
  }

  // 2. Create release if not exists
  const createUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tag_name: tagName,
      name: 'Inbox',
      body: 'Storage for uploaded files.',
      draft: false,
      prerelease: false,
    }),
  });

  if (!createResponse.ok) {
    const errorBody = await createResponse.text();
    throw new Error(`Failed to create inbox release: ${createResponse.status} ${errorBody}`);
  }

  return (await createResponse.json()) as GitHubRelease;
};

const uploadAssetToRelease = async (
  token: string,
  uploadUrlTemplate: string,
  fileData: string | Blob,
  fileName: string,
  contentType: string
): Promise<string> => {
  // Remove the templated part {?name,label}
  const uploadUrl = uploadUrlTemplate.replace(/\{.*?\}/, '') + `?name=${encodeURIComponent(fileName)}`;

  let fetchUrl = uploadUrl;

  if (Platform.OS === 'web') {
    fetchUrl = 'https://github-auth-worker.yougikou.workers.dev/proxy-upload?url=' + encodeURIComponent(uploadUrl);
  }

  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': contentType,
      Accept: 'application/vnd.github.v3+json',
    },
    body: fileData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Failed to upload asset to ${uploadUrl}: ${response.status} ${errorBody}`);
    throw new Error(`Failed to upload asset: ${response.status} ${errorBody}`);
  }

  const asset = (await response.json()) as GitHubReleaseAsset;
  // browser_download_url is the permanent link
  return asset.browser_download_url;
};

export const uploadGeoJsonFile = async (
  geoJsonData: FeatureCollection,
  token: string,
  fileName: string
): Promise<string> => {
  const geoJsonString = JSON.stringify(geoJsonData);
  const release = await getOrCreateInboxRelease(token);
  return uploadAssetToRelease(token, release.upload_url, geoJsonString, fileName, 'application/json');
};

export const uploadImgFile = async (base64Data: string): Promise<string> => {
  return uploadImgToImgur(base64Data);
};

const uploadImgToImgur = async (base64Data: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('image', base64Data);

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        Authorization: 'Client-ID d429872aeaa174c',
        Accept: 'application/json',
      },
      body: formData,
    });
    const resJson = (await response.json()) as { data: { link: string } };
    return resJson.data.link;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};
