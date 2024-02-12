import yaml from 'js-yaml';

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

const uploadFile = async (fileBlob, fileName) => {
  const clientId = "d429872aeaa174c",
            auth = "Client-ID " + clientId;
  // const clientSecret = "1d6d7409b6735aa00bc269fcfde8b255f65bb177"
  // 转换GeoJSON对象为Blob
  // const geoJsonBlob = new Blob([JSON.stringify(geoJsonData)], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', fileBlob, fileName);

  // 上传文件
  try {
    const response = await fetch('https://api.imgur.com/3/image/', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });
    const data = await response.json();
    
    console.log(data);
    return data; // 返回上传后的数据
  } catch (error) {
    console.error('Error uploading GeoJSON:', error);
    throw error;
  }
}

export { fetchIssues, createIssue, uploadFile };
