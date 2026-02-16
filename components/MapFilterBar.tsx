import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip, Menu, useTheme } from 'react-native-paper';

export interface FilterState {
  type: string | null;
  difficulty: string | null;
  distance: string | null;
  time: string | null;
}

interface MapFilterBarProps {
  geoData: any;
  onFilterChange: (filters: FilterState) => void;
}

const DISTANCE_OPTIONS = [
  { label: '< 5 km', value: '0-5' },
  { label: '5 - 10 km', value: '5-10' },
  { label: '10 - 20 km', value: '10-20' },
  { label: '> 20 km', value: '20+' },
];

const TIME_OPTIONS = [
  { label: '< 1 h', value: '0-1' },
  { label: '1 - 3 h', value: '1-3' },
  { label: '3 - 5 h', value: '3-5' },
  { label: '> 5 h', value: '5+' },
];

export default function MapFilterBar({ geoData, onFilterChange }: MapFilterBarProps) {
  const theme = useTheme();
  const [filters, setFilters] = useState<FilterState>({
    type: null,
    difficulty: null,
    distance: null,
    time: null,
  });

  const [menuVisible, setMenuVisible] = useState<{ [key: string]: boolean }>({
    type: false,
    difficulty: false,
    distance: false,
    time: false,
  });

  // Extract unique types and difficulties
  const { types, difficulties } = useMemo(() => {
    const typesSet = new Set<string>();
    const difficultiesSet = new Set<string>();

    if (geoData && geoData.features) {
      geoData.features.forEach((f: any) => {
        if (f.properties.type) typesSet.add(f.properties.type);
        if (f.properties.difficulty) difficultiesSet.add(f.properties.difficulty);
      });
    }

    return {
      types: Array.from(typesSet).sort(),
      difficulties: Array.from(difficultiesSet).sort(),
    };
  }, [geoData]);

  const updateFilter = (key: keyof FilterState, value: string | null) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
    setMenuVisible({ ...menuVisible, [key]: false });
  };

  const openMenu = (key: string) => setMenuVisible({ ...menuVisible, [key]: true });
  const closeMenu = (key: string) => setMenuVisible({ ...menuVisible, [key]: false });

  const getLabel = (key: keyof FilterState, options: { label: string, value: string }[] = []) => {
    const val = filters[key];
    if (!val) return 'All';
    const opt = options.find(o => o.value === val);
    return opt ? opt.label : val;
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Type Filter */}
        <Menu
          visible={menuVisible.type}
          onDismiss={() => closeMenu('type')}
          anchor={
            <Chip
              mode="outlined"
              selected={!!filters.type}
              onPress={() => openMenu('type')}
              style={styles.chip}
              showSelectedOverlay
            >
              Type: {filters.type || 'All'}
            </Chip>
          }
        >
          <Menu.Item onPress={() => updateFilter('type', null)} title="All" />
          {types.map(t => (
            <Menu.Item key={t} onPress={() => updateFilter('type', t)} title={t} />
          ))}
        </Menu>

        {/* Difficulty Filter */}
        <Menu
          visible={menuVisible.difficulty}
          onDismiss={() => closeMenu('difficulty')}
          anchor={
            <Chip
              mode="outlined"
              selected={!!filters.difficulty}
              onPress={() => openMenu('difficulty')}
              style={styles.chip}
              showSelectedOverlay
            >
              Difficulty: {filters.difficulty || 'All'}
            </Chip>
          }
        >
          <Menu.Item onPress={() => updateFilter('difficulty', null)} title="All" />
          {difficulties.map(d => (
            <Menu.Item key={d} onPress={() => updateFilter('difficulty', d)} title={d} />
          ))}
        </Menu>

        {/* Distance Filter */}
        <Menu
          visible={menuVisible.distance}
          onDismiss={() => closeMenu('distance')}
          anchor={
            <Chip
              mode="outlined"
              selected={!!filters.distance}
              onPress={() => openMenu('distance')}
              style={styles.chip}
              showSelectedOverlay
            >
              Distance: {getLabel('distance', DISTANCE_OPTIONS)}
            </Chip>
          }
        >
          <Menu.Item onPress={() => updateFilter('distance', null)} title="All" />
          {DISTANCE_OPTIONS.map(opt => (
            <Menu.Item key={opt.value} onPress={() => updateFilter('distance', opt.value)} title={opt.label} />
          ))}
        </Menu>

        {/* Time Filter */}
        <Menu
          visible={menuVisible.time}
          onDismiss={() => closeMenu('time')}
          anchor={
            <Chip
              mode="outlined"
              selected={!!filters.time}
              onPress={() => openMenu('time')}
              style={styles.chip}
              showSelectedOverlay
            >
              Time: {getLabel('time', TIME_OPTIONS)}
            </Chip>
          }
        >
          <Menu.Item onPress={() => updateFilter('time', null)} title="All" />
          {TIME_OPTIONS.map(opt => (
            <Menu.Item key={opt.value} onPress={() => updateFilter('time', opt.value)} title={opt.label} />
          ))}
        </Menu>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 2000,
    paddingHorizontal: 10,
  },
  scrollContent: {
    paddingRight: 20,
    paddingBottom: 10, // Shadow space
  },
  chip: {
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  }
});
