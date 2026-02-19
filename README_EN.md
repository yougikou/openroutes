# OpenRoutes - Your Decentralized Outdoor Log 🌲🚵‍♂️

Explore nature, record your tracks, completely free and in your control.

[![日本語](https://img.shields.io/badge/lang-日本語-green.svg)](./README_JP.md)
[![English](https://img.shields.io/badge/lang-English-blue.svg)](./README_EN.md)
[![中文](https://img.shields.io/badge/lang-中文-red.svg)](./README.md)

[🌐 Visit Official Site](https://yougikou.github.io/openroutes/)

## 🌟 What is OpenRoutes?

OpenRoutes is a **Serverless** outdoor route sharing platform, built on React Native (Expo).

Unlike other platforms, **we use GitHub as our database**. This means:
- **Completely Free**: No subscription fees, no ads.
- **Data Autonomy**: Your route data is stored in a public GitHub repository, not a closed private server.
- **Community Driven**: Every Issue is a route, every Comment is an interaction.

## 📖 User Guide: How to use

Just 3 simple steps to start your decentralized outdoor journey.

### 1. Connect your GitHub Account 🔗
Tap the **Setting** tab at the bottom, then tap **Connect** to log in.
- **Why login is needed?** To prevent abuse and bypass API limits, we need to verify your identity.
- **Permissions**: We need read and write permissions for Issues so you can post routes and comments.

### 2. Explore Routes (Explore) 🗺️
Browse hiking and cycling routes shared by the community on the home page.
- **Map Mode**: Click a route in the list to enter the detailed map page.
- **Download Data**: Supports exporting **GPX** or **KML** files to import into your watch or GPS device.

### 3. Share Your Footprints (Share) 📝
Click the **Share** tab at the bottom to upload your record.
- **Upload File**: Select your `.gpx` or `.kml` file.
- **Auto Parse**: System automatically calculates distance, climb, and duration.
- **Add Photos**: Upload photos of the scenery (currently supports Imgur).
- **Publish**: Click submit, and your route will be automatically generated as a GitHub Issue!

---

## 🔒 How is Data Saved?

OpenRoutes uses a unique **Git-as-Backend** architecture:

1.  **Route Metadata**: Title, description, difficulty, etc., are stored in the body of a **GitHub Issue** (YAML format).
2.  **Route Files (GeoJSON)**: Converted route data is stored in **GitHub Releases** (Tag: `inbox`) for persistent storage.
3.  **Images**: Currently hosted on **Imgur API** (Future plan to migrate to GitHub storage).

---

## 🛠️ Deployment & Development Guide

If you are a developer, or want to deploy your own OpenRoutes instance, please refer to the following steps.

### Prerequisites
-   Node.js (v22+ recommended)
-   npm

### Installation
```bash
npm install
```

### Configuration

#### Local Development (`.env`)
Create a `.env` file in the project root and configure the data source repository:

```ini
# The GitHub username of the data source repository owner (e.g. yougikou)
EXPO_PUBLIC_GITHUB_OWNER=your_github_username
# The name of the data source repository (e.g. openroutes-data)
EXPO_PUBLIC_GITHUB_REPO=your_repo_name
```

#### GitHub Actions Secrets (For CI/CD)
If using GitHub Actions for automated builds, you need to add Secrets in the repository settings:

- `EXPO_PUBLIC_GITHUB_OWNER`: GitHub username for the data source.
- `EXPO_PUBLIC_GITHUB_REPO`: Repository name for the data source.
- `ACCESS_TOKEN`: (Optional) If the data source is in a private repository or a different repository, a PAT with read/write permissions is required.

### Run Project
```bash
# Run Web version
npm run web

# Run iOS / Android (Requires Expo Go)
npm run ios
npm run android
```

---

## 🚀 Roadmap

We are committed to building the purest outdoor community. Here is our development roadmap:

### ✅ Phase 1: Core Features (Completed)
- [x] **GitHub Login & Auth**: Secure OAuth flow.
- [x] **GPX/KML Parsing**: Automatic distance and duration calculation on the frontend.
- [x] **Map Visualization**: Leaflet-based interactive map.
- [x] **Issue CMS**: Content management using GitHub Issues.
- [x] **PWA Support**: Installable to home screen, basic offline functionality.
- [x] **Multilingual Support**: Switch between English, Japanese, and Chinese.
- [x] **Smart Filtering**: Filter routes by type, difficulty, distance, and duration.

### 🚧 Phase 2: Experience Upgrade (In Progress)
- [ ] **Image Storage Migration**: Remove Imgur dependency, store images directly in GitHub Issue attachments or Releases to achieve 100% data decentralization.
- [ ] **Offline Map Optimization**: Improve PWA cache strategy to support offline viewing of loaded map areas.
- [ ] **Dark Mode**: UI theme adapted for night use.

### 🔮 Phase 3: Ecosystem Expansion (Future)
- [ ] **Multi-repo Support**: Allow users to switch data sources in settings (e.g., "View my private repo" vs "View community picks").
- [ ] **Social Interaction**: Directly render Issue comments in the app, support likes and discussions.
- [ ] **Event Organization**: Issue-based event registration function.

---

### ❤️ Purpose
Nature belongs to everyone. We believe that high-quality outdoor route information should not be blocked by paywalls. OpenRoutes was built for all friends who love hiking, cycling, and exploring—let information flow freely, and let footprints spread across mountains and rivers.
