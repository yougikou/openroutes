import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import MapScreen from '../components/screens/MapScreen';

export default function ViewRoute() {
  const params = useLocalSearchParams<any>();
  return <MapScreen {...params} standalone="true" />;
}
