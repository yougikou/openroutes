import yaml from 'js-yaml';
import { storeData, deleteData, readData } from "./StorageAPI";

function parseAttachFile(text) {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;
  const matches = pattern.exec(text);
  if (matches) {
    return {
      type: matches[1],
      uri: matches[2],
    };
  }
  return {};
}

const parseYaml = (yamlString) => {
  try {
    const obj = yaml.load(yamlString);
    return obj;
  } catch (e) {
    console.error(e);
    return {};
  }
};

const GITHUB_CLIENT_ID = 'cd019fec05aa5b74ad81';
const GITHUB_CLIENT_SECRET = '51d66fda4e5184bcc7a4ceaf99f78a8cf3acb028';
const GITHUB_REDIRECT_URI = 'https://yougikou.github.io/openroutes/githubauth';
const GITHUB_TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token';
const GITHUB_PROXY_URL = 'https://cors-anywhere.azm.workers.dev/';
const GITHUB_AUTH_STORAGE_KEY = 'github_auth';
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

const fetchIssues = async (page = 1, perPage = 10, filters = {}, token) => {
  const accessToken = typeof token === 'string' ? token : token?.accessToken;
  let url = `https://api.github.com/repos/${process.env.EXPO_PUBLIC_GITHUB_OWNER}/${process.env.EXPO_PUBLIC_GITHUB_REPO}/issues?page=${page}&per_page=${perPage}&labels=route`;
  Object.keys(filters).forEach(key => {
    url += `&${key}=${filters[key]}`;
  });

  try {
    var response = null;
    if(accessToken != null && accessToken.length > 0) {
      response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
    } else {
      response = await fetch(url);
    }

    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`);
    }
    const rawData = await response.json();
    // const rawData = mockData;

    const processedData = rawData.map(issue => {
      const bodyObj = parseYaml(issue.body);
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
        user: {
          login: issue.user.login,
          id: issue.user.id,
          avatar_url: issue.user.avatar_url
        },
        labels: issue.labels.filter(label => label.name !== 'route')
          .map(label => ({
            id: label.id,
            name: label.name,
            description: label.description
          })),
        state: issue.state,
        comments: issue.comments,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        closed_at: issue.closed_at,
        body: issue.body,
        reactions: {
          total_count: issue.reactions.total_count,
          "+1": issue.reactions["+1"],
          "-1": issue.reactions["-1"],
          laugh: issue.reactions.laugh,
          hooray: issue.reactions.hooray,
          confused: issue.reactions.confused,
          heart: issue.reactions.heart,
          rocket: issue.reactions.rocket,
          eyes: issue.reactions.eyes
        }
      }
    });

    return processedData;
  } catch (error) {
    console.error("Failed to fetch issues from GitHub:", error);
    throw error;
  }
};

const createIssue = async (routeData, token) => {
  const accessToken = typeof token === 'string' ? token : token?.accessToken;

  if (!accessToken) {
    throw new Error('GitHub access token is required to create an issue');
  }

  routeData.coverimg = routeData.coverimg?`![img](${routeData.coverimg})`:'';
  routeData.geojson = `[file](${routeData.geojson})`;

  const year = routeData.date.getFullYear();
  const month = String(routeData.date.getMonth() + 1).padStart(2, '0');
  const day = String(routeData.date.getDate()).padStart(2, '0');

  const issueData = {
    title: `${year}-${month}-${day} ${routeData.name}`,
    body: yaml.dump({
      name: routeData.name,
      date: routeData.date,
      distance_km: routeData.distance_km,
      duration_hour: routeData.duration_hour,
      description: routeData.description?routeData.description:"",
      coverimg: routeData.coverimg,
      geojson: routeData.geojson,
    }),
    labels: [routeData.type, routeData.difficulty, "route"]
  };

  const url = `https://api.github.com/repos/${process.env.EXPO_PUBLIC_GITHUB_OWNER}/${process.env.EXPO_PUBLIC_GITHUB_REPO}/issues`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(issueData)
  });

  // if (!response.ok) {
  //   throw new Error(`Error: ${response.status}`);
  // }

  const resJson = await response.json();
  return resJson;
}

