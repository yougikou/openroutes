import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Linking, Alert } from 'react-native';
import { ActivityIndicator, FAB, Text, useTheme, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { convertBlobUrlToRawUrl } from '../../utils/url';

// Only import Leaflet modules on Web to avoid Metro bundler issues on Native
let MapContainer: any, TileLayer: any, GeoJSON: any, CircleMarker: any, Popup: any, useMap: any, L: any;

if (Platform.OS === 'web') {
  // Ensure we are in a browser environment before requiring Leaflet
  if (typeof window !== 'undefined') {
    try {
      const ReactLeaflet = require('react-leaflet');
      MapContainer = ReactLeaflet.MapContainer;
      TileLayer = ReactLeaflet.TileLayer;
      GeoJSON = ReactLeaflet.GeoJSON;
      CircleMarker = ReactLeaflet.CircleMarker;
      Popup = ReactLeaflet.Popup;
      useMap = ReactLeaflet.useMap;
      L = require('leaflet');
    } catch (e) {
      console.warn("Failed to load Leaflet modules", e);
    }
  }
}

const FitBounds = ({ data }: { data: any }) => {
  const map = useMap();
  useEffect(() => {
    if (data && map && L) {
      try {
        const geoJsonLayer = L.geoJSON(data);
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.error("Error fitting bounds", e);
      }
    }
  }, [data, map]);
  return null;
};

interface MapScreenProps {
  url?: string;
  title?: string;
  source?: string;
}

const MapScreen: React.FC<MapScreenProps> = ({ url, title, source }) => {
  const theme = useTheme();
  const router = useRouter();
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Inject Leaflet CSS
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if link already exists to avoid duplicates
      if (!document.querySelector('#leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      // Do not remove the stylesheet on unmount to prevent white screen/layout collapse during navigation
    }
  }, []);

  // Fetch GeoJSON
  useEffect(() => {
    const fetchData = async () => {
      if (!url) {
        setError('No GeoJSON URL provided');
        setLoading(false);
        return;
      }
      try {
        const rawUrl = convertBlobUrlToRawUrl(url);
        const response = await fetch(rawUrl);
        if (!response.ok) throw new Error('Failed to fetch GeoJSON');
        const data = await response.json();
        setGeoJsonData(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load route data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [url]);

  // Track User Location (Background/Auto)
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Permission to access location was denied');
          return;
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (location) => setUserLocation(location)
        );
      } catch (err) {
        console.warn('Location tracking error:', err);
      }
    };

    if (Platform.OS === 'web') {
        startTracking();
    }

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const handleOpenInBrowser = () => {
    if (Platform.OS === 'web') {
        window.open(window.location.href, '_blank');
    } else {
        if (url) Linking.openURL(convertBlobUrlToRawUrl(url));
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (Platform.OS === 'web' && source === 'home' && typeof window !== 'undefined') {
      // Force browser back to preserve scroll position on Home
      window.history.back();
    } else {
      router.replace('/(tabs)/');
    }
  };

  const handleLocateMe = async () => {
    if (Platform.OS !== 'web') return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') {
            window.alert('Permission to access location was denied');
        } else {
            Alert.alert('Permission denied', 'Allow location access to see your position.');
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation(location);

      if (mapInstance) {
        mapInstance.flyTo([location.coords.latitude, location.coords.longitude], 15);
      }
    } catch (err) {
      console.warn(err);
      if (Platform.OS === 'web') {
          window.alert('Failed to get current location');
      }
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.center}>
        <Text>Map view is currently supported on Web only.</Text>
        <Button mode="contained" onPress={handleBack} style={{marginTop: 20}}>Go Back</Button>
      </View>
    );
  }

  // Guard against server-side rendering where Leaflet is not loaded
  if (Platform.OS === 'web' && (!MapContainer || !TileLayer)) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>{error}</Text>
        <FAB icon="arrow-left" style={styles.backFab} onPress={handleBack} label="Back" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
       <View style={styles.mapContainer}>
          <MapContainer
            center={[0, 0]}
            zoom={2}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            ref={setMapInstance}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {geoJsonData && <GeoJSON key={url} data={geoJsonData} style={{ color: theme.colors.primary, weight: 4 }} />}
            {geoJsonData && <FitBounds data={geoJsonData} />}

            {userLocation && (
              <CircleMarker
                key={`${userLocation.timestamp}`}
                center={[userLocation.coords.latitude, userLocation.coords.longitude]}
                radius={8}
                pathOptions={{ color: 'white', fillColor: '#4285F4', fillOpacity: 1 }}
              >
                  <Popup>You are here</Popup>
              </CircleMarker>
            )}
          </MapContainer>
       </View>

       <FAB
         icon="arrow-left"
         style={[styles.backFab, { backgroundColor: theme.colors.surface }]}
         onPress={handleBack}
         size="small"
       />

       <FAB
         icon="crosshairs-gps"
         style={[styles.locateFab, { backgroundColor: theme.colors.surface }]}
         onPress={handleLocateMe}
         size="small"
       />

       <FAB
         icon="open-in-new"
         style={[styles.openFab, { backgroundColor: theme.colors.surface }]}
         onPress={handleOpenInBrowser}
         size="small"
         label="Open in New Window"
       />

       <View style={[styles.titleContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="titleMedium" numberOfLines={1}>{title || 'Route Map'}</Text>
       </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backFab: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10000,
  },
  locateFab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 10000,
  },
  openFab: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    zIndex: 10000,
  },
  titleContainer: {
    position: 'absolute',
    top: 16,
    left: 70,
    right: 16,
    padding: 8,
    borderRadius: 8,
    zIndex: 999,
    opacity: 0.9,
    alignItems: 'center',
  }
});

export default MapScreen;
