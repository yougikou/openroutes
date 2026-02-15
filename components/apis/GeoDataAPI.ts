import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, LineString, MultiLineString } from 'geojson';

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
    totalDistance += turf.length(feature, { units: 'kilometers' });
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

export const getStartEndPoint = (geojson: FeatureCollection): { start_point: number[] | null, end_point: number[] | null } => {
  const tracks = geojson.features.filter(
    (f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString'
  ) as Feature<LineString | MultiLineString>[];

  if (tracks.length === 0) {
    return { start_point: null, end_point: null };
  }

  const firstTrack = tracks[0];
  const lastTrack = tracks[tracks.length - 1];

  let start: number[] | null = null;
  let end: number[] | null = null;

  if (firstTrack.geometry.type === 'LineString') {
    const coords = firstTrack.geometry.coordinates;
    if (coords.length > 0) {
      start = coords[0];
    }
  } else if (firstTrack.geometry.type === 'MultiLineString') {
    const coords = firstTrack.geometry.coordinates;
    if (coords.length > 0 && coords[0].length > 0) {
      start = coords[0][0];
    }
  }

  if (lastTrack.geometry.type === 'LineString') {
    const coords = lastTrack.geometry.coordinates;
    if (coords.length > 0) {
      end = coords[coords.length - 1];
    }
  } else if (lastTrack.geometry.type === 'MultiLineString') {
    const coords = lastTrack.geometry.coordinates;
    if (coords.length > 0 && coords[coords.length - 1].length > 0) {
      const lastSegment = coords[coords.length - 1];
      end = lastSegment[lastSegment.length - 1];
    }
  }

  return { start_point: start, end_point: end };
};

export const validateAndFixGeoJson = (geojson: FeatureCollection): FeatureCollection => {
  const tracks = geojson.features.filter(
    (f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString'
  );
  const points = geojson.features.filter((f) => f.geometry?.type === 'Point');

  if (tracks.length === 0 && points.length > 50) {
    console.log('Detected point-only GPX, converting to track...');

    const coordinates = points.map((p) => (p.geometry as any).coordinates);
    const times = points.map((p) => p.properties?.time).filter((t) => t);

    const properties: any = {
      name: 'Converted Track',
    };

    if (times.length === coordinates.length) {
      properties.coordTimes = times;
    }

    const newTrack: Feature<LineString> = {
      type: 'Feature',
      properties: properties,
      geometry: {
        type: 'LineString',
        coordinates: coordinates as any,
      },
    };

    return {
      ...geojson,
      features: [newTrack],
    };
  }

  return geojson;
};