const persistGithubAuth = async (authPayload) => {
  try {
    await storeData(GITHUB_AUTH_STORAGE_KEY, JSON.stringify(authPayload));
  } catch (error) {
    console.error('Failed to persist GitHub auth payload:', error);
    throw error;
  }
  return authPayload;
};

const getStoredGithubAuth = async () => {
  try {
    const raw = await readData(GITHUB_AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (error) {
    console.error('Failed to read GitHub auth payload:', error);
    return null;
  }
};

const clearGithubAuth = async () => {
  try {
    await deleteData(GITHUB_AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear GitHub auth payload:', error);
  }
};

const tokenRequest = async (params) => {
  const body = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    ...params,
  });

  if (params.grant_type !== 'refresh_token') {
    body.append('redirect_uri', GITHUB_REDIRECT_URI);
  }

  const response = await fetch(`${GITHUB_PROXY_URL}${GITHUB_TOKEN_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`GitHub token request failed with status ${response.status}`);
  }

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  const now = Date.now();
  const expiresIn = data.expires_in ? Number(data.expires_in) : null;
  const refreshTokenExpiresIn = data.refresh_token_expires_in ? Number(data.refresh_token_expires_in) : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    scope: data.scope,
    expiresAt: expiresIn ? now + expiresIn * 1000 : null,
    refreshTokenExpiresAt: refreshTokenExpiresIn ? now + refreshTokenExpiresIn * 1000 : null,
  };
};

const fetchGithubUser = async (accessToken) => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load GitHub user: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    login: data.login,
    avatarUrl: data.avatar_url,
    name: data.name,
  };
};

const exchangeToken = async (code) => {
  try {
    const tokenData = await tokenRequest({
      code,
      grant_type: 'authorization_code',
    });

    const user = await fetchGithubUser(tokenData.accessToken);

    return await persistGithubAuth({
      ...tokenData,
      user,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

const refreshGithubToken = async (currentAuth) => {
  if (!currentAuth?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const tokenData = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: currentAuth.refreshToken,
  });

  const user = await fetchGithubUser(tokenData.accessToken);

  return await persistGithubAuth({
    ...tokenData,
    user,
    updatedAt: Date.now(),
  });
};

const hasValidGithubCredentials = (auth) => {
  return Boolean(auth?.accessToken && auth?.user?.id);
};

const shouldRefreshGithubToken = (auth, thresholdMs = TOKEN_REFRESH_THRESHOLD_MS) => {
  if (!auth?.expiresAt) {
    return false;
  }

  return auth.expiresAt - Date.now() <= thresholdMs;
};

const ensureFreshGithubAuth = async () => {
  let auth = await getStoredGithubAuth();
  if (!auth) {
    return null;
  }

  if (shouldRefreshGithubToken(auth) && auth.refreshToken) {
    try {
      auth = await refreshGithubToken(auth);
    } catch (error) {
      console.error('Failed to refresh GitHub token:', error);
    }
  }

  return auth;
};


const uploadGeoJsonFile = async (geoJsonData) => {
  const geoJsonBlob = new Blob([JSON.stringify(geoJsonData)], { type: 'application/json' });
  return await uploadToFileIO(geoJsonBlob, 'geojson.json');
}

const uploadImgFile = async (base64Data) => {
  return await uploadImgToImgur(base64Data);
}

async function uploadToFileIO(fileBlob, fileName) {
  try {
    const formData = new FormData();
    formData.append('file', fileBlob, fileName)
    formData.append('expires', '1d');
    formData.append('maxDownloads', '1');
    formData.append('autoDelete', 'true');
    const response = await fetch(`https://file.io/`, {
      method: 'POST',
      body: formData,
    });
    const resJson = await response.json();
    return resJson.link
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

async function uploadImgToImgur(base64Data) {
  try {
    const formData = new FormData();
    formData.append('image', base64Data);
    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        Authorization: "Client-ID d429872aeaa174c",
        Accept: "application/json",
      },
      body: formData,
    });
    const resJson = await response.json();
    return resJson.data.link;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export {
  fetchIssues,
  createIssue,
  exchangeToken,
  refreshGithubToken,
  getStoredGithubAuth,
  clearGithubAuth,
  hasValidGithubCredentials,
  shouldRefreshGithubToken,
  ensureFreshGithubAuth,
  uploadGeoJsonFile,
  uploadImgFile,
};
