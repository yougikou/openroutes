import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Appbar, Card, Avatar, Chip, Searchbar, Button, Snackbar } from 'react-native-paper';
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
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('File download is only supported on web platform.');
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
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [issues, setIssues] = useState<RouteIssue[]>([]);
  const pageRef = useRef(1);
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

      const issuesData = await fetchIssues(pageRef.current, PER_PAGE, FILTERS, token);
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
  }, [isLoading]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const resetAndLoad = useCallback(() => {
    pageRef.current = 1;
    setCurrentPage(1);
    setIssues([]);
    loadIssues();
  }, [loadIssues]);

  const handleToDetail = useCallback(() => {
    // TODO: implement route detail navigation when available
  }, []);

  const renderItem: ListRenderItem<RouteIssue> = useCallback(
    ({ item }) => {
      const geoJsonUri = item.geojson?.uri ?? null;
      const coverUri = item.coverimg?.uri ?? null;
      return (
        <Pressable onPress={handleToDetail}>
          <Card style={styles.card} mode="elevated" elevation={2}>
            {coverUri ? <Card.Cover source={{ uri: coverUri }} /> : null}
            <Card.Title
              title={item.title}
              left={() => (
                <Avatar.Image
                  size={32}
                  source={{ uri: item.user.avatar_url }}
                  style={styles.avatar}
                />
              )}
            />
            <Card.Content>
              <View style={styles.row}>
                {item.distance ? (
                  <Chip style={styles.chip} icon="map-marker-distance">
                    {item.distance} {i18n.t('home_unit_km')}
                  </Chip>
                ) : null}
                {item.duration ? (
                  <Chip style={styles.chip} icon="clock">
                    {item.duration} {i18n.t('home_unit_hour')}
                  </Chip>
                ) : null}
                {item.labels.map((label) => (
                  <Chip key={label.name} style={styles.chip}>
                    {i18n.t(label.name, { defaultValue: label.name })}
                  </Chip>
                ))}
              </View>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={() => downloadGpxFile(item.title, geoJsonUri)} disabled={!geoJsonUri}>
                {i18n.t('home_download_gpx')}
              </Button>
              <Button mode="contained" onPress={() => downloadKmlFile(item.title, geoJsonUri)} disabled={!geoJsonUri}>
                {i18n.t('home_download_kml')}
              </Button>
              <Button mode="outlined" onPress={handleToDetail} disabled>
                {i18n.t('home_detail')}
              </Button>
            </Card.Actions>
          </Card>
        </Pressable>
      );
    },
    [downloadGpxFile, downloadKmlFile, handleToDetail],
  );

  return (
    <View style={styles.container}>
      <Redirector />
      <Appbar.Header>
        <Appbar.Content title={i18n.t('title_explore')} />
        <Appbar.Action icon="refresh" onPress={resetAndLoad} />
        <Appbar.Action icon="github" color={githubToken ? '#4CAF50' : undefined} />
      </Appbar.Header>
      <View>
        <Searchbar
          style={styles.searchbar}
          mode="bar"
          placeholder={i18n.t('home_search')}
          onChangeText={setSearchQuery}
          value={searchQuery}
        />
      </View>
      <FlashList<RouteIssue>
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        estimatedItemSize={100}
        data={issues}
        onEndReached={loadIssues}
        onEndReachedThreshold={0.1}
      />
      <Snackbar visible={snackbar.isVisible} onDismiss={hideSnackbar}>
        {snackbar.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchbar: {
    marginTop: 10,
    marginBottom: 5,
    marginLeft: 10,
    marginRight: 10,
  },
  card: {
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 10,
    marginRight: 10,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  chip: {
    margin: 3,
  },
  avatar: {
    backgroundColor: '#FFFFFF',
  },
});

export default HomeScreen;
