# OpenRoutes Product Service Blueprint

## Vision
To create a fully free, decentralized, and community-driven route sharing platform for hiking, cycling, and walking enthusiasts, leveraging serverless architecture to ensure sustainability and openness.

## Service Blueprint

### 1. User Journey

| Stage | User Action | System Interaction | Backend Process |
| :--- | :--- | :--- | :--- |
| **Discover** | User opens app, browses list, searches keywords. | App fetches issues from GitHub with `route` label. | `GET /repos/{owner}/{repo}/issues` |
| **View Detail** | User clicks a route card. | **(Future)** App displays map with route track, elevation profile, and details. | Fetch GeoJSON from persistent storage (GitHub `assets` branch). |
| **Download** | User clicks "GPX" or "KML". | App converts GeoJSON to requested format and triggers download. | Client-side conversion. |
| **Create** | User logs in via GitHub, uploads GPX/KML, adds photos. | App parses file, uploads to temporary storage (File.io/Imgur). | Client-side processing. |
| **Publish** | User submits the route. | App creates a GitHub Issue with links to temp storage. | `POST /repos/{owner}/{repo}/issues` |
| **Ingest (Auto)** | - | GitHub Action triggers on new Issue. | **Downloads files from temp storage, commits to `assets` branch, updates Issue body.** |
| **Engage** | User comments or reacts. | **(Future)** App shows comments/reactions on Detail screen. | GitHub Comments/Reactions API. |

### 2. System Architecture

#### Current State
-   **Frontend:** React Native (Expo)
-   **DB:** GitHub Issues (Metadata)
-   **Ingestion (Buffer):**
    -   Images: Imgur (Used for initial upload)
    -   GeoJSON: File.io (Used for initial upload)
-   **Persistence Layer:**
    -   **GeoJSON:** Automatically moved from File.io to **GitHub Repo (`assets` branch)** via GitHub Actions (`update-file-to-issue.yml`).
    -   **Images:** Currently remain on Imgur (External Dependency).
-   **Auth:** GitHub OAuth

#### Target Architecture (Serverless 2.0)
-   **Frontend:** React Native (Expo)
-   **DB:** GitHub Issues (Searchable Metadata)
-   **Storage:**
    -   **All Assets (Images & GeoJSON):** GitHub Repository (`assets` branch).
    -   **Ingestion:** Minimized external dependency.
-   **Maps:** React Native Maps (Mobile) / Leaflet (Web)
-   **Auth:** GitHub OAuth

## Roadmap & Implementation Plan

### Phase 1: Foundation & Stability (Immediate)
**Goal:** Complete the "Self-Contained" storage model and remove long-term external dependencies.
1.  **Secure Image Storage (Reduce External Dependency):**
    -   **Problem:** Images currently rely on Imgur indefinitely.
    -   **Solution:** Update the `update-file-to-issue.yml` workflow to:
        1.  Detect Imgur links in the issue body.
        2.  Download the image.
        3.  Commit the image to `assets/images/` in the repository.
        4.  Replace the Imgur link in the Issue body with the raw GitHub link (e.g., `https://raw.githubusercontent.com/...`).
    -   **Result:** Imgur is only used as a temporary buffer (< 1 minute), reducing risk of data loss or service changes.
2.  **Robust Ingestion:**
    -   Evaluate alternatives to File.io if it proves unreliable for the ~1 minute window between User Submit and Action Run.
3.  **Implement Route Detail Screen:**
    -   Add a Map View component.
    -   Visualize the GeoJSON path on the map.
    -   Show elevation profile.

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

## Technical Requirements
-   **GitHub Actions:** Enhancement of `update-file-to-issue.yml` for image processing.
-   **Map Library:** `react-native-maps` for native, `react-leaflet` or Mapbox GL JS for web compatibility.
-   **State Management:** TanStack Query (React Query) for better caching of API responses.
