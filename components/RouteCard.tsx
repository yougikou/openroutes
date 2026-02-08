import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Surface, Text, Avatar, IconButton, Button, Divider, useTheme } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from './i18n/i18n';
import type { RouteIssue } from './apis/GitHubAPI';

interface RouteCardProps {
  item: RouteIssue;
  index: number;
  shouldAnimate?: boolean;
  onDetailPress: (item: RouteIssue) => void;
  onGpxPress: (title: string, uri: string | null) => void;
  onKmlPress: (title: string, uri: string | null) => void;
  onMapPress: (uri: string | null, title: string) => void;
}

const RouteCard = memo(({ item, index, shouldAnimate = true, onDetailPress, onGpxPress, onKmlPress, onMapPress }: RouteCardProps) => {
  const theme = useTheme();
  const geoJsonUri = item.geojson?.uri ?? null;
  const coverUri = item.coverimg?.uri ?? null;

  // Extract Labels
  const difficultyLabel = item.labels.find(l => ['easy', 'normal', 'moderate', 'hard'].includes(l.name));
  const difficultyColor = difficultyLabel?.name === 'hard' ? theme.colors.error :
    difficultyLabel?.name === 'moderate' ? theme.colors.tertiary :
      difficultyLabel?.name === 'normal' ? theme.colors.secondary : theme.colors.primary;

  const otherLabels = item.labels.filter(l => l.name !== difficultyLabel?.name);

  return (
    <Animated.View entering={shouldAnimate ? FadeInDown.delay(index * 50).springify() : undefined} style={{ flex: 1, padding: 8 }}>
      <Pressable onPress={() => onDetailPress(item)} style={{ flex: 1 }}>
        <Surface style={[styles.cardSurface, { backgroundColor: theme.colors.surface }]} elevation={1}>
          {/* Image Section */}
          <View style={styles.imageContainer}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.cardImage} contentFit="cover" />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: theme.colors.surfaceVariant }]}>
                <IconButton icon="map-marker-path" size={48} iconColor={theme.colors.outlineVariant} />
              </View>
            )}
            {difficultyLabel && (
              <View style={[styles.customBadge, { backgroundColor: theme.colors.surface }]}>
                <Text style={{ color: difficultyColor, fontWeight: 'bold', fontSize: 10, lineHeight: 12 }}>
                  {i18n.t(difficultyLabel.name).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Content Section */}
          <View style={styles.cardContent}>
            {/* Header: Title and Avatar */}
            <View style={styles.cardHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text variant="titleMedium" numberOfLines={2} style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                  {item.title}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Avatar.Image size={32} source={{ uri: item.user.avatar_url }} style={{ backgroundColor: 'transparent' }} />
            </View>

            {/* Stats Row */}
            <View style={[styles.statsRow, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color={theme.colors.onSurfaceVariant} style={{ marginRight: 4 }} />
                <Text variant="labelMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>
                  {item.distance ? `${item.distance} km` : '--'}
                </Text>
              </View>
              <View style={styles.statSeparator} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.onSurfaceVariant} style={{ marginRight: 4 }} />
                <Text variant="labelMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>
                  {item.duration ? `${item.duration} h` : '--'}
                </Text>
              </View>
            </View>

            {/* Tags */}
            {otherLabels.length > 0 && (
              <View style={styles.tagContainer}>
                {otherLabels.slice(0, 3).map(l => (
                  <View key={l.name} style={[styles.customTag, { borderColor: theme.colors.outline, borderWidth: StyleSheet.hairlineWidth }]}>
                    <Text style={{ fontSize: 10, color: theme.colors.onSurfaceVariant }}>
                      {i18n.t(l.name)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Divider style={{ marginVertical: 12 }} />

            {/* Actions */}
            <View style={styles.actionRow}>
              <Button mode="text" compact onPress={() => onGpxPress(item.title, geoJsonUri)} disabled={!geoJsonUri} labelStyle={{ fontSize: 12 }}>
                GPX
              </Button>
              <Button mode="text" compact onPress={() => onKmlPress(item.title, geoJsonUri)} disabled={!geoJsonUri} labelStyle={{ fontSize: 12 }}>
                KML
              </Button>
              <IconButton
                icon="map-search-outline"
                size={20}
                iconColor={theme.colors.primary}
                onPress={() => onMapPress(geoJsonUri, item.title)}
              />
              <IconButton icon="arrow-right" size={20} iconColor={theme.colors.primary} style={{ marginLeft: 'auto', margin: 0 }} onPress={() => onDetailPress(item)} />
            </View>
          </View>
        </Surface>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  cardSurface: {
    borderRadius: 16,
    overflow: 'hidden',
    height: '100%', // For grid alignment
    flexDirection: 'column',
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  customBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2, // Shadow for contrast against image
  },
  customTag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  cardContent: {
    padding: 12,
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statSeparator: {
    width: 1,
    height: '60%',
    backgroundColor: '#ccc'
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto', // Push to bottom
  }
});

export default RouteCard;
