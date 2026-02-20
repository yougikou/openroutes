import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Platform, RefreshControl } from 'react-native';
import { Appbar, List, IconButton, Text, useTheme, Divider, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import i18n from '../../../components/i18n/i18n';
import { getOfflineMaps, deleteOfflineMap, OfflineMap } from '../../../utils/offlineMapUtils';

export default function OfflineMapsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [maps, setMaps] = useState<OfflineMap[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMaps = async () => {
    setLoading(true);
    try {
      const data = await getOfflineMaps();
      setMaps(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') {
        loadMaps();
      }
    }, [])
  );

  const handleDelete = async (id: number) => {
    // Confirm dialog? For now just delete.
    await deleteOfflineMap(id);
    loadMaps();
  };

  const handleView = (item: OfflineMap) => {
     router.push({
        pathname: '/app/map',
        params: {
            url: item.geojson.uri,
            title: item.title,
            source: 'offline'
        }
     });
  };

  const renderItem = ({ item }: { item: OfflineMap }) => (
    <List.Item
      title={item.title}
      description={`${new Date(item.savedAt).toLocaleDateString()} - ${item.tileCount || 0} tiles`}
      left={props => <List.Icon {...props} icon="map-check" />}
      right={props => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Button onPress={() => handleView(item)} mode="text">{i18n.t('view_in_map')}</Button>
            <IconButton icon="delete" onPress={() => handleDelete(item.id)} iconColor={theme.colors.error} />
        </View>
      )}
    />
  );

  if (Platform.OS !== 'web') {
      return (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
              <Text>Offline maps are currently supported on Web only.</Text>
          </View>
      );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title={i18n.t('offline_manage_title')} />
      </Appbar.Header>

      {maps.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
              <Text variant="bodyLarge">{i18n.t('offline_empty')}</Text>
          </View>
      ) : (
          <FlatList
            data={maps}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            ItemSeparatorComponent={Divider}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMaps} />}
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6
  }
});
