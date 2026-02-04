import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import MapScreen from '../../components/screens/MapScreen';

export default function MapRoute() {
  const { url, title, source, standalone } = useLocalSearchParams<{ url: string; title: string; source: string; standalone?: string }>();

  return <MapScreen url={url} title={title} source={source} standalone={standalone} />;
}
