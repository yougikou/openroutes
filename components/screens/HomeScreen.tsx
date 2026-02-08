import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Appbar, Searchbar, Snackbar, ActivityIndicator, useTheme, Surface, IconButton } from 'react-native-paper';
import type { FeatureCollection } from 'geojson';
import i18n from '../i18n/i18n';
import { fetchIssues, type RouteIssue, type RouteFilters } from '../apis/GitHubAPI';
import { readData } from '../apis/StorageAPI';
import tokml from 'geojson-to-kml';
import togpx from 'togpx';
import Redirector from '../Redirector';
import RouteCard from '../RouteCard';
import { useRouter } from 'expo-router';
import { downloadFile } from '../../utils/FileHelper';
import { convertBlobUrlToRawUrl } from '../../utils/url';
import { getRouteCache, updateRouteCache, resetRouteCache } from '../../utils/RouteCache';

const FILTERS: RouteFilters = { state: 'open' };
const PER_PAGE = 10;

interface SnackbarState {
  isVisible: boolean;
  message: string;
}

const INITIAL_SNACKBAR_STATE: SnackbarState = {
  isVisible: false,
  message: '',
};

const HomeScreen = (): React.ReactElement => {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // Responsive Layout Calculation
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;
  const contentMaxWidth = isDesktop ? 1200 : 800; // Wider on desktop

  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(getRouteCache().searchQuery);
  const [issues, setIssues] = useState<RouteIssue[]>(getRouteCache().issues);
  const pageRef = useRef(getRouteCache().page);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentPage, setCurrentPage] = useState(getRouteCache().page);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(INITIAL_SNACKBAR_STATE);
  const listRef = useRef<FlashList<RouteIssue>>(null);

  // Determine if we are restoring from cache to prevent animation re-run
  const isRestored = useRef(getRouteCache().issues.length > 0);

  // Calculate approximate initial index for FlashList to avoid visual jumps
  const initialIndex = getRouteCache().scrollOffset > 0
    ? Math.floor(getRouteCache().scrollOffset / 350)
    : undefined;

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
        setIssues((prevIssues) => {
          const newIssues = [...prevIssues, ...issuesData];
          updateRouteCache({ issues: newIssues });
          return newIssues;
        });
        pageRef.current += 1;
        setCurrentPage(pageRef.current);
        updateRouteCache({ page: pageRef.current, searchQuery: searchQuery });
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, searchQuery]);

  useLayoutEffect(() => {
    const cache = getRouteCache();
    if (cache.issues.length > 0) {
      // Restore scroll position precisely if needed
      if (cache.scrollOffset > 0 && listRef.current) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToOffset({ offset: cache.scrollOffset, animated: false });
        });
      }
      return;
    }
    loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetAndLoad = useCallback(() => {
    resetRouteCache();
    isRestored.current = false;
    pageRef.current = 1;
    setCurrentPage(1);
    setIssues([]);
    setIsLoading(false); // Reset loading state
    loadIssues();
  }, [loadIssues]);

  const handleToDetail = useCallback((item: RouteIssue) => {
    router.push({
      pathname: '/app/detail',
      params: { item: JSON.stringify(item) }
    });
  }, [router]);

  const handleMapPress = useCallback(
    async (url: string | null, title: string) => {
      if (!url || url.indexOf('github') === -1) {
        showSnackbar(i18n.t('home_map_prep'));
        return;
      }
      try {
        const response = await fetch(convertBlobUrlToRawUrl(url));
        if (!response.ok) {
          showSnackbar(i18n.t('home_map_prep'));
          return;
        }

        try {
          await response.json();
        } catch (e) {
          showSnackbar(i18n.t('home_file_format_error'));
          return;
        }

        router.push({
          pathname: '/app/map',
          params: { url: url, title: title, source: 'home' },
        });
      } catch (error) {
        console.error('Failed to verify GeoJSON', error);
        showSnackbar(i18n.t('home_map_prep'));
      }
    },
    [router, showSnackbar],
  );

  const handleScroll = useCallback((event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    updateRouteCache({ scrollOffset: offset });
  }, []);

  const renderItem: ListRenderItem<RouteIssue> = useCallback(
    ({ item, index }) => {
      return (
        <RouteCard
          item={item}
          index={index}
          shouldAnimate={!isRestored.current}
          onDetailPress={handleToDetail}
          onGpxPress={downloadGpxFile}
          onKmlPress={downloadKmlFile}
          onMapPress={handleMapPress}
        />
      );
    },
    [downloadGpxFile, downloadKmlFile, handleToDetail, handleMapPress],
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
            ref={listRef}
            key={numColumns} // Force re-render when columns change
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            data={issues}
            numColumns={numColumns}
            initialScrollIndex={initialIndex}
            onEndReached={() => { void loadIssues(); }}
            onEndReachedThreshold={0.5}
            contentContainerStyle={styles.listContent}
            estimatedItemSize={350}
            showsVerticalScrollIndicator={Platform.OS === 'web'} // Better scroll experience on web
            onScroll={handleScroll}
            scrollEventThrottle={16}
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
});

export default HomeScreen;
