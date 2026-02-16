export interface FilterState {
  types: Set<string>;
  difficulties: Set<string>;
  distance: { min: number; max: number };
  time: { min: number; max: number };
}

export const filterRoutes = (
  features: any[],
  filters: FilterState
): any[] => {
  if (!features) return [];

  return features.filter((feature) => {
    const p = feature.properties;
    if (!p) return false;

    // Type Filter
    // If types is not empty, feature type must be in the set
    if (filters.types.size > 0) {
      if (!p.type || !filters.types.has(p.type)) {
        return false;
      }
    }

    // Difficulty Filter
    // If difficulties is not empty, feature difficulty must be in the set
    if (filters.difficulties.size > 0) {
      if (!p.difficulty || !filters.difficulties.has(p.difficulty)) {
        return false;
      }
    }

    // Distance Filter
    const dist = p.distance_km || 0;
    if (dist < filters.distance.min || dist > filters.distance.max) {
      return false;
    }

    // Time Filter
    const time = p.duration_hour || 0;
    if (time < filters.time.min || time > filters.time.max) {
      return false;
    }

    return true;
  });
};
