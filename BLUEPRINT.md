# OpenRoutes Product Service Blueprint

## Vision
To create a fully free, decentralized, and community-driven route sharing platform for hiking, cycling, and walking enthusiasts, leveraging serverless architecture to ensure sustainability and openness.

## Service Blueprint

### 1. User Journey

| Stage | User Action | System Interaction | Backend Process |
| :--- | :--- | :--- | :--- |
| **Discover** | User opens app, browses list, searches keywords. | App fetches issues from GitHub with `route` label. | `GET /repos/{owner}/{repo}/issues` |
| **View Detail** | User clicks a route card. | **(Future)** App displays map with route track, elevation profile, and details. | Fetch GeoJSON from persistent storage (Git/Gist). |
| **Download** | User clicks "GPX" or "KML". | App converts GeoJSON to requested format and triggers download. | Client-side conversion. |
| **Create** | User logs in via GitHub, uploads GPX/KML, adds photos. | App parses file for metadata (dist/dur/date), uploads images to Imgur. | **(Future)** Commit GeoJSON to Repo/Gist. |
| **Publish** | User submits the route. | App creates a GitHub Issue with YAML metadata and links. | `POST /repos/{owner}/{repo}/issues` |
| **Engage** | User comments or reacts. | **(Future)** App shows comments/reactions on Detail screen. | GitHub Comments/Reactions API. |

### 2. System Architecture

#### Current State
-   **Frontend:** React Native (Expo)
-   **DB:** GitHub Issues (Metadata)
-   **Blob Storage:**
    -   Images: Imgur (Free, generally reliable)
    -   GeoJSON: File.io (Ephemeral, **Critical Issue**)
-   **Auth:** GitHub OAuth

#### Target Architecture (Serverless 2.0)
-   **Frontend:** React Native (Expo)
-   **DB:** GitHub Issues (Searchable Metadata)
-   **Blob Storage:**
    -   Images: Imgur or GitHub Repo (`assets` branch)
    -   GeoJSON: **GitHub Repository (Committed file)** or **GitHub Gist**
-   **Maps:** React Native Maps (Mobile) / Leaflet (Web)
-   **Auth:** GitHub OAuth

## Roadmap & Implementation Plan

### Phase 1: Foundation & Stability (Immediate)
**Goal:** Fix data persistence and basic usability.
1.  **Replace File.io with GitHub Storage:**
    -   Instead of uploading to File.io, the app should use the GitHub API to commit the GeoJSON file to a specific path in the repository (e.g., `data/routes/{year}/{month}/{id}.geojson`) or create a Secret Gist.
    -   Link this permanent URL in the Issue body.
2.  **Implement Route Detail Screen:**
    -   Add a Map View component.
    -   Visualize the GeoJSON path on the map.
    -   Show elevation profile (if data exists).

### Phase 2: Enhanced Discovery (Mid-term)
**Goal:** Make it easier to find relevant routes.
1.  **Advanced Filtering:**
    -   Implement UI for filtering by Distance, Duration, Difficulty, and Activity Type.
    -   Map these filters to GitHub Issue search queries (e.g., labels, body text search).
2.  **Map-based Search:**
    -   Show all routes on a global map (clustering).
    -   Allow "Search this area".

### Phase 3: Community & Personalization (Long-term)
**Goal:** Build a community.
1.  **User Profiles:**
    -   "My Routes" screen.
    -   "My Likes/Bookmarks" (using GitHub reactions).
2.  **Social Features:**
    -   Display comments from the GitHub Issue in the app.
    -   Allow posting comments from the app.
3.  **Gamification:**
    -   Badges for number of routes shared (using GitHub labels on user?).

## Technical Requirements
-   **GitHub API:** Enhanced usage for file commits (Content API).
-   **Map Library:** `react-native-maps` for native, `react-leaflet` or Mapbox GL JS for web compatibility.
-   **State Management:** TanStack Query (React Query) for better caching of API responses.
