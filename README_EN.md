# openroutes
Routes recommended for wellness activities like hiking, cycling, and walking should be free for everyone to use.

[![日本語](https://img.shields.io/badge/lang-日本語-green.svg)](./README.md)
[![English](https://img.shields.io/badge/lang-English-blue.svg)](./README_EN.md)
[![中文](https://img.shields.io/badge/lang-中文-red.svg)](./README_ZH.md)

[Demo Site](https://yougikou.github.io/openroutes/)

## Project Overview
OpenRoutes is a serverless route sharing platform built with React Native (Expo).
It aims to be a completely free ecosystem, using **GitHub Issues** as a database for the backend.

### Architecture
-   **Frontend:** React Native / Expo (Web, iOS, Android supported)
-   **Database:** GitHub Issues (Metadata, Descriptions, Comments)
-   **Authentication:** GitHub OAuth
-   **Storage (Current):**
    -   Images: Imgur API
    -   GeoJSON (Route Data): File.io (Note: Temporary storage, persistence is a known issue)

## Features
1.  **Explore Routes (Explore)**
    -   Fetches route information from GitHub Issues and displays them in a list.
    -   Supports downloading in GPX / KML formats.
    -   Keyword search functionality.
2.  **Share Route (Share)**
    -   Upload GPX / KML files and automatically parse distance, duration, and date.
    -   Attach photos and add descriptions to your route.
    -   *Note: GitHub authentication is required to post.*
3.  **Authentication (Auth)**
    -   Log in using your GitHub account.
    -   Logging in enables route creation and increases API rate limits.

## Getting Started

### Prerequisites
-   Node.js (v22+ recommended)
-   npm

### Installation
```bash
npm install
```

### Running
```bash
# Run on Web
npm run web

# iOS / Android (Requires Expo Go)
npm run ios
npm run android
```

## Current Issues & Roadmap
-   **Data Persistence:** Currently, GeoJSON is stored in temporary storage (File.io), which risks broken links. We are considering moving to direct commits to a GitHub repository.
-   **Detail Screen:** The route detail map view is not yet implemented.
-   **Search Functionality:** UI implementation for filtering is needed.

---
### Purpose
I love connecting with nature, and for such positive, healthy hobbies, various safe and high-quality route information is needed. I've looked at many services, but I'm never quite satisfied with them being paid...
If information is collected from hiking users, it should all be free.
