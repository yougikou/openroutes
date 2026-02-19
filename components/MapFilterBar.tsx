import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, useWindowDimensions } from 'react-native';
import { Chip, IconButton, useTheme, FAB } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import RangeSlider from './RangeSlider';
import { FilterState } from '../utils/filterUtils';
import i18n from './i18n/i18n';
import { useLanguage } from './i18n/LanguageContext';

const TIME_STEPS = [0, 0.5, 1, 2, 3, 5, 7, 11, 13, Infinity];
const DISTANCE_STEPS = [0, 1, 2, 3, 5, 7, 11, 13, 20, Infinity];

interface MapFilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

export default function MapFilterBar({
  onFilterChange,
  visible,
  setVisible,
}: MapFilterBarProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  useLanguage(); // trigger re-render on language change

  // Filters State
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set());

  // Initialize ranges with indices
  const [distanceIndexRange, setDistanceIndexRange] = useState<{ min: number; max: number }>({ min: 0, max: DISTANCE_STEPS.length - 1 });
  const [timeIndexRange, setTimeIndexRange] = useState<{ min: number; max: number }>({ min: 0, max: TIME_STEPS.length - 1 });

  // Notify parent
  useEffect(() => {
    onFilterChange({
      types: selectedTypes,
      difficulties: selectedDifficulties,
      distance: {
        min: DISTANCE_STEPS[distanceIndexRange.min],
        max: DISTANCE_STEPS[distanceIndexRange.max],
      },
      time: {
        min: TIME_STEPS[timeIndexRange.min],
        max: TIME_STEPS[timeIndexRange.max],
      },
    });
  }, [selectedTypes, selectedDifficulties, distanceIndexRange, timeIndexRange]);

  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) newSet.delete(type);
    else newSet.add(type);
    setSelectedTypes(newSet);
  };

  const toggleDifficulty = (diff: string) => {
    const newSet = new Set(selectedDifficulties);
    if (newSet.has(diff)) newSet.delete(diff);
    else newSet.add(diff);
    setSelectedDifficulties(newSet);
  };

  const resetFilters = () => {
    setSelectedTypes(new Set());
    setSelectedDifficulties(new Set());
    setDistanceIndexRange({ min: 0, max: DISTANCE_STEPS.length - 1 });
    setTimeIndexRange({ min: 0, max: TIME_STEPS.length - 1 });
  };

  const formatVal = (val: number) => val === Infinity ? '∞' : val.toString();

  if (!visible) {
    return (
      <View style={styles.fabContainer}>
        <FAB
          icon="filter"
          style={[styles.fabItem, { backgroundColor: theme.colors.surface }]}
          onPress={() => setVisible(true)}
          size="small"
          accessibilityLabel={i18n.t('filter_title')}
        />
        <View style={{ width: 10 }} />
        <FAB
          icon="filter-off"
          style={[styles.fabItem, { backgroundColor: theme.colors.surface }]}
          onPress={resetFilters}
          size="small"
          accessibilityLabel="Clear filters"
        />
      </View>
    );
  }

  // Calculate generic width for container
  const containerWidth = width - 20;
  const SLIDER_MARGIN_HORIZONTAL = 10;
  // 20 is padding of content (10 left + 10 right)
  const sliderWidth = containerWidth - 20 - (SLIDER_MARGIN_HORIZONTAL * 2);

  return (
    <View style={[styles.container, { width: containerWidth }]}>
        <BlurView
            intensity={50}
            tint="light"
            style={[StyleSheet.absoluteFill, styles.blur]}
        />

        <ScrollView style={styles.content}>
            {/* Type Section */}
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>{i18n.t('label_type')}</Text>
            <View style={styles.rowWrap}>
                {['hiking', 'cycling', 'walking'].map((type) => (
                    <Chip
                        key={type}
                        icon={type === 'hiking' ? 'hiking' : type === 'cycling' ? 'bike' : 'walk'}
                        selected={selectedTypes.has(type)}
                        onPress={() => toggleType(type)}
                        style={styles.chip}
                        showSelectedOverlay
                    >
                        {i18n.t(type)}
                    </Chip>
                ))}
            </View>

            {/* Difficulty Section */}
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>{i18n.t('label_difficulty')}</Text>
            <View style={styles.rowWrap}>
                {['easy', 'normal', 'moderate', 'hard'].map((d) => (
                    <Chip
                        key={d}
                        selected={selectedDifficulties.has(d)}
                        onPress={() => toggleDifficulty(d)}
                        style={styles.chip}
                        showSelectedOverlay
                    >
                        {i18n.t(d)}
                    </Chip>
                ))}
            </View>

            {/* Distance Slider */}
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                {i18n.t('label_distance')}: {formatVal(DISTANCE_STEPS[distanceIndexRange.min])} - {formatVal(DISTANCE_STEPS[distanceIndexRange.max])} {i18n.t('home_unit_km')}
            </Text>
            <View style={{ marginVertical: 4, marginHorizontal: SLIDER_MARGIN_HORIZONTAL }}>
                <RangeSlider
                    min={0}
                    max={DISTANCE_STEPS.length - 1}
                    step={1}
                    low={distanceIndexRange.min}
                    high={distanceIndexRange.max}
                    onValueChanged={(low, high) => setDistanceIndexRange({ min: low, max: high })}
                    width={sliderWidth}
                />
            </View>

            {/* Time Slider */}
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                {i18n.t('label_time')}: {formatVal(TIME_STEPS[timeIndexRange.min])} - {formatVal(TIME_STEPS[timeIndexRange.max])} {i18n.t('home_unit_hour')}
            </Text>
            <View style={{ marginVertical: 4, marginHorizontal: SLIDER_MARGIN_HORIZONTAL }}>
                <RangeSlider
                    min={0}
                    max={TIME_STEPS.length - 1}
                    step={1}
                    low={timeIndexRange.min}
                    high={timeIndexRange.max}
                    onValueChanged={(low, high) => setTimeIndexRange({ min: low, max: high })}
                    width={sliderWidth}
                />
            </View>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2000,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fabItem: {
    // FAB styles handled inline or by Paper
  },
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden', // Required for BlurView to respect borderRadius
    zIndex: 2000,
    elevation: 4,
    // No background color here, handled by BlurView
    // Border removed for cleaner look with blur
  },
  blur: {
    // Ensuring blur covers container
  },
  content: {
    padding: 10,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 2,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 2,
  },
});
