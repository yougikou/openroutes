import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import MapScreen from '../components/screens/MapScreen';

export default function MapRoute() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();

  return <MapScreen url={url} title={title} />;
}
