# openroutes
推荐适合徒步旅行、骑自行车、散步等健康活动的路线，应该免费向所有人开放。

[![日本語](https://img.shields.io/badge/lang-日本語-green.svg)](./README.md)
[![English](https://img.shields.io/badge/lang-English-blue.svg)](./README_EN.md)
[![中文](https://img.shields.io/badge/lang-中文-red.svg)](./README_ZH.md)

[演示网站](https://yougikou.github.io/openroutes/)

### 项目概况
OpenRoutes 是一个基于 React Native (Expo) 构建的无服务器路线分享平台。
旨在利用 **GitHub Issues** 作为后端数据库，构建一个完全免费的生态系统。

### 架构
-   **前端:** React Native / Expo (支持 Web, iOS, Android)
-   **数据库:** GitHub Issues (元数据, 描述, 评论)
-   **认证:** GitHub OAuth
-   **存储 (当前):**
    -   图片: Imgur API
    -   GeoJSON (路线数据): GitHub Releases (Inbox) -> GitHub Repo (Assets Branch)

### 开发环境设置

#### 前置条件
-   Node.js (建议 v22+)
-   npm

#### 安装
```bash
npm install
```

#### 环境配置

#### 本地开发 (`.env`)
在项目根目录创建 `.env` 文件，并设置以下变量：

```ini
# 数据源 GitHub 仓库的所有者用户名
EXPO_PUBLIC_GITHUB_OWNER=your_github_username
# 数据源 GitHub 仓库名称
EXPO_PUBLIC_GITHUB_REPO=your_repo_name
```

#### GitHub Actions Secrets
如果你使用 CI/CD (GitHub Actions)，需要在仓库的 Settings > Secrets and variables > Actions 中设置以下密钥：

- **必须**
    - `EXPO_PUBLIC_GITHUB_OWNER`: 数据源的 GitHub 用户名。
    - `EXPO_PUBLIC_GITHUB_REPO`: 数据源的仓库名称。

- **可选 (当数据源仓库与应用仓库不同时)**
    - `ACCESS_TOKEN`: 拥有数据源仓库写入权限的个人访问令牌 (PAT) (用于同步 Workflow)。

#### 运行
```bash
# Web 运行
npm run web

# iOS / Android (需要 Expo Go)
npm run ios
npm run android
```

### 开发目的
因为喜欢接触自然，并为这类积极健康的爱好，需要各种安全且质量高的路线信息。虽然查看了多种服务，但对于那些需要付费的服务总是感到不满意……

如果信息是由徒步旅行用户收集的，那么应该免费提供。

### 目标“全免费”
- 尽可能使用免费服务构建无服务器服务（以Github为主）
- 尽可能保持功能的简单，容易技术升级
- 能够轻松搜索、分享徒步旅行、步行、骑行路线信息
- 即使没有人使用，也可以作为个人路线记录使用
- 由于本人主要是在日本的山谷，溪流的徒步记录，所以目前默认语言为日语，支持中文和英文

### 开发TODO
由于刚刚开始，任务太多，现在先列出一些想到的
- 使用Github API扩展路线搜索和注册（目前基本通信已经实现，正在进行，演示网站使用MockData）
  - 将路线登记为Issue
  - 搜索Issue，然后在网站上显示路线信息
- 完善语言切换
- 路线搜索功能
  - 路线列表的自动加载（Expo - FlashList）
- 路线注册功能
  - 问题：没有API添加Issue的附件
  - 暂定解决方案：
    - 寻找临时保存GeoJson文件、图片文件的服务
      - imgur似乎不错，仅支持图片
      - 使用图像信息隐藏技术（steganography js），将GeoJson文本信息记录在上传的图片中（通过imgur api注册）
    - 使用Github WorkFlow提交至repo的Content下，并在相关Issue中添加附件链接
      - Issue的附件没有10MB的限制
      - 与静态S3等Issue附件不同，Repo可以进行适当管理，数据不会突然丢失
  - 其他，日期、距离、高度、过程时间的GPX,KML自动解析获取
    - 减少用户填写，能够展示路线记录数据内的有用信息
- 还需要不断对代码，组件不断提炼，提高维护性
- 使用Open Map服务进行路线地图绘制等...
