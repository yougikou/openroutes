import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, Linking, Alert } from 'react-native';
import { ActivityIndicator, FAB, Text, useTheme, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { convertBlobUrlToRawUrl } from '../../utils/url';

// Only import Leaflet modules on Web to avoid Metro bundler issues on Native
let MapContainer: any, TileLayer: any, GeoJSON: any, CircleMarker: any, Circle: any, Popup: any, Marker: any, useMap: any, L: any;

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
  webkitCompassHeading?: number;
}

if (Platform.OS === 'web') {
  // Ensure we are in a browser environment before requiring Leaflet
  if (typeof window !== 'undefined') {
    try {
      const ReactLeaflet = require('react-leaflet');
      MapContainer = ReactLeaflet.MapContainer;
      TileLayer = ReactLeaflet.TileLayer;
      GeoJSON = ReactLeaflet.GeoJSON;
      CircleMarker = ReactLeaflet.CircleMarker;
      Circle = ReactLeaflet.Circle;
      Popup = ReactLeaflet.Popup;
      Marker = ReactLeaflet.Marker;
      useMap = ReactLeaflet.useMap;
      L = require('leaflet');
    } catch (e) {
      console.warn("Failed to load Leaflet modules", e);
    }
  }
}

const UserLocationMarker = ({ userLocation, heading }: { userLocation: Location.LocationObject, heading?: number | null }) => {
  const markerRef = React.useRef<any>(null);
  const accuracyCircleRef = React.useRef<any>(null);
  const headingMarkerRef = React.useRef<any>(null);
  const requestRef = React.useRef<number>();

  useEffect(() => {
    if (!userLocation) return;

    const duration = 1000; // ms
    const startTime = performance.now();

    // Get start position from map instance if available, else use userLocation
    // We try to use the current visual position to ensure smooth transition
    const startLatLng = markerRef.current ? markerRef.current.getLatLng() : { lat: userLocation.coords.latitude, lng: userLocation.coords.longitude };
    const startLat = startLatLng.lat;
    const startLng = startLatLng.lng;

    const endLat = userLocation.coords.latitude;
    const endLng = userLocation.coords.longitude;
    const endAccuracy = userLocation.coords.accuracy || 0;

    // Check distance to avoid animating across the world on first load or huge jumps
    const dist = Math.sqrt(Math.pow(endLat - startLat, 2) + Math.pow(endLng - startLng, 2));
    if (dist > 0.05) { // If jumped > ~5km (roughly), don't animate, just set.
      if (markerRef.current) markerRef.current.setLatLng([endLat, endLng]);
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([endLat, endLng]);
        accuracyCircleRef.current.setRadius(endAccuracy);
      }
      if (headingMarkerRef.current) {
        headingMarkerRef.current.setLatLng([endLat, endLng]);
      }
      return;
    }

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1); // 0 to 1

      // Linear interpolation
      const currentLat = startLat + (endLat - startLat) * t;
      const currentLng = startLng + (endLng - startLng) * t;

      if (markerRef.current) {
        markerRef.current.setLatLng([currentLat, currentLng]);
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([currentLat, currentLng]);
        accuracyCircleRef.current.setRadius(endAccuracy);
      }
      if (headingMarkerRef.current) {
        headingMarkerRef.current.setLatLng([currentLat, currentLng]);
      }

      if (t < 1) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [userLocation]);

  useEffect(() => {
    if (headingMarkerRef.current && heading != null) {
       const el = headingMarkerRef.current.getElement();
       if (el) {
          const inner = el.querySelector('.heading-arrow');
          if (inner) {
             (inner as HTMLElement).style.transform = `rotate(${heading}deg)`;
          }
       }
    }
  }, [heading]);

  const headingIcon = React.useMemo(() => {
     if (!L) return null;
     return L.divIcon({
        className: '',
        iconSize: [80, 80],
        iconAnchor: [40, 40],
        html: `<div class="heading-arrow" style="width: 80px; height: 80px; display: flex; justify-content: center; align-items: center; transform-origin: center; pointer-events: none;">
                 <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style="display:block;">
                   <defs>
                     <radialGradient id="fanGradient" cx="40" cy="40" r="40" gradientUnits="userSpaceOnUse">
                       <stop offset="0%" stop-color="#4285F4" stop-opacity="0.5" />
                       <stop offset="100%" stop-color="#4285F4" stop-opacity="0" />
                     </radialGradient>
                   </defs>
                   <path d="M40 40 L17 7 A 40 40 0 0 1 63 7 Z" fill="url(#fanGradient)" />
                 </svg>
               </div>`
     });
  }, []);

  if (!userLocation) return null;

  return (
    <>
      <Circle
        ref={accuracyCircleRef}
        center={[userLocation.coords.latitude, userLocation.coords.longitude]}
        radius={userLocation.coords.accuracy || 0}
        pathOptions={{ color: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.2, stroke: false }}
      />
      {heading != null && headingIcon && (
         <Marker
           ref={headingMarkerRef}
           position={[userLocation.coords.latitude, userLocation.coords.longitude]}
           icon={headingIcon}
           zIndexOffset={0}
         />
      )}
      <CircleMarker
        ref={markerRef}
        center={[userLocation.coords.latitude, userLocation.coords.longitude]}
        radius={8}
        pathOptions={{ color: 'white', fillColor: '#4285F4', fillOpacity: 1, weight: 2 }}
      >
        <Popup>You are here</Popup>
      </CircleMarker>
    </>
  );
};

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
  const [heading, setHeading] = useState<number | null>(null);
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
    }

    return () => {
      if (Platform.OS === 'web') {
        const link = document.getElementById('leaflet-css');
        if (link) {
          link.remove();
        }
      }
    };
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
    let watchId: number | null = null;

    const startTrackingNative = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Permission to access location was denied');
          return;
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
          (location) => setUserLocation(location)
        );
      } catch (err) {
        console.warn('Location tracking error:', err);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setUserLocation({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude,
                accuracy: position.coords.accuracy,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
              },
              timestamp: position.timestamp,
            });
          },
          (error) => {
            console.warn('Geolocation error:', error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
          }
        );
      }
    } else {
      startTrackingNative();
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (subscription) {
        try {
          subscription.remove();
        } catch (e) {
          console.warn('Failed to remove location subscription', e);
        }
      }
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
    } else {
      router.replace('/(tabs)/');
    }
  };

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let compass = 0;
    const iOS = event as DeviceOrientationEventiOS;
    if (iOS.webkitCompassHeading !== undefined && iOS.webkitCompassHeading !== null) {
      compass = iOS.webkitCompassHeading;
    } else if (event.alpha !== null) {
       compass = Math.abs(event.alpha - 360) % 360;
    }
    setHeading(compass);
  }, []);

  useEffect(() => {
    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [handleOrientation]);

  const handleEnableCompass = async () => {
     if (Platform.OS !== 'web') return;

     if (typeof (DeviceOrientationEvent as unknown as DeviceOrientationEventiOS).requestPermission === 'function') {
        try {
           const permission = await (DeviceOrientationEvent as unknown as DeviceOrientationEventiOS).requestPermission!();
           if (permission === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
           }
        } catch (error) {
           console.warn('Compass permission error:', error);
        }
     } else {
        window.addEventListener('deviceorientation', handleOrientation);
     }
  };

  const handleLocateMe = async () => {
    if (Platform.OS !== 'web') return;

    handleEnableCompass();

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

            {userLocation && <UserLocationMarker userLocation={userLocation} heading={heading} />}
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
         accessibilityLabel="Locate Me"
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
