import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { RouteIssue } from '../components/apis/GitHubAPI';
import { convertBlobUrlToRawUrl } from './url';

const OFFLINE_MAPS_KEY = 'offline_maps_metadata';
const TILE_LIMIT = 10000;

export interface OfflineMap extends RouteIssue {
  savedAt: number;
  tileCount: number;
  size?: number;
}

// Initialize Leaflet and Plugin
let L: any;
if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
        try {
            // Ensure L is globally available for plugins that depend on window.L
            L = require('leaflet');
            // @ts-ignore
            window.L = L;
            require('leaflet.offline');
            console.log('Leaflet offline plugin loaded successfully');
        } catch (e) {
            console.warn('Leaflet offline load failed', e);
        }
    }
}

// Helper to get normalized Mercator Y coordinate (0 at top, 1 at bottom)
const getNormalizedY = (lat: number) => {
    return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2;
}

const estimateFitZoom = (bounds: any): number => {
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    const screenWidth = 360;
    const screenHeight = 600;

    const lngDiff = Math.abs(east - west);
    // x fraction = lngDiff / 360
    const xFraction = lngDiff / 360;

    const yNorth = getNormalizedY(north);
    const ySouth = getNormalizedY(south);
    const yFraction = Math.abs(ySouth - yNorth);

    // Avoid division by zero or infinites
    if (xFraction === 0 || yFraction === 0) return 15;

    const zoomX = Math.log2(screenWidth / (xFraction * 256));
    const zoomY = Math.log2(screenHeight / (yFraction * 256));

    const zoom = Math.min(zoomX, zoomY);
    // Clamp to [0, 18] and floor
    return Math.max(0, Math.min(Math.floor(zoom), 18));
}

// Standard OSM Tile calculation
const long2tile = (lon: number, zoom: number) => {
    return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
}

const lat2tile = (lat: number, zoom: number) => {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}

const getTileUrls = (bounds: any, minZoom: number, maxZoom: number, urlTemplate: string) => {
    const tiles = [];
    for (let z = minZoom; z <= maxZoom; z++) {
        const north = bounds.getNorth();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const west = bounds.getWest();

        const xMin = long2tile(west, z);
        const xMax = long2tile(east, z);
        const yMin = lat2tile(north, z); // North Lat -> smaller Y
        const yMax = lat2tile(south, z); // South Lat -> larger Y

        // Ensure min <= max
        const xStart = Math.min(xMin, xMax);
        const xEnd = Math.max(xMin, xMax);
        const yStart = Math.min(yMin, yMax);
        const yEnd = Math.max(yMin, yMax);

        for (let x = xStart; x <= xEnd; x++) {
            for (let y = yStart; y <= yEnd; y++) {
                const url = urlTemplate
                    .replace('{s}', 'a') // Default subdomain
                    .replace('{x}', x.toString())
                    .replace('{y}', y.toString())
                    .replace('{z}', z.toString());

                // key is used by leaflet.offline to store in IndexedDB
                // It usually uses the url as key if not specified otherwise
                const key = url;

                tiles.push({ x, y, z, url, key });
            }
        }
    }
    return tiles;
};

