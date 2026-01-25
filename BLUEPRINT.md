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
-   **Auth:** GitHub OAuth (Insecure: Client Secret exposed, relies on public proxy).

#### Target Architecture (Serverless 2.0)
-   **Frontend:** React Native (Expo)
-   **DB:** GitHub Issues (Searchable Metadata)
-   **GeoJSON Workflow:**
    1.  **Drop (Upload):** App uploads `.geojson` to a fixed "Inbox" Release (e.g., tag `temp-inbox`).
    2.  **Sorter (Action):** GitHub Action downloads file from Release (fast, simple auth), commits it to `assets/geojson/`, and optionally deletes the temp file.
    3.  **Rewrite:** Action updates Issue Body to point to the permanent GitHub Raw URL.
-   **Image Strategy:**
    -   **Primary:** External Hosting (Imgur) to keep repository size low.
    -   **Backup:** "Healer Bot" (Future) to regenerate visualizations if links die.
-   **Auth Service:**
    -   **Token Exchange:** A simple Serverless Function (Cloudflare Worker / Vercel) to securely handle `client_secret` and exchange codes for tokens.

## Roadmap & Implementation Plan

### Phase 1: Foundation & Stability (Immediate)
**Goal:** Implement the "Release Inbox" workflow and Secure Authentication.
1.  **GeoJSON Core Workflow (Release Staging):**
    -   **Step 1: Upload (Drop):** Modify App to upload GeoJSON to a specific GitHub Release asset.
    -   **Step 2: Ingest (Action):** Update `update-file-to-issue.yml` to commit asset to repo.
    -   **Step 3: Rewrite:** Update Issue Body with permanent link.
2.  **Secure Authentication (Fix Security Issue):**
    -   **Problem:** Current implementation exposes GitHub `client_secret` and uses an unstable 3rd party CORS proxy.
    -   **Solution:** Deploy a lightweight **Cloudflare Worker** (Free Tier) to act as the Token Exchange Service.
    -   **Flow:** App -> Cloudflare Worker (Exchange Code) -> GitHub -> Return Token.
    -   **Benefit:** Secures credentials and removes reliance on `cors-anywhere`.

### Phase 2: Enhanced Experience (UI/UX & Mobile)
**Goal:** Polish the user interface and native mobile experience.
1.  **UI/UX Improvements:**
    -   **Feedback:** Implement Skeleton Loaders for data fetching and better upload progress indicators.
    -   **Visuals:** Unify spacing and typography using React Native Paper theme. Add subtle animations (Reanimated) for list transitions.
2.  **Mobile App Native Correspondence:**
    -   **Deep Linking:** Configure `oproutes://` scheme to handle OAuth redirects seamlessly on iOS and Android (replacing web-based redirects).
    -   **Permissions:** Improve handling of Native Permissions (Camera, Photo Library, File System) with explanatory dialogs before requesting.
    -   **Native Polish:** Update Splash Screen, Adaptive Icons, and Status Bar handling for a "Store-ready" feel.

### Phase 3: Discovery & Community (Future)
**Goal:** Make it easier to find routes and build community.
1.  **Implement Route Detail Screen:**
    -   Add a Map View component (`react-native-maps`).
    -   Visualize the GeoJSON path on the map.
2.  **Advanced Filtering:**
    -   Implement UI for filtering by Distance, Duration, Difficulty, and Activity Type.
3.  **Image Healer Bot (Resilience):**
    -   Automated recovery of broken image links using GeoJSON data.

## Technical Requirements
-   **GitHub API:** Permissions to upload assets to Releases.
-   **Serverless Function:** Cloudflare Worker or Vercel Function for Auth.
-   **Mobile:** Configuration of `app.json` for Deep Linking (`scheme`).
-   **Map Library:** `react-native-maps`.
