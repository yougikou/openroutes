import yaml from 'js-yaml';
import { storeData } from "./StorageAPI";

const mockData = [
  {
    "comments_url": "https://api.github.com/repos/yougikou/yougikou.github.io/issues/7/comments",
    id: 2128848731,
    "number": 7,
    "title": "远足线路三",
    "user": {
        "login": "yougikou",
        "id": 6286920,
        "avatar_url": "https://avatars.githubusercontent.com/u/6286920?v=4"
    },
    "labels": [
      {
          "id": 6544296628,
          "name": "hiking",
          "description": ""
      },
      {
        "id": 6544296630,
        "name": "easy",
        "description": ""
      },
      {
        "id": 6544296631,
        "name": "筑波山",
        "description": ""
      }
    ],
    "state": "open",
    "comments": 0,
    "created_at": "2024-02-11T05:39:26Z",
    "updated_at": "2024-02-11T05:46:49Z",
    "closed_at": null,
    "body": "distance_km: \"4.6\"\r\nduration_hour: \"6:45\"\r\ndescription: \"这是一次晴天，面向初心者的徒步远足。\"\r\nattach_files:\r\n  - \"![img](https://github.com/yougikou/yougikou.github.io/assets/6286920/7d5807b5-368b-4cd9-9c5e-960b9ef3fa1d)\"\r\n  - \"![img](https://github.com/yougikou/yougikou.github.io/assets/6286920/7d5807b5-368b-4cd9-9c5e-960b9ef3fa1d)\"\r\n  - \"[gson](https://github.com/yougikou/yougikou.github.io/files/14231391/2024-01-18T10.42.03Z.json)\"\r\n",
    "reactions": {
        "total_count": 0,
        "+1": 0,
        "-1": 0,
        "laugh": 0,
        "hooray": 0,
        "confused": 0,
        "heart": 0,
        "rocket": 0,
        "eyes": 0
    }
  },
  {
    "comments_url": "https://api.github.com/repos/yougikou/yougikou.github.io/issues/7/comments",
    id: 2128848732,
    "number": 7,
    "title": "开源路径测试帖：筑波山：20240123登山路",
    "user": {
        "login": "yougikou",
        "id": 6286920,
        "avatar_url": "https://avatars.githubusercontent.com/u/6286920?v=4"
    },
    "labels": [
        {
            "id": 6544296628,
            "name": "hiking",
            "description": ""
        },
        {
          "id": 6544296629,
          "name": "easy",
          "description": ""
        },
        {
          "id": 6544296631,
          "name": "高尾山",
          "description": ""
        }
    ],
    "state": "open",
    "comments": 0,
    "created_at": "2024-02-11T05:39:26Z",
    "updated_at": "2024-02-11T05:46:49Z",
    "closed_at": null,
    "body": "distance_km: \"4.6\"\r\nduration_hour: \"6:45\"\r\ndescription: \"这是一次晴天，面向初心者的徒步远足。\"\r\nattach_files:\r\n  - \"![img](https://github.com/yougikou/yougikou.github.io/assets/6286920/7d5807b5-368b-4cd9-9c5e-960b9ef3fa1d)\"\r\n  - \"![img](https://github.com/yougikou/yougikou.github.io/assets/6286920/7d5807b5-368b-4cd9-9c5e-960b9ef3fa1d)\"\r\n  - \"[gson](https://github.com/yougikou/yougikou.github.io/files/14231391/2024-01-18T10.42.03Z.json)\"\r\n",
    "reactions": {
        "total_count": 0,
        "+1": 0,
        "-1": 0,
        "laugh": 0,
        "hooray": 0,
        "confused": 0,
        "heart": 0,
        "rocket": 0,
        "eyes": 0
    }
  }
];

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

const fetchIssues = async (owner, repo, page = 1, perPage = 10, filters = {}) => {
  // 构建请求的URL，包括筛选条件
  let url = `https://api.github.com/repos/${owner}/${repo}/issues?page=${page}&per_page=${perPage}`;

  // 将filters对象中的筛选条件添加到URL中
  Object.keys(filters).forEach(key => {
    url += `&${key}=${filters[key]}`;
  });

  try {
    // const response = await fetch(url);
    // if (!response.ok) {
    //   throw new Error(`GitHub API responded with status ${response.status}`);
    // }
    // const rawData = await response.json();
    const rawData = mockData;

    // 处理数据，只保留需要的字段
    const processedData = rawData.map(issue => {
      const bodyObj = yaml.load(issue.body);
      return {
        distance: bodyObj.distance_km,
        duration: bodyObj.duration_hour,
        description: bodyObj.description,
        attach_files: bodyObj.attach_files.map(fileStr =>(parseAttachFile(fileStr))),
        comments_url: issue.comments_url,
        id: issue.id,
        number: issue.number,
        title: issue.title,
        user: {
          login: issue.user.login,
          id: issue.user.id,
          avatar_url: issue.user.avatar_url
        },
        labels: issue.labels.map(label => ({
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
    throw error; // 将错误向上抛出，允许调用者处理错误
  }
};

const createIssue = async (owner, repo, title, body, token) => {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body })
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }

  const issueData = await response.json();
  return issueData;
}

const exchangeToken = async (cd) => {
  const ci = 'cd019fec05aa5b74ad81';
  const sc = '51d66fda4e5184bcc7a4ceaf99f78a8cf3acb028';
  const ru = 'http://localhost:8081/githubauth';
  const proxyUrl = 'https://cors-anywhere.azm.workers.dev/';

  try {
    const response = await fetch(proxyUrl + 'https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: `client_id=${ci}&client_secret=${sc}&code=${cd}&redirect_uri=${ru}`,
    });

    const data = await response.json();
    if (data.access_token) {
      storeData("github_access_token", data.access_token)
    } else {
      console.error('No access token found in response:', textResponse);
    }
  } catch (error) {
    console.error('Token exchange error:', error);
  }
}


const uploadGeoJsonFile = async (geoJsonData, key) => {
  const geoJsonBlob = new Blob([JSON.stringify(geoJsonData)], { type: 'application/json' });
  return uploadToFileIO(geoJsonBlob, `${key}_geojson.json`);
}

const uploadImgFile = async (base64Data, key) => {
  return uploadImgToImgur(base64Data);
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

  const data = await response.json();
    
  console.log(data);
  return data;
}

export { fetchIssues, createIssue, exchangeToken, uploadGeoJsonFile, uploadImgFile };
