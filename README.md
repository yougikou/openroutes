# OpenRoutes - 你的去中心化户外日志 🌲🚵‍♂️

探索自然、记录足迹，完全免费且掌控在你手中。

[![日本語](https://img.shields.io/badge/lang-日本語-green.svg)](./README_JP.md)
[![English](https://img.shields.io/badge/lang-English-blue.svg)](./README_EN.md)
[![中文](https://img.shields.io/badge/lang-中文-red.svg)](./README.md)

[🌐 访问演示网站](https://yougikou.github.io/openroutes/)

## 🌟 什么是 OpenRoutes？

OpenRoutes 是一个**无服务器 (Serverless)** 的户外路线分享平台，基于 React Native (Expo) 构建。

与其他平台不同，**我们将 GitHub 作为数据库**。这意味着：
- **完全免费**：没有订阅费，没有广告。
- **数据自主**：你的路线数据存储在公开的 GitHub 仓库中，而不是封闭的私有服务器。
- **社区驱动**：每一个 Issue 就是一条路线，每一次 Comment 就是一次互动。

## 📖 用户指南：如何使用

只需简单三步，开启你的去中心化户外之旅。

### 1. 连接你的 GitHub 账号 🔗
点击右上角的 **GitHub 图标** 进行登录。
- **为什么需要登录？** 为了防止滥用并突破 API 限制，我们需要验证你的身份。
- **权限说明**：我们需要读取和写入 Issue 的权限，以便你能发布路线和评论。

### 2. 探索路线 (Explore) 🗺️
在首页浏览社区分享的徒步、骑行路线。
- **地图模式**：点击列表中的路线，进入详细地图页面。
- **下载数据**：支持导出 **GPX** 或 **KML** 文件，导入到你的手表或 GPS 设备中。

### 3. 分享你的足迹 (Share) 📝
点击底部的 **Share** 标签，上传你的记录。
- **上传文件**：选择你的 `.gpx` 或 `.kml` 文件。
- **自动解析**：系统会自动计算距离、爬升和耗时。
- **添加照片**：上传沿途的美景（目前支持 Imgur 图床）。
- **发布**：点击提交，你的路线将自动生成为一个 GitHub Issue！

---

## 🔒 数据是如何保存的？

OpenRoutes 采用独特的**Git-as-Backend**架构：

1.  **路线元数据 (Metadata)**：标题、描述、难度等信息存储在 **GitHub Issue** 的正文中 (YAML 格式)。
2.  **路线文件 (GeoJSON)**：转换后的路线数据存储在 **GitHub Releases** 中 (Tag: `inbox`)，确保持久化存储。
3.  **图片 (Images)**：目前托管于 **Imgur API** (未来计划迁移至 GitHub 存储)。

---

## 🛠️ 部署与开发指南

如果你是开发者，或者想部署自己的 OpenRoutes 实例，请参考以下步骤。

### 前提条件
-   Node.js (推荐 v22+)
-   npm

### 安装
```bash
npm install
```

### 环境配置

#### 本地开发 (`.env`)
在项目根目录创建 `.env` 文件，配置数据源仓库：

```ini
# 数据源 GitHub 仓库的所有者用户名 (例如: yougikou)
EXPO_PUBLIC_GITHUB_OWNER=your_github_username
# 数据源 GitHub 仓库名称 (例如: openroutes-data)
EXPO_PUBLIC_GITHUB_REPO=your_repo_name
```

#### GitHub Actions Secrets (用于 CI/CD)
若使用 GitHub Actions 自动构建，需在仓库设置中添加 Secrets：

- `EXPO_PUBLIC_GITHUB_OWNER`: 数据源用户名
- `EXPO_PUBLIC_GITHUB_REPO`: 数据源仓库名
- `ACCESS_TOKEN`: (可选) 若数据源在私有仓库或跨仓库操作，需提供具有读写权限的 PAT。

### 运行项目
```bash
# 启动 Web 版
npm run web

# 启动 iOS / Android (需要安装 Expo Go)
npm run ios
npm run android
```

---

## 🚀 蓝图规划 (Roadmap)

我们致力于打造最纯粹的户外社区。以下是我们的开发蓝图：

### ✅ 第一阶段：核心功能 (已完成)
- [x] **GitHub 登录与认证**：安全的 OAuth 流程。
- [x] **GPX/KML 解析**：前端自动计算距离与时间。
- [x] **地图可视化**：基于 Leaflet 的交互式地图。
- [x] **Issue CMS**：利用 GitHub Issue 管理内容。
- [x] **PWA 支持**：可安装到手机桌面，离线访问基础功能。

### 🚧 第二阶段：体验升级 (进行中)
- [ ] **图片存储迁移**：移除 Imgur 依赖，将图片直接存储到 GitHub Issue 附件或 Releases 中，实现 100% 数据去中心化。
- [ ] **离线地图优化**：改进 PWA 缓存策略，支持离线查看已加载的地图区域。
- [ ] **深色模式**：适配夜间使用的 UI 主题。

### 🔮 第三阶段：生态扩展 (未来)
- [ ] **多仓库支持**：允许用户在设置中切换数据源（例如："查看我的私人仓库" vs "查看社区精选"）。
- [ ] **社交互动**：在 App 内直接渲染 Issue 评论，支持点赞和讨论。
- [ ] **活动组织**：基于 Issue 的活动报名功能。

---

### ❤️ 开发初衷
大自然属于每一个人。我们相信，高质量的户外路线信息不应被付费墙阻隔。OpenRoutes 是为了所有热爱徒步、骑行和探索的朋友们打造的——让信息自由流动，让足迹遍布山川。