export const saveOfflineMap = async (
    route: RouteIssue,
    onProgress: (current: number, total: number) => void
): Promise<void> => {
    if (Platform.OS !== 'web' || !L) {
        throw new Error('Offline maps only supported on Web with Leaflet loaded');
    }

    // Dynamic require to get helper functions
    let downloadTile: any, saveTile: any;
    try {
        const leafletOffline = require('leaflet.offline');
        downloadTile = leafletOffline.downloadTile;
        saveTile = leafletOffline.saveTile;
    } catch (e) {
        throw new Error('leaflet.offline module not found');
    }

    try {
        console.log('Starting saveOfflineMap for route:', route.id);

        // 1. Fetch GeoJSON to get bounds
        const geojsonUrl = convertBlobUrlToRawUrl(route.geojson.uri);
        console.log('Fetching GeoJSON:', geojsonUrl);
        const response = await fetch(geojsonUrl);
        if (!response.ok) throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`);
        const geojsonData = await response.json();

        // 2. Calculate Bounds
        const geoLayer = L.geoJSON(geojsonData);
        const bounds = geoLayer.getBounds();

        // 3. Prepare Tile Infos
        const urlTemplate = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        // 4. Calculate Tiles to Save
        // Estimate appropriate zoom levels
        let fitZoom = estimateFitZoom(bounds);
        // Ensure we don't start too zoomed in if the route is tiny (e.g. 18),
        // allowing at least some context. But for huge routes, fitZoom is low.
        // Cap minZoom to 15 to ensure context around start/end.
        let minZoom = Math.min(fitZoom, 15);
        let maxZoom = 18; // Attempt max detail as requested

        let tiles = [];

        // Loop to reduce maxZoom if tile count exceeds limit
        while (true) {
             tiles = getTileUrls(bounds, minZoom, maxZoom, urlTemplate);
             if (tiles.length <= TILE_LIMIT || maxZoom <= minZoom) {
                 break;
             }
             console.warn(`Too many tiles (${tiles.length}) for z${minZoom}-z${maxZoom}. Reducing maxZoom to ${maxZoom - 1}.`);
             maxZoom--;
        }

        console.log(`Calculated ${tiles.length} tiles for zoom ${minZoom}-${maxZoom}`);

        if (tiles.length === 0) {
            console.warn('No tiles calculated within bounds.');
             const savedMaps = await getOfflineMaps();
             const filtered = savedMaps.filter((m: OfflineMap) => m.id !== route.id);
             const newMap: OfflineMap = {
                 ...route,
                 savedAt: Date.now(),
                 tileCount: 0
             };
             await AsyncStorage.setItem(OFFLINE_MAPS_KEY, JSON.stringify([newMap, ...filtered]));
            return;
        }

        // Notify total immediately
        onProgress(0, tiles.length);

        let completed = 0;
        let totalSize = 0;
        const total = tiles.length;

        // 5. Download and Save Manually
        // We do this sequentially or with limited concurrency to be nice to OSM
        // and to avoid browser network saturation.
        for (const tile of tiles) {
             const tileInfo = {
                 key: tile.key,
                 url: tile.url,
                 x: tile.x,
                 y: tile.y,
                 z: tile.z,
                 urlTemplate: urlTemplate,
                 createdAt: Date.now()
             };

             try {
                 const blob = await downloadTile(tileInfo.url);
                 if (blob) {
                    if (blob.size) {
                        totalSize += blob.size;
                    }
                    await saveTile(tileInfo, blob);
                 }
             } catch (e) {
                 console.error(`Failed to save tile ${tile.url}`, e);
                 // We continue even if one tile fails
             }

             completed++;
             onProgress(completed, total);

             // Small delay to yield to UI and be nice
             await new Promise(r => setTimeout(r, 10));
        }

        // 6. Save Metadata to AsyncStorage
        const savedMaps = await getOfflineMaps();
        const filtered = savedMaps.filter((m: OfflineMap) => m.id !== route.id);
        const newMap: OfflineMap = {
            ...route,
            savedAt: Date.now(),
            tileCount: total,
            size: totalSize
        };
        await AsyncStorage.setItem(OFFLINE_MAPS_KEY, JSON.stringify([newMap, ...filtered]));
        console.log('Metadata saved');

    } catch (error) {
        console.error('Save offline map failed', error);
        throw error;
    }
};

export const getOfflineMaps = async (): Promise<OfflineMap[]> => {
    try {
        const json = await AsyncStorage.getItem(OFFLINE_MAPS_KEY);
        const data = json ? JSON.parse(json) : [];
        // Ensure unique IDs
        const seen = new Set();
        return data.filter((item: OfflineMap) => {
            const duplicate = seen.has(item.id);
            seen.add(item.id);
            return !duplicate;
        });
    } catch (e) {
        return [];
    }
};

export const deleteOfflineMap = async (id: number): Promise<void> => {
    if (Platform.OS !== 'web' || !L) return;

    try {
        const maps = await getOfflineMaps();
        const target = maps.find(m => m.id === id);

        // Remove from List
        const newMaps = maps.filter(m => m.id !== id);
        await AsyncStorage.setItem(OFFLINE_MAPS_KEY, JSON.stringify(newMaps));

        // Ideally remove from IndexedDB via leaflet.offline if possible,
        // but it requires matching keys.
        // For now, metadata removal effectively "hides" it.
        // Browser storage management handles the rest eventually.
    } catch (e) {
        console.error('Failed to delete map', e);
    }
};
