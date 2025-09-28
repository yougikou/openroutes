declare module 'geojson-to-kml' {
  import type { FeatureCollection } from 'geojson';
  export default function geojsonToKml(geojson: FeatureCollection): string;
}

declare module 'togpx' {
  import type { FeatureCollection } from 'geojson';
  export default function toGpx(geojson: FeatureCollection): string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_GITHUB_OWNER?: string;
    EXPO_PUBLIC_GITHUB_REPO?: string;
  }
}
