import yaml from 'js-yaml';
import { storeData, deleteData, readData } from "./StorageAPI";

const GITHUB_TOKEN_KEY = 'github_access_token';
const GITHUB_REFRESH_TOKEN_KEY = 'github_refresh_token';
const GITHUB_TOKEN_EXPIRY_KEY = 'github_access_token_expiry';
const GITHUB_REFRESH_TOKEN_EXPIRY_KEY = 'github_refresh_token_expiry';
const GITHUB_USER_KEY = 'github_user_profile';
const GITHUB_REMEMBER_PREFERENCE_KEY = 'github_token_persistence_preference';

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

const fetchIssues = async (page = 1, perPage = 10, filters = {}, token) => {
  let url = `https://api.github.com/repos/${process.env.EXPO_PUBLIC_GITHUB_OWNER}/${process.env.EXPO_PUBLIC_GITHUB_REPO}/issues?page=${page}&per_page=${perPage}&labels=route`;
  Object.keys(filters).forEach(key => {
    url += `&${key}=${filters[key]}`;
  });

  try {
    var response = null;
    if(token != null && token.length > 0) {
      response = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
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
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(issueData)
  });

  // if (!response.ok) {
  //   throw new Error(`Error: ${response.status}`);
  // }

  const resJson = await response.json();
  return resJson;
}

const clientId = 'cd019fec05aa5b74ad81';
const clientSecret = '51d66fda4e5184bcc7a4ceaf99f78a8cf3acb028';
const redirectUri = 'https://yougikou.github.io/openroutes/githubauth';
const proxyUrl = 'https://cors-anywhere.azm.workers.dev/';

const calculateExpiry = (seconds) => {
  if (!seconds || Number.isNaN(Number(seconds))) {
    return null;
  }
  const expiresAt = new Date(Date.now() + Number(seconds) * 1000);
  return expiresAt.toISOString();
};

const exchangeToken = async (cd) => {
  try {
    const response = await fetch(proxyUrl + 'https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: cd,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || data.error || 'Unknown error exchanging token');
    }

    if (data.access_token) {
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: calculateExpiry(data.expires_in),
        refreshTokenExpiresAt: calculateExpiry(data.refresh_token_expires_in),
        tokenType: data.token_type ?? null,
        scope: data.scope ?? null,
      };
    }
    throw new Error('No access token found in response');
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

const refreshGithubAccessToken = async (refreshToken) => {
  try {
    const response = await fetch(proxyUrl + 'https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || data.error || 'Unknown error refreshing token');
    }

    if (!data.access_token) {
      throw new Error('No access token found in refresh response');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: calculateExpiry(data.expires_in),
      refreshTokenExpiresAt: calculateExpiry(data.refresh_token_expires_in),
      tokenType: data.token_type ?? null,
      scope: data.scope ?? null,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

const fetchAuthenticatedUser = async (token) => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      login: data.login,
      avatar_url: data.avatar_url,
      name: data.name,
    };
  } catch (error) {
    console.error('Failed to fetch authenticated user:', error);
    throw error;
  }
};

const saveGithubCredentials = async (
  { token, user, refreshToken, tokenExpiry, refreshTokenExpiry },
  options = {},
) => {
  try {
    if (token) {
      await storeData(GITHUB_TOKEN_KEY, token, options);
    } else {
      await deleteData(GITHUB_TOKEN_KEY, options);
    }

    if (refreshToken) {
      await storeData(GITHUB_REFRESH_TOKEN_KEY, refreshToken, options);
    } else {
      await deleteData(GITHUB_REFRESH_TOKEN_KEY, options);
    }

    if (tokenExpiry) {
      await storeData(GITHUB_TOKEN_EXPIRY_KEY, tokenExpiry, options);
    } else {
      await deleteData(GITHUB_TOKEN_EXPIRY_KEY, options);
    }

    if (refreshTokenExpiry) {
      await storeData(GITHUB_REFRESH_TOKEN_EXPIRY_KEY, refreshTokenExpiry, options);
    } else {
      await deleteData(GITHUB_REFRESH_TOKEN_EXPIRY_KEY, options);
    }

    if (user) {
      await storeData(GITHUB_USER_KEY, JSON.stringify(user), options);
    } else {
      await deleteData(GITHUB_USER_KEY, options);
    }
  } catch (error) {
    console.error('Error saving GitHub credentials:', error);
  }
};

const loadGithubCredentials = async (options = {}) => {
  try {
    const [token, refreshToken, tokenExpiry, refreshTokenExpiry, userString] = await Promise.all([
      readData(GITHUB_TOKEN_KEY, options),
      readData(GITHUB_REFRESH_TOKEN_KEY, options),
      readData(GITHUB_TOKEN_EXPIRY_KEY, options),
      readData(GITHUB_REFRESH_TOKEN_EXPIRY_KEY, options),
      readData(GITHUB_USER_KEY, options),
    ]);

    let user = null;
    if (userString) {
      try {
        user = JSON.parse(userString);
      } catch (error) {
        console.error('Error parsing stored GitHub user:', error);
      }
    }

    return {
      token: token ?? null,
      refreshToken: refreshToken ?? null,
      tokenExpiry: tokenExpiry ?? null,
      refreshTokenExpiry: refreshTokenExpiry ?? null,
      user: user ?? null,
    };
  } catch (error) {
    console.error('Error loading GitHub credentials:', error);
    return { token: null, refreshToken: null, tokenExpiry: null, refreshTokenExpiry: null, user: null };
  }
};

const clearGithubCredentials = async (options = {}) => {
  try {
    await Promise.all([
      deleteData(GITHUB_TOKEN_KEY, options),
      deleteData(GITHUB_REFRESH_TOKEN_KEY, options),
      deleteData(GITHUB_TOKEN_EXPIRY_KEY, options),
      deleteData(GITHUB_REFRESH_TOKEN_EXPIRY_KEY, options),
      deleteData(GITHUB_USER_KEY, options),
    ]);
  } catch (error) {
    console.error('Error clearing GitHub credentials:', error);
  }
};

const saveRememberPreference = async (shouldRemember) => {
  try {
    await storeData(GITHUB_REMEMBER_PREFERENCE_KEY, shouldRemember ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving GitHub remember preference:', error);
  }
};

const loadRememberPreference = async () => {
  try {
    const value = await readData(GITHUB_REMEMBER_PREFERENCE_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error loading GitHub remember preference:', error);
    return false;
  }
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
  refreshGithubAccessToken,
  fetchAuthenticatedUser,
  saveGithubCredentials,
  loadGithubCredentials,
  clearGithubCredentials,
  saveRememberPreference,
  loadRememberPreference,
  uploadGeoJsonFile,
  uploadImgFile,
};
