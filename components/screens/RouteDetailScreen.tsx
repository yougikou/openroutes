import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Appbar, Text, Avatar, Button, Surface, Chip, Divider, useTheme, Portal, Dialog, ProgressBar, Snackbar } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Image } from 'expo-image';
import i18n from '../i18n/i18n';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RouteIssue, fetchIssueById } from '../apis/GitHubAPI';
import { saveOfflineMap } from '../../utils/offlineMapUtils';

export default function RouteDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { width } = useWindowDimensions();

  const [routeItem, setRouteItem] = useState<RouteIssue | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const handleDownloadPress = () => {
     setShowConfirm(true);
  };

  const executeDownload = async () => {
      setShowConfirm(false);
      setDownloading(true);
      setProgress(0);
      try {
          if (routeItem) {
            await saveOfflineMap(routeItem, (current, total) => {
                setProgress(total > 0 ? current / total : 0);
            });
            setSnackbarMsg(i18n.t('offline_download_success'));
            setSnackbarVisible(true);
          }
      } catch (e) {
          console.error(e);
          setSnackbarMsg(i18n.t('offline_download_error'));
          setSnackbarVisible(true);
      } finally {
          setDownloading(false);
      }
  };

  useEffect(() => {
    if (params.item && typeof params.item === 'string') {
      try {
        const parsed = JSON.parse(params.item);
        setRouteItem(parsed);
      } catch (e) {
        console.error('Failed to parse item param', e);
      }
    } else if (params.id) {
      const idStr = Array.isArray(params.id) ? params.id[0] : params.id;
      const id = parseInt(idStr, 10);
      if (!isNaN(id)) {
        fetchIssueById(id)
          .then(setRouteItem)
          .catch((err) => console.error('Failed to fetch issue by ID', err));
      }
    }
  }, [params.item, params.id]);

  if (!routeItem) {
      return (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background}}>
              <Head>
                <title>Loading... - OpenRoutes</title>
              </Head>
              <Text>Loading...</Text>
          </View>
      );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": routeItem.title,
    "description": routeItem.description,
    "author": {
        "@type": "Person",
        "name": routeItem.user.login
    },
    "image": routeItem.coverimg?.uri
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Head>
        <title>{routeItem.title} - OpenRoutes</title>
        <meta name="description" content={routeItem.description || `Route shared by ${routeItem.user.login}`} />
        <meta property="og:title" content={routeItem.title} />
        <meta property="og:description" content={routeItem.description || `Route shared by ${routeItem.user.login}`} />
        {routeItem.coverimg?.uri && <meta property="og:image" content={routeItem.coverimg.uri} />}
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Head>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={i18n.t('home_detail')} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
         {/* Cover Image */}
         {routeItem.coverimg?.uri && (
             <Image
                source={{ uri: routeItem.coverimg.uri }}
                style={{ width: '100%', height: 250 }}
                contentFit="cover"
             />
         )}

         <View style={{ padding: 16, maxWidth: 800, alignSelf: 'center', width: '100%' }}>
            <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginBottom: 8 }} accessibilityRole="header">{routeItem.title}</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Avatar.Image size={40} source={{ uri: routeItem.user.avatar_url }} style={{ backgroundColor: 'transparent' }} />
                <View style={{ marginLeft: 12 }}>
                    <Text variant="titleSmall">{routeItem.user.login}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.outline }}>{new Date(routeItem.created_at).toLocaleDateString()}</Text>
                </View>
            </View>

            <Surface style={[styles.statsContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                 <View style={styles.statItem}>
                    <MaterialCommunityIcons name="map-marker-distance" size={24} color={theme.colors.primary} />
                    <Text variant="titleMedium" style={{fontWeight: 'bold', marginTop: 4}}>{routeItem.distance ? `${routeItem.distance} km` : '--'}</Text>
                    <Text variant="labelSmall">Distance</Text>
                 </View>
                 <View style={styles.statSeparator} />
                 <View style={styles.statItem}>
                    <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
                    <Text variant="titleMedium" style={{fontWeight: 'bold', marginTop: 4}}>{routeItem.duration ? `${routeItem.duration} h` : '--'}</Text>
                    <Text variant="labelSmall">Duration</Text>
                 </View>
            </Surface>

            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16}}>
                {routeItem.labels.map(l => (
                    <Chip key={l.id}>{i18n.t(l.name)}</Chip>
                ))}
            </View>

            <Divider style={{ marginVertical: 16 }} />

            {routeItem.geojson?.uri && (
                 <View style={{ gap: 12, marginTop: 24 }}>
                     <Button
                        mode="contained"
                        icon="map"
                        onPress={() => {
                            router.push({
                              pathname: '/app/map',
                              params: { url: routeItem.geojson.uri, title: routeItem.title, source: 'detail' }
                            });
                        }}
                     >
                        {i18n.t('view_in_map')}
                     </Button>
                     {Platform.OS === 'web' && (
                         <Button
                            mode="outlined"
                            icon="download"
                            onPress={handleDownloadPress}
                            disabled={downloading}
                         >
                            {i18n.t('offline_download_btn')}
                         </Button>
                     )}
                 </View>
            )}

            {routeItem.description && (
                <View style={{ marginTop: 24 }}>
                   <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>{i18n.t('detail_info_title')}</Text>
                   <Text variant="bodyLarge">{routeItem.description}</Text>
                </View>
            )}
         </View>
      </ScrollView>

      <Portal>
        <Dialog visible={showConfirm} onDismiss={() => setShowConfirm(false)}>
            <Dialog.Title>{i18n.t('offline_manage_title')}</Dialog.Title>
            <Dialog.Content>
                <Text variant="bodyMedium">{i18n.t('offline_download_confirm')}</Text>
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setShowConfirm(false)}>{i18n.t('cancel')}</Button>
                <Button onPress={executeDownload}>{i18n.t('confirm')}</Button>
            </Dialog.Actions>
        </Dialog>

        <Dialog visible={downloading} dismissable={false}>
            <Dialog.Title>{i18n.t('offline_downloading')}</Dialog.Title>
            <Dialog.Content>
                 <ProgressBar progress={progress} />
                 <Text style={{marginTop: 10, marginBottom: 10, textAlign: 'center'}}>{Math.round(progress * 100)}%</Text>
            </Dialog.Content>
        </Dialog>

        <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={3000}
        >
            {snackbarMsg}
        </Snackbar>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        justifyContent: 'space-around',
        alignItems: 'center'
    },
    statItem: {
        alignItems: 'center',
        flex: 1
    },
    statSeparator: {
        width: 1,
        height: 40,
        backgroundColor: '#ccc'
    }
});
