import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import MapScreen from '../components/screens/MapScreen';

export default function ViewRoute() {
  const params = useLocalSearchParams<any>();
  return (
    <>
      <Head>
        <title>{params.title ? `${params.title} - Map` : 'Map View'} - OpenRoutes</title>
      </Head>
      <MapScreen {...params} standalone="true" />
    </>
  );
}
