import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable, useWindowDimensions, Platform } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Appbar, Card, Avatar, Chip, Searchbar, Button, Snackbar, ActivityIndicator, useTheme } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { FeatureCollection } from 'geojson';
import i18n from '../i18n/i18n';
import { fetchIssues, type RouteIssue, type RouteFilters } from '../apis/GitHubAPI';
import { readData } from '../apis/StorageAPI';
import tokml from 'geojson-to-kml';
import togpx from 'togpx';
import Redirector from '../Redirector';

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

const downloadFile = (data: string, filename: string, mimeType: string): void => {
  if (Platform.OS !== 'web') {
    console.warn('File download is currently only supported on web platform.');
    return;
  }

  const blob = new Blob([data], { type: mimeType });
  const href = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(href);
};

const convertBlobUrlToRawUrl = (githubBlobUrl: string): string => {
  return githubBlobUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
};

const HomeScreen = (): React.ReactElement => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width, 800);

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
        const filename = name + '.gpx';
        downloadFile(data, filename, 'application/gpx+xml');
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
        const filename = name + '.kml';
        downloadFile(data, filename, 'application/vnd.google-earth.kml+xml');
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
      return (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
          <Pressable onPress={handleToDetail}>
            <Card style={styles.card} mode="elevated" elevation={1}>
              {coverUri ? <Card.Cover source={{ uri: coverUri }} style={styles.cardCover} /> : null}
              <Card.Title
                title={item.title}
                subtitle={new Date(item.created_at).toLocaleDateString()}
                left={(props) => (
                  <Avatar.Image
                    {...props}
                    size={40}
                    source={{ uri: item.user.avatar_url }}
                    style={styles.avatar}
                  />
                )}
              />
              <Card.Content>
                <View style={styles.row}>
                  {item.distance ? (
                    <Chip style={styles.chip} icon="map-marker-distance" compact>
                      {item.distance} {i18n.t('home_unit_km')}
                    </Chip>
                  ) : null}
                  {item.duration ? (
                    <Chip style={styles.chip} icon="clock" compact>
                      {item.duration} {i18n.t('home_unit_hour')}
                    </Chip>
                  ) : null}
                  {item.labels.map((label) => (
                    <Chip key={label.name} style={styles.chip} compact mode="outlined">
                      {i18n.t(label.name, { defaultValue: label.name })}
                    </Chip>
                  ))}
                </View>
              </Card.Content>
              <Card.Actions style={styles.cardActions}>
                <Button mode="text" onPress={() => downloadGpxFile(item.title, geoJsonUri)} disabled={!geoJsonUri} textColor={theme.colors.primary}>
                  GPX
                </Button>
                <Button mode="text" onPress={() => downloadKmlFile(item.title, geoJsonUri)} disabled={!geoJsonUri} textColor={theme.colors.primary}>
                  KML
                </Button>
                <Button mode="contained" onPress={handleToDetail} disabled style={{marginLeft: 'auto'}}>
                  {i18n.t('home_detail')}
                </Button>
              </Card.Actions>
            </Card>
          </Pressable>
        </Animated.View>
      );
    },
    [downloadGpxFile, downloadKmlFile, handleToDetail, theme.colors.primary],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Redirector />
      <Appbar.Header elevated>
        <Appbar.Content title={i18n.t('title_explore')} />
        <Appbar.Action icon="refresh" onPress={resetAndLoad} />
        <Appbar.Action icon="github" color={githubToken ? theme.colors.primary : undefined} />
      </Appbar.Header>

      <View style={[styles.contentContainer, { width: containerWidth }]}>
        <Searchbar
          style={styles.searchbar}
          mode="bar"
          placeholder={i18n.t('home_search')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          elevation={1}
          onSubmitEditing={resetAndLoad}
          onIconPress={resetAndLoad}
        />

        {isLoading && issues.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" animating={true} color={theme.colors.primary} />
          </View>
        ) : (
          <FlashList<RouteIssue>
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            data={issues}
            onEndReached={() => { void loadIssues(); }}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={300}
          />
        )}
      </View>

      <Snackbar visible={snackbar.isVisible} onDismiss={hideSnackbar} action={{label: 'Close', onPress: hideSnackbar}}>
        {snackbar.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center', // Center content for desktop
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchbar: {
    margin: 16,
    borderRadius: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginBottom: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  cardCover: {
    height: 180,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  avatar: {
    backgroundColor: 'transparent',
  },
  cardActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  }
});

export default HomeScreen;
