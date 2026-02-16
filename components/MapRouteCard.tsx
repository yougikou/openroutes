import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Surface, Text, Button, IconButton, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
  const [index, setIndex] = useState(0);

  // Reset index when routes change
  useEffect(() => {
    setIndex(0);
  }, [routes]);

  if (!routes || routes.length === 0) return null;

  const current = routes[index];

  const handleNext = () => setIndex((prev) => (prev + 1) % routes.length);
  const handlePrev = () => setIndex((prev) => (prev - 1 + routes.length) % routes.length);

  const handleDetail = () => {
      router.push({
          pathname: '/app/detail',
          params: { id: current.id.toString() }
      });
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]} elevation={4}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
            <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: 'bold' }}>
              {current.title || `Route #${current.id}`}
            </Text>
            {routes.length > 1 && (
                <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                    {index + 1} / {routes.length}
                </Text>
            )}
        </View>
        <IconButton icon="close" size={20} onPress={onClose} style={{ margin: 0 }} />
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
          {current.difficulty && (
              <>
                  <View style={styles.statSeparator} />
                  <View style={styles.statItem}>
                    <Text variant="bodyMedium" style={{ textTransform: 'capitalize' }}>
                      {current.difficulty}
                    </Text>
                  </View>
              </>
          )}
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        {routes.length > 1 ? (
          <View style={styles.navButtons}>
            <IconButton icon="chevron-left" onPress={handlePrev} disabled={routes.length <= 1} />
            <IconButton icon="chevron-right" onPress={handleNext} disabled={routes.length <= 1} />
          </View>
        ) : <View style={{flex: 1}} />}

        <Button mode="contained" onPress={handleDetail} style={styles.detailButton}>
          View Details
        </Button>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    zIndex: 2000, // Above FAB and Map
    maxWidth: 600, // Limit width on large screens
    alignSelf: 'center', // Center horizontally if maxWidth applies
    width: Platform.OS === 'web' ? '90%' : 'auto',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'space-around', // Distribute evenly
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 16,
  },
  detailButton: {
    marginLeft: 'auto',
  }
});
