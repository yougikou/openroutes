import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, LineString } from 'geojson';

type TimedFeature = Feature<LineString, { coordTimes?: string[] }>;

type AnyFeature = FeatureCollection['features'][number];

const isLineStringFeature = (feature: AnyFeature): feature is Feature<LineString> => {
  return feature.geometry?.type === 'LineString';
};

export const extractRecordDate = (geojson: FeatureCollection): Date | null => {
  const match = /\d{4}-\d{2}-\d{2}/.exec(JSON.stringify(geojson));
  if (match && match.length > 0) {
    return new Date(match[0]);
  }
  return null;
};

export const calculateDistance = (geojson: FeatureCollection): number => {
  let totalDistance = 0;
  const pathFeatures = geojson.features.filter(isLineStringFeature);

  pathFeatures.forEach((feature) => {
    const coordinates = feature.geometry.coordinates;
    for (let i = 0; i < coordinates.length - 1; i += 1) {
      const from = turf.point(coordinates[i]);
      const to = turf.point(coordinates[i + 1]);
      const distance = turf.distance(from, to, { units: 'kilometers' });
      totalDistance += distance;
    }
  });

  return parseFloat(totalDistance.toFixed(1));
};

export const calculateDuration = (geojson: FeatureCollection): number => {
  let totalTime = 0;

  geojson.features.forEach((feature) => {
    const times = (feature as TimedFeature).properties?.coordTimes;
    if (Array.isArray(times) && times.length > 1) {
      const startTime = new Date(times[0]);
      const endTime = new Date(times[times.length - 1]);
      const duration = (endTime.getTime() - startTime.getTime()) / 3600000;
      totalTime += duration;
    }
  });

  return parseFloat(totalTime.toFixed(1));
};
