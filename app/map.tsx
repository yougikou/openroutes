import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import MapScreen from '../components/screens/MapScreen';

export default function MapRoute() {
  const { url, title, source } = useLocalSearchParams<{ url: string; title: string; source: string }>();

  return <MapScreen url={url} title={title} source={source} />;
}
