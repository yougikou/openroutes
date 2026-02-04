import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Appbar, Text, Avatar, Button, Surface, Chip, Divider, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import i18n from '../i18n/i18n';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { RouteIssue } from '../apis/GitHubAPI';

export default function RouteDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { width } = useWindowDimensions();

  const [routeItem, setRouteItem] = useState<RouteIssue | null>(null);

  useEffect(() => {
    if (params.item && typeof params.item === 'string') {
      try {
        const parsed = JSON.parse(params.item);
        setRouteItem(parsed);
      } catch (e) {
        console.error('Failed to parse item param', e);
      }
    }
  }, [params.item]);

  if (!routeItem) {
      return (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background}}>
              <Text>Loading...</Text>
          </View>
      );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
            <Text variant="headlineMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>{routeItem.title}</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Avatar.Image size={40} source={{ uri: routeItem.user.avatar_url }} />
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

            <Text variant="bodyLarge">{routeItem.description}</Text>

            {routeItem.geojson?.uri && (
                 <Button
                    mode="contained"
                    icon="map"
                    style={{ marginTop: 24 }}
                    onPress={() => {
                        router.push({
                          pathname: '/app/map',
                          params: { url: routeItem.geojson.uri, title: routeItem.title, source: 'detail' }
                        });
                    }}
                 >
                    View on Map
                 </Button>
            )}
         </View>
      </ScrollView>
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
