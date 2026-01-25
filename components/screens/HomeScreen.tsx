import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, Platform, useWindowDimensions } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Appbar, Card, Avatar, Chip, Searchbar, Button, Snackbar, ActivityIndicator, useTheme, Text, Surface, IconButton, Divider } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { FeatureCollection } from 'geojson';
import i18n from '../i18n/i18n';
import { fetchIssues, type RouteIssue, type RouteFilters } from '../apis/GitHubAPI';
import { readData } from '../apis/StorageAPI';
import tokml from 'geojson-to-kml';
import togpx from 'togpx';
import Redirector from '../Redirector';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { downloadFile } from '../../utils/FileHelper';

const FILTERS: RouteFilters = { state: 'all' };
const PER_PAGE = 10;

interface SnackbarState {
  isVisible: boolean;
  message: string;
}

const INITIAL_SNACKBAR_STATE: SnackbarState = {
  isVisible: false,
  message: '',
};

const convertBlobUrlToRawUrl = (githubBlobUrl: string): string => {
  return githubBlobUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
};

const HomeScreen = (): React.ReactElement => {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // Responsive Layout Calculation
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
  const contentMaxWidth = isDesktop ? 1200 : 800; // Wider on desktop

  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [issues, setIssues] = useState<RouteIssue[]>([]);
  const pageRef = useRef(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(INITIAL_SNACKBAR_STATE);

  const showSnackbar = useCallback((message: string) => {
    setSnackbar({ isVisible: true, message });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar(INITIAL_SNACKBAR_STATE);
  }, []);

  const downloadGpxFile = useCallback(
    async (name: string, url?: string | null) => {
      if (!url || url.indexOf('github') === -1) {
        showSnackbar(i18n.t('home_download_prep'));
        return;
      }

      try {
        const response = await fetch(convertBlobUrlToRawUrl(url));
        const geoJsonData = (await response.json()) as FeatureCollection;
        const data = togpx(geoJsonData);
        const filename = name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.gpx';
        await downloadFile(data, filename, 'application/gpx+xml');
      } catch (error) {
        console.error('Failed to download gpx or convert GeoJSON', error);
        showSnackbar(i18n.t('home_download_prep'));
      }
    },
    [showSnackbar],
  );

  const downloadKmlFile = useCallback(
    async (name: string, url?: string | null) => {
      if (!url || url.indexOf('github') === -1) {
        showSnackbar(i18n.t('home_download_prep'));
        return;
      }

      try {
        const response = await fetch(convertBlobUrlToRawUrl(url));
        const geoJsonData = (await response.json()) as FeatureCollection;
        const data = tokml(geoJsonData);
        const filename = name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.kml';
        await downloadFile(data, filename, 'application/vnd.google-earth.kml+xml');
      } catch (error) {
        console.error('Failed to download kml or convert GeoJSON', error);
        showSnackbar(i18n.t('home_download_prep'));
      }
    },
    [showSnackbar],
  );

  const loadIssues = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const token = await readData('github_access_token');
      if (token) {
        setGithubToken(token);
      }

      const issuesData = await fetchIssues(pageRef.current, PER_PAGE, FILTERS, token, searchQuery);
      if (issuesData.length > 0) {
        setIssues((prevIssues) => [...prevIssues, ...issuesData]);
        pageRef.current += 1;
        setCurrentPage(pageRef.current);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, searchQuery]);

  useEffect(() => {
    loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetAndLoad = useCallback(() => {
    pageRef.current = 1;
    setCurrentPage(1);
    setIssues([]);
    setIsLoading(false); // Reset loading state
    loadIssues();
  }, [loadIssues]);

  const handleToDetail = useCallback(() => {
    // TODO: implement route detail navigation when available
  }, []);

  const renderItem: ListRenderItem<RouteIssue> = useCallback(
    ({ item, index }) => {
      const geoJsonUri = item.geojson?.uri ?? null;
      const coverUri = item.coverimg?.uri ?? null;

      // Extract Labels
      const difficultyLabel = item.labels.find(l => ['easy', 'normal', 'moderate', 'hard'].includes(l.name));
      const difficultyColor = difficultyLabel?.name === 'hard' ? theme.colors.error :
        difficultyLabel?.name === 'moderate' ? theme.colors.tertiary :
          difficultyLabel?.name === 'normal' ? theme.colors.secondary : theme.colors.primary;

      const otherLabels = item.labels.filter(l => l.name !== difficultyLabel?.name);

      return (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={{ flex: 1, padding: 8 }}>
          <Pressable onPress={handleToDetail} style={{ flex: 1 }}>
            <Surface style={[styles.cardSurface, { backgroundColor: theme.colors.surface }]} elevation={1}>
              {/* Image Section */}
              <View style={styles.imageContainer}>
                {/* ... */}
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

                {/* Description Preview (Optional) */}
                {/* {item.body && (
                         <Text variant="bodySmall" numberOfLines={2} style={{marginTop: 8, color: theme.colors.onSurfaceVariant}}>
                             {item.body}
                         </Text>
                    )} */}

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
                  <Button mode="text" compact onPress={() => downloadGpxFile(item.title, geoJsonUri)} disabled={!geoJsonUri} labelStyle={{ fontSize: 12 }}>
                    GPX
                  </Button>
                  <Button mode="text" compact onPress={() => downloadKmlFile(item.title, geoJsonUri)} disabled={!geoJsonUri} labelStyle={{ fontSize: 12 }}>
                    KML
                  </Button>
                  <IconButton icon="arrow-right" size={20} iconColor={theme.colors.primary} style={{ marginLeft: 'auto', margin: 0 }} onPress={handleToDetail} />
                </View>
              </View>
            </Surface>
          </Pressable>
        </Animated.View>
      );
    },
    [downloadGpxFile, downloadKmlFile, handleToDetail, theme],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Redirector />
      {/* Header with Search */}
      <Surface style={[styles.headerContainer, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={[styles.headerContent, { maxWidth: contentMaxWidth }]}>
          <View style={styles.appBarRow}>
            {/* Integrated Search Bar as Title/Main Element */}
            <Searchbar
              style={[styles.searchbar, { backgroundColor: theme.colors.surfaceVariant, flex: 1, marginRight: 8 }]}
              inputStyle={{ minHeight: 0 }}
              mode="bar"
              placeholder="GPS軌跡ログの検索"
              onChangeText={setSearchQuery}
              value={searchQuery}
              onSubmitEditing={resetAndLoad}
              onIconPress={resetAndLoad}
              icon="magnify"
            />

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton icon="refresh" onPress={resetAndLoad} />
              <Appbar.Action icon="github" color={githubToken ? theme.colors.primary : theme.colors.outline} />
            </View>
          </View>
        </View>
      </Surface>

      <View style={[styles.contentContainer, { maxWidth: contentMaxWidth }]}>
        {isLoading && issues.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" animating={true} color={theme.colors.primary} />
          </View>
        ) : (
          <FlashList<RouteIssue>
            key={numColumns} // Force re-render when columns change
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            data={issues}
            numColumns={numColumns}
            onEndReached={() => { void loadIssues(); }}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={350}
            showsVerticalScrollIndicator={Platform.OS === 'web'} // Better scroll experience on web
          />
        )}
      </View>

      <Snackbar visible={snackbar.isVisible} onDismiss={hideSnackbar} action={{ label: 'Close', onPress: hideSnackbar }}>
        {snackbar.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
    zIndex: 1,
    // Web shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    width: '100%',
    alignSelf: 'center',
  },
  appBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchbar: {
    borderRadius: 24, // Pill shape
    height: 48,
  },
  listContent: {
    padding: 8,
    paddingBottom: 40,
  },
  // New Card Styles
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
  difficultyBadge: { // Keeping for legacy fallback but unused now
    position: 'absolute',
    top: 12,
    right: 12,
    height: 24,
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

export default HomeScreen;
