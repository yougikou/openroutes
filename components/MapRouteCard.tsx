import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, Linking } from 'react-native';
import { Surface, Text, Button, IconButton, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from './i18n/i18n';

// Minimal interface for route properties from GeoJSON
interface RouteProperties {
  id: number | string;
  title: string;
  distance_km?: number;
  duration_hour?: number;
  difficulty?: string;
  type?: string;
  [key: string]: any;
}

interface MapRouteCardProps {
  routes: RouteProperties[];
  onClose: () => void;
}

export default function MapRouteCard({ routes, onClose }: MapRouteCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  // Reset index when routes change
  useEffect(() => {
    setIndex(0);
  }, [routes]);

  if (!routes || routes.length === 0) return null;

  const current = routes[index];

  // Adjust layout for small screens to avoid overlapping FABs
  // FABs are at bottom: 140 and bottom: 80.
  // Card is at bottom: 20.
  // If card is wide, it might overlap if right margin isn't large enough.
  const isSmallScreen = width < 768;

  const dynamicContainerStyle = {
      right: isSmallScreen ? 80 : 16,
      left: 16,
      width: 'auto' as const,
      maxWidth: 600,
  };

  const handleNext = () => setIndex((prev) => (prev + 1) % routes.length);
  const handlePrev = () => setIndex((prev) => (prev - 1 + routes.length) % routes.length);

  const handleDetail = () => {
      router.push({
          pathname: '/app/detail',
          params: { id: current.id.toString() }
      });
  };

  const handleNavigation = () => {
      if (!current.geometry || !current.geometry.coordinates) return;
      const [lng, lat] = current.geometry.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      Linking.openURL(url);
  };

  const getTypeIcon = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'hiking': return 'hiking';
      case 'cycling': return 'bike';
      case 'walking': return 'walk';
      default: return 'map-marker';
    }
  };

  const getDifficultyColor = (difficulty: string | undefined) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#4CAF50'; // Green
      case 'normal': return '#2196F3'; // Blue
      case 'moderate': return '#FF9800'; // Orange
      case 'hard': return '#F44336'; // Red
      default: return theme.colors.outline;
    }
  };

  return (
    <Surface style={[styles.container, dynamicContainerStyle, { backgroundColor: theme.colors.surface }]} elevation={4}>
      {/* Header with Title, Icon, Tag */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
            <View style={styles.titleRow}>
                <Text variant="titleMedium" numberOfLines={1} style={styles.titleText}>
                  {current.title || `Route #${current.id}`}
                </Text>
            </View>

            <View style={styles.infoRow}>
                {current.type && (
                     <MaterialCommunityIcons
                        name={getTypeIcon(current.type)}
                        size={20}
                        color={theme.colors.primary}
                        style={styles.typeIcon}
                     />
                )}

                {current.difficulty && (
                     <View style={[styles.difficultyTag, { backgroundColor: getDifficultyColor(current.difficulty) }]}>
                        <Text style={styles.difficultyText}>
                           {i18n.t(current.difficulty.toLowerCase())}
                        </Text>
                     </View>
                )}
            </View>

            {routes.length > 1 && (
                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                    {index + 1} / {routes.length}
                </Text>
            )}
        </View>
        <IconButton icon="close" size={20} onPress={onClose} style={styles.closeButton} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={16} color={theme.colors.onSurfaceVariant} style={{ marginRight: 4 }} />
            <Text variant="bodyMedium">
              {current.distance_km ? `${current.distance_km} km` : '--'}
            </Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.onSurfaceVariant} style={{ marginRight: 4 }} />
            <Text variant="bodyMedium">
              {current.duration_hour ? `${current.duration_hour} h` : '--'}
            </Text>
          </View>
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <View style={styles.navButtons}>
             {routes.length > 1 && (
                <>
                <IconButton icon="chevron-left" onPress={handlePrev} size={20} />
                <IconButton icon="chevron-right" onPress={handleNext} size={20} />
                </>
             )}
        </View>

        <View style={styles.rightButtons}>
          <IconButton
            icon="navigation"
            size={24}
            iconColor={theme.colors.primary}
            onPress={handleNavigation}
            style={styles.actionIcon}
          />
          <IconButton
            icon="arrow-right"
            size={24}
            iconColor={theme.colors.primary}
            onPress={handleDetail}
            style={styles.actionIcon}
          />
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    borderRadius: 16,
    padding: 16,
    zIndex: 2000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerContent: {
      flex: 1,
      paddingRight: 4,
  },
  titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      flexWrap: 'wrap',
  },
  infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
  },
  titleText: {
      fontWeight: 'bold',
      marginRight: 8,
      flexShrink: 1,
  },
  typeIcon: {
      marginRight: 8,
  },
  difficultyTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
  },
  difficultyText: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
      textTransform: 'uppercase',
  },
  closeButton: {
      margin: 0,
      marginTop: -8,
      marginRight: -8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 8,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statSeparator: {
    width: 1,
    height: 16,
    backgroundColor: '#ccc',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButtons: {
    flexDirection: 'row',
  },
  rightButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    alignItems: 'center',
  },
  actionIcon: {
    margin: 0,
    marginLeft: 8,
  }
});
