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
| **Create** | User logs in via GitHub, uploads GPX/KML, adds photos. | App parses file. Uploads GeoJSON to **GitHub Release (Inbox)**. Uploads images to Imgur. | Client-side processing. |
| **Publish** | User submits the route. | App creates a GitHub Issue with links to Release Asset (GeoJSON) and Imgur (Images). | `POST /repos/{owner}/{repo}/issues` |
| **Ingest (Auto)** | - | GitHub Action triggers on new Issue. | **Downloads GeoJSON from Release, commits to `assets` branch, updates Issue body.** |
| **Engage** | User comments or reacts. | **(Future)** App shows comments/reactions on Detail screen. | GitHub Comments/Reactions API. |

### 2. System Architecture

#### Current State
-   **Frontend:** React Native (Expo)
-   **DB:** GitHub Issues (Metadata)
-   **Ingestion (Buffer):**
    -   Images: Imgur
    -   GeoJSON: File.io (Unstable) -> **Moving to GitHub Release (Inbox)**
-   **Persistence Layer:**
    -   **GeoJSON:** GitHub Repo (`assets` branch).
    -   **Images:** Imgur (External).
-   **Auth:** GitHub OAuth

#### Target Architecture (Release Staging & GeoJSON Archiving)
-   **Frontend:** React Native (Expo)
-   **DB:** GitHub Issues (Searchable Metadata)
-   **GeoJSON Workflow:**
    1.  **Drop (Upload):** App uploads `.geojson` to a fixed "Inbox" Release (e.g., tag `temp-inbox`).
    2.  **Sorter (Action):** GitHub Action downloads file from Release (fast, simple auth), commits it to `assets/geojson/`, and optionally deletes the temp file.
    3.  **Rewrite:** Action updates Issue Body to point to the permanent GitHub Raw URL.
-   **Image Strategy:**
    -   **Primary:** External Hosting (Imgur) to keep repository size low.
    -   **Backup:** "Healer Bot" (Future) to regenerate visualizations if links die.

## Roadmap & Implementation Plan

### Phase 1: Foundation & Stability (Immediate)
**Goal:** Implement the "Release Inbox" workflow to guarantee GeoJSON persistence.
1.  **GeoJSON Core Workflow (Release Staging):**
    -   **Step 1: Upload (Drop):** Modify App to upload GeoJSON to a specific GitHub Release asset instead of File.io.
    -   **Step 2: Ingest (Action):** Update `update-file-to-issue.yml` to:
        -   Detect Release Asset links in the Issue Body.
        -   Download the asset.
        -   Commit to `assets` branch.
    -   **Step 3: Rewrite:** Replace the Release Asset link with the permanent `raw.githubusercontent.com` link in the Issue Body.
2.  **Implement Route Detail Screen:**
    -   Add a Map View component.
    -   Visualize the GeoJSON path on the map.

### Phase 2: Enhanced Discovery (Mid-term)
**Goal:** Make it easier to find relevant routes.
1.  **Advanced Filtering:**
    -   Implement UI for filtering by Distance, Duration, Difficulty, and Activity Type.
2.  **Map-based Search:**
    -   Show all routes on a global map.

### Phase 3: Community & Reliability (Long-term)
**Goal:** Build resilience and community features.
1.  **Image Healer Bot (Resilience):**
    -   Instead of archiving all images (which bloats the repo), develop a scheduled task.
    -   **Logic:** If an external image link (Imgur) becomes 404, the bot uses the archived GeoJSON to generate a static map image of the route path and replaces the broken link in the Issue Body.
2.  **User Profiles & Social:**
    -   "My Routes" and Comments integration.

## Technical Requirements
-   **GitHub API:** Permissions to upload assets to Releases.
-   **GitHub Actions:** `update-file-to-issue.yml` modifications.
-   **Map Library:** `react-native-maps`.
