import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, Linking, Alert } from 'react-native';
import { ActivityIndicator, FAB, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { convertBlobUrlToRawUrl } from '../../utils/url';
import MapRouteCard from '../MapRouteCard';

// Only import Leaflet modules on Web
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMap: any, L: any;
let MarkerClusterGroup: any;

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
      Marker = ReactLeaflet.Marker;
      Popup = ReactLeaflet.Popup;
      useMap = ReactLeaflet.useMap;
      L = require('leaflet');

      // Dynamic import for clustering
      // Note: react-leaflet-cluster exports default
      const ClusterModule = require('react-leaflet-cluster');
      MarkerClusterGroup = ClusterModule.default || ClusterModule;

      // Fix for Leaflet default icon issues in Webpack/Expo
      // This is often needed in React Leaflet setups
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
        iconUrl: require('leaflet/dist/images/marker-icon.png'),
        shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
      });

    } catch (e) {
      console.warn("Failed to load Leaflet modules", e);
    }
  }
}

const UserLocationMarker = ({ userLocation, heading, visible }: { userLocation: Location.LocationObject, heading?: number | null, visible: boolean }) => {
  const markerRef = React.useRef<any>(null);
  const accuracyCircleRef = React.useRef<any>(null);
  const headingMarkerRef = React.useRef<any>(null);
  const requestRef = React.useRef<number>();

  // Lazy load Circle and CircleMarker only when rendering to avoid early access errors
  const Circle = require('react-leaflet').Circle;
  const CircleMarker = require('react-leaflet').CircleMarker;

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

  if (!userLocation || !visible) return null;

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

const InitialMapFocus = ({ location, setHasFlown }: { location: Location.LocationObject, setHasFlown: (v: boolean) => void }) => {
    const map = useMap();
    useEffect(() => {
        if (location) {
            // Calculate bounds for ~100km radius (approx +/- 0.9 deg lat)
            const lat = location.coords.latitude;
            const lng = location.coords.longitude;
            const latDelta = 0.9;
            // Longitude delta depends on latitude: delta = 0.9 / cos(lat)
            // Use Math.max to avoid division by zero or extreme values
            const lngDelta = 0.9 / Math.max(0.1, Math.cos(lat * (Math.PI / 180)));

            const bounds = [
                [lat - latDelta, lng - lngDelta],
                [lat + latDelta, lng + lngDelta]
            ];

            map.fitBounds(bounds as any);
            setHasFlown(true);
        }
    }, [location, map, setHasFlown]);
    return null;
};

const WorldMapScreen: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [hasFlownToUser, setHasFlownToUser] = useState(false);
  const [selectedRoutes, setSelectedRoutes] = useState<any[]>([]);

  // Inject Leaflet CSS and MarkerCluster CSS
  useEffect(() => {
    if (Platform.OS === 'web') {
      const cssUrls = [
          'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
          // Marker Cluster CSS (Default theme)
          'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
          'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css'
      ];

      cssUrls.forEach(url => {
          if (!document.querySelector(`link[href="${url}"]`)) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = url;
              document.head.appendChild(link);
          }
      });
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

  const loadRoutesIndex = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Construct URL for assets/routes-index.geojson
      // Default fallback
      const owner = process.env.EXPO_PUBLIC_GITHUB_OWNER || 'yougikou';
      const repo = process.env.EXPO_PUBLIC_GITHUB_REPO || 'openroutes';
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/assets/routes-index.geojson`;

      const res = await fetch(url);
      if (res.ok) {
          const data = await res.json();
          setGeoData(data);
      } else {
          console.warn('Failed to fetch routes-index.geojson', res.status);
      }

    } catch (error) {
      console.error('Failed to load routes index:', error);
      if (Platform.OS === 'web') window.alert('Failed to load routes index');
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    loadRoutesIndex();
  }, []);

  const routeMap = React.useMemo(() => {
      if (!geoData) return new Map();
      return new Map(geoData.features.map((f: any) => [f.properties.id.toString(), f.properties]));
  }, [geoData]);

  const handleMarkerClick = (id: number) => {
      const route = routeMap.get(id.toString());
      if (route) {
          setSelectedRoutes([route]);
      }
  };

  const handleClusterClick = (event: any) => {
      const markers = event.layer.getAllChildMarkers();
      const ids = markers.map((m: any) => m.options.title);
      const routes = ids.map((id: string) => routeMap.get(id)).filter(Boolean);

      if (routes.length > 0) {
          setSelectedRoutes(routes);
      }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.center}>
        <Text>Map view is currently supported on Web only.</Text>
      </View>
    );
  }

  if (Platform.OS === 'web' && (!MapContainer || !TileLayer || !MarkerClusterGroup)) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Tokyo as default center if no user location yet
  const defaultCenter = [35.6895, 139.6917];

  return (
    <View style={styles.container}>
       <View style={styles.mapContainer}>
          <MapContainer
            center={defaultCenter}
            zoom={5}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            ref={setMapInstance}
            maxZoom={18}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Auto-center on user location once found (only once) */}
            {!hasFlownToUser && userLocation && <InitialMapFocus location={userLocation} setHasFlown={setHasFlownToUser} />}

            {geoData && (
                <MarkerClusterGroup
                    chunkedLoading
                    zoomToBoundsOnClick={false}
                    eventHandlers={{ clusterclick: handleClusterClick }}
                >
                    {geoData.features.map((feature: any, index: number) => {
                        const [lng, lat] = feature.geometry.coordinates;
                        const { id, title } = feature.properties;
                        return (
                            <Marker
                                key={id || index}
                                position={[lat, lng]}
                                title={id.toString()}
                                eventHandlers={{
                                    click: () => handleMarkerClick(id)
                                }}
                            >
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            )}

            {userLocation && <UserLocationMarker userLocation={userLocation} heading={heading} visible={hasFlownToUser} />}
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
         label={loading ? "Loading..." : "Reload"}
         style={[styles.reloadFab, { backgroundColor: theme.colors.surface }]}
         onPress={loadRoutesIndex}
         loading={loading}
         size="small"
       />

       {selectedRoutes.length > 0 && (
           <MapRouteCard routes={selectedRoutes} onClose={() => setSelectedRoutes([])} />
       )}
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
