import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, Linking, Alert } from 'react-native';
import { ActivityIndicator, FAB, Text, useTheme, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { fetchIssues, RouteIssue, uploadGeoJsonFile } from '../apis/GitHubAPI'; // check imports
import { convertBlobUrlToRawUrl } from '../../utils/url';

// Only import Leaflet modules on Web to avoid Metro bundler issues on Native
let MapContainer: any, TileLayer: any, GeoJSON: any, CircleMarker: any, Circle: any, Popup: any, Marker: any, useMap: any, L: any;

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
  webkitCompassHeading?: number;
}

if (Platform.OS === 'web') {
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

    const duration = 1000;
    const startTime = performance.now();

    const startLatLng = markerRef.current ? markerRef.current.getLatLng() : { lat: userLocation.coords.latitude, lng: userLocation.coords.longitude };
    const startLat = startLatLng.lat;
    const startLng = startLatLng.lng;

    const endLat = userLocation.coords.latitude;
    const endLng = userLocation.coords.longitude;
    const endAccuracy = userLocation.coords.accuracy || 0;

    const dist = Math.sqrt(Math.pow(endLat - startLat, 2) + Math.pow(endLng - startLng, 2));
    if (dist > 0.05) {
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
      const t = Math.min(elapsed / duration, 1);

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

const WorldMapScreen: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [routes, setRoutes] = useState<{ id: number; title: string; geoJson: any }[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Inject Leaflet CSS
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (!document.querySelector('#leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
    }
  }, []);

  // Track User Location (Background/Auto)
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let watchId: number | null = null;

    const startTrackingNative = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
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
          (error) => console.warn('Geolocation error:', error),
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      }
    } else {
      startTrackingNative();
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (subscription) subscription.remove();
    };
  }, []);

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
    if (Platform.OS === 'web') {
       window.addEventListener('deviceorientation', handleOrientation);
       return () => window.removeEventListener('deviceorientation', handleOrientation);
    }
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
     }
  };

  const handleLocateMe = async () => {
    if (Platform.OS !== 'web') return;
    handleEnableCompass();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        window.alert('Permission to access location was denied');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation(location);
      if (mapInstance) {
        mapInstance.flyTo([location.coords.latitude, location.coords.longitude], 15);
      }
    } catch (err) {
      console.warn(err);
      window.alert('Failed to get current location');
    }
  };

  const loadRoutes = async () => {
    if (loadingRoutes) return;
    setLoadingRoutes(true);
    try {
      const issues = await fetchIssues(1, 20); // Fetch top 20 routes
      const loadedRoutes: any[] = [];

      // Parallel fetch for GeoJSONs
      await Promise.all(issues.map(async (issue) => {
        if (issue.geojson?.uri) {
           try {
             const rawUrl = convertBlobUrlToRawUrl(issue.geojson.uri);
             const res = await fetch(rawUrl);
             if (res.ok) {
                const geoJson = await res.json();
                loadedRoutes.push({
                   id: issue.id,
                   title: issue.title,
                   geoJson: geoJson
                });
             }
           } catch (e) {
             console.warn('Failed to fetch GeoJSON for issue ' + issue.id);
           }
        }
      }));
      setRoutes(loadedRoutes);

      // Fit bounds if routes found
      if (loadedRoutes.length > 0 && mapInstance && L) {
         try {
           const group = L.featureGroup(loadedRoutes.map(r => L.geoJSON(r.geoJson)));
           mapInstance.fitBounds(group.getBounds(), { padding: [50, 50] });
         } catch (e) {
           console.warn("Bounds error", e);
         }
      }

    } catch (error) {
      console.error('Failed to load routes:', error);
      if (Platform.OS === 'web') window.alert('Failed to load routes');
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Initial Load
  useEffect(() => {
    loadRoutes();
  }, []);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.center}>
        <Text>Map view is currently supported on Web only.</Text>
      </View>
    );
  }

  if (Platform.OS === 'web' && (!MapContainer || !TileLayer)) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
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

            {routes.map(route => (
               <GeoJSON
                  key={route.id}
                  data={route.geoJson}
                  style={{ color: theme.colors.primary, weight: 3, opacity: 0.7 }}
                  onEachFeature={(feature: any, layer: any) => {
                    layer.bindPopup(route.title);
                  }}
               />
            ))}

            {userLocation && <UserLocationMarker userLocation={userLocation} heading={heading} />}
          </MapContainer>
       </View>

       <FAB
         icon="crosshairs-gps"
         style={[styles.locateFab, { backgroundColor: theme.colors.surface }]}
         onPress={handleLocateMe}
         accessibilityLabel="Locate Me"
         size="small"
       />

       <FAB
         icon="refresh"
         label={loadingRoutes ? "Loading..." : "Reload"}
         style={[styles.reloadFab, { backgroundColor: theme.colors.surface }]}
         onPress={loadRoutes}
         loading={loadingRoutes}
         size="small"
       />
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
  locateFab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 10000,
  },
  reloadFab: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10000,
  }
});

export default WorldMapScreen;
