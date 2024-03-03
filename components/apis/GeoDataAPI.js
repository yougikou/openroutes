import * as turf from '@turf/turf';

const extractRecordDate = (geojson) => {
  const match = /\d{4}-\d{2}-\d{2}/.exec(JSON.stringify(geojson));
  if (match != null && match.length > 0) {
    return new Date(match[0]);
  }
  return null;
}

const calculateDistance = (geojson) => {
  let totalDistance = 0;
  const pathFeatures = geojson.features.filter(feature => feature.geometry.type === 'LineString');
  pathFeatures.forEach(feature => {
    const coordinates = feature.geometry.coordinates;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const from = turf.point(coordinates[i]);
      const to = turf.point(coordinates[i + 1]);
      const distance = turf.distance(from, to, {units: 'kilometers'});
      totalDistance += distance;
    }
  });
  return parseFloat(totalDistance.toFixed(1));
}

const calculateDuration = (geojson) => {
  let totalTime = 0;
  geojson.features.forEach(feature => {
    if (feature.properties.coordTimes) {
      const times = feature.properties.coordTimes;
      const startTime = new Date(times[0]);
      const endTime = new Date(times[times.length - 1]);
      const duration = (endTime - startTime) / 3600000;
      totalTime += duration;
    }
  });
  return parseFloat(totalTime.toFixed(1));;
}

export { extractRecordDate, calculateDistance, calculateDuration };