import yaml from 'js-yaml';
import type { FeatureCollection } from 'geojson';
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
): Promise<RouteIssue[]> => {
  const owner = process.env.EXPO_PUBLIC_GITHUB_OWNER;
  const repo = process.env.EXPO_PUBLIC_GITHUB_REPO;

  if (!owner || !repo) {
    throw new Error('GitHub repository information is missing in environment variables.');
  }

  const searchParams = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    labels: 'route',
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const url = 'https://api.github.com/repos/' + owner + '/' + repo + '/issues?' + searchParams.toString();

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

    const rawData = (await response.json()) as GitHubIssue[];

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
  const owner = process.env.EXPO_PUBLIC_GITHUB_OWNER;
  const repo = process.env.EXPO_PUBLIC_GITHUB_REPO;

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
  const clientId = 'cd019fec05aa5b74ad81';
  const clientSecret = '51d66fda4e5184bcc7a4ceaf99f78a8cf3acb028';
  const redirectUri = 'https://yougikou.github.io/openroutes/githubauth';
  const proxyUrl = 'https://cors-anywhere.azm.workers.dev/';

  try {
    await deleteData('github_access_token');
    const response = await fetch(proxyUrl + 'https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body:
        'client_id=' +
        clientId +
        '&client_secret=' +
        clientSecret +
        '&code=' +
        code +
        '&redirect_uri=' +
        redirectUri,
    });

    const data = (await response.json()) as { access_token?: string };
    if (data.access_token) {
      await storeData('github_access_token', data.access_token);
    } else {
      console.error('No access token found in response:', data);
    }
  } catch (error) {
    console.error('Token exchange error:', error);
  }
};

export const uploadGeoJsonFile = async (geoJsonData: FeatureCollection): Promise<string> => {
  const geoJsonBlob = new Blob([JSON.stringify(geoJsonData)], { type: 'application/json' });
  return uploadToFileIO(geoJsonBlob, 'geojson.json');
};

export const uploadImgFile = async (base64Data: string): Promise<string> => {
  return uploadImgToImgur(base64Data);
};

const uploadToFileIO = async (fileBlob: Blob, fileName: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('expires', '1d');
    formData.append('maxDownloads', '1');
    formData.append('autoDelete', 'true');

    const response = await fetch('https://file.io/', {
      method: 'POST',
      body: formData,
    });
    const resJson = (await response.json()) as { link: string };
    return resJson.link;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
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
