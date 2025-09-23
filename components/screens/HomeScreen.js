import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Appbar, Card, Avatar, Chip, Searchbar, Button, Snackbar } from 'react-native-paper';
import i18n from '../i18n/i18n';
import { fetchIssues, ensureFreshGithubAuth, hasValidGithubCredentials } from '../apis/GitHubAPI';
import tokml from 'geojson-to-kml';
import togpx from 'togpx';
import Redirector from "../Redirector";

export default function HomeScreen() {
  const [githubAuth, setGithubAuth] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [issues, setIssues] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const filters = {
    state: 'all',
  };
  const perPage = 10;

  const downloadFile = async (data, filename, mimeType) => {
    const blob = new Blob([data], { type: mimeType });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const convertBlobUrlToRawUrl = (githubBlobUrl) => {
    return githubBlobUrl
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }

  const downloadGpxFile = async(name, url) => {
    if(!url.includes("github")) {
      onToggleSnackBar(i18n.t('home_download_prep'))
      return;
    }

    try {
      const response = await fetch(convertBlobUrlToRawUrl(url));
      const geoJsonData = await response.json();
      const data = togpx(geoJsonData);
      mimeType = 'application/gpx+xml';
      fileExtension = 'gpx';
      const filename = `${name}.${fileExtension}`;
      downloadFile(data, filename, mimeType);
    } catch (error) {
      console.error('Failed to download gpx or convert GeoJSON', error);
    }
  };

  const downloadKmlFile = async(name, url) => {
    if(!url.includes("github")) {
      onToggleSnackBar(i18n.t('home_download_prep'))
      return;
    }

    try {
      const response = await fetch(convertBlobUrlToRawUrl(url));
      const geoJsonData = await response.json();
      const data = tokml(geoJsonData);
      mimeType = 'application/vnd.google-earth.kml+xml';
      fileExtension = 'kml';
      const filename = `${name}.${fileExtension}`;
      downloadFile(data, filename, mimeType);
    } catch (error) {
      console.error('Failed to download kml or convert GeoJSON', error);
    }
  };

  const handleToDetail = () => {
  };

  const renderItem = ({ item }) => {
    return (
      <Pressable onPress={() => {}}>
        <Card style={styles.card}  mode="elevated" key={item.id} elevation={2}>
          <Card.Cover source={{ uri: item.coverimg.uri }} />
          <Card.Title title={item.title} left={() => <Avatar.Image size={32} source={{ uri: item.user.avatar_url }} style={{backgroundColor: '#FFFFFF'}} />} />
          <Card.Content>
            <View style={styles.row}>
              {item.distance?
                (<Chip style={styles.chip} icon="map-marker-distance">{item.distance} {i18n.t('home_unit_km')}</Chip>):<></>}
              {item.duration?
                (<Chip style={styles.chip} icon="clock">{item.duration} {i18n.t('home_unit_hour')}</Chip>):<></>}
              {item.labels.map(label => (<Chip key={label.name} style={styles.chip}>{i18n.t(label.name, { defaultValue: label.name })}</Chip>))}
            </View>
          </Card.Content>
          <Card.Actions>
            <Button mode='contained' onPress={() =>downloadGpxFile(item.title, item.geojson.uri)}>{ i18n.t('home_download_gpx') }</Button>
            <Button mode='contained' onPress={() =>downloadKmlFile(item.title, item.geojson.uri)}>{ i18n.t('home_download_kml') }</Button>
            <Button mode='outlined' onPress={handleToDetail} disabled>{ i18n.t('home_detail')}</Button>
          </Card.Actions>
        </Card>
      </Pressable>
    );
  };

  const resetAndLoad = async () => {
    setCurrentPage(1);
    setIssues([]);
    setTimeout(() => {
      loadIssues();
    }, 0);
  };

  const [snackbarVisible, setSnackbarVisible] = useState({
    isVisible: false,
    message: '',
  });

  const onToggleSnackBar = (message) => setSnackbarVisible({
    isVisible: !snackbarVisible.isVisible,
    message: message
  });

  const loadIssues = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const auth = await ensureFreshGithubAuth();
      setGithubAuth(auth);

      const issuesData = await fetchIssues(currentPage, perPage, filters, auth?.accessToken);
      if (issuesData && issuesData.length > 0) {
        await setIssues(prevIssues => [...prevIssues, ...issuesData]);
        await setCurrentPage(prevPage => prevPage + 1);
      }
    } catch (error) {
      console.error("Error fetching issues:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadAuth = async () => {
        const auth = await ensureFreshGithubAuth();
        if (isActive) {
          setGithubAuth(auth);
        }
      };

      loadAuth();

      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <Redirector />
      <Appbar.Header elevation={2}>
        <Appbar.Content title={ i18n.t('title_explore') } />
        <Appbar.Action icon="refresh" onPress={resetAndLoad} />
        <Appbar.Action icon="github" color={hasValidGithubCredentials(githubAuth) ? "#4CAF50" : ""} />
      </Appbar.Header>
      <View>
        <Searchbar style={styles.searchbar} mode='bar' elevation={2}
          placeholder={ i18n.t('home_search') }
          onChangeText={setSearchQuery}
          value={searchQuery}
        />
      </View>
      <FlashList
        keyExtractor={(item) => (item.id)}
        renderItem={renderItem}
        estimatedItemSize={100}
        data={issues}
        onEndReached={loadIssues}
        onEndReachedThreshold={0.1}
      />
      <Snackbar
        visible={snackbarVisible.isVisible}
        onDismiss={() => onToggleSnackBar("")}>
        { snackbarVisible.message }
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 100,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
  },
  searchbar: {
    marginTop: 10,
    marginBottom: 5,
    marginLeft: 10,
    marginRight: 10,
  },
  searchbarText: {
    fontSize: 16,
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
    margin: 3
  },
});

