import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, useWindowDimensions } from 'react-native';
import { Chip, IconButton, useTheme, FAB } from 'react-native-paper';
import RangeSlider from './RangeSlider';
import { FilterState } from '../utils/filterUtils';

interface MapFilterBarProps {
  minDistance: number;
  maxDistance: number;
  minTime: number;
  maxTime: number;
  onFilterChange: (filters: FilterState) => void;
}

export default function MapFilterBar({
  minDistance,
  maxDistance,
  minTime,
  maxTime,
  onFilterChange,
}: MapFilterBarProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [isVisible, setIsVisible] = useState(false);

  // Filters State
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set());

  // Initialize ranges with props
  const [distanceRange, setDistanceRange] = useState<{ min: number; max: number }>({ min: minDistance, max: maxDistance });
  const [timeRange, setTimeRange] = useState<{ min: number; max: number }>({ min: minTime, max: maxTime });

  // Update internal state when data loads
  useEffect(() => {
      setDistanceRange({ min: minDistance, max: maxDistance });
      setTimeRange({ min: minTime, max: maxTime });
  }, [minDistance, maxDistance, minTime, maxTime]);

  // Notify parent
  useEffect(() => {
    onFilterChange({
      types: selectedTypes,
      difficulties: selectedDifficulties,
      distance: distanceRange,
      time: timeRange,
    });
  }, [selectedTypes, selectedDifficulties, distanceRange, timeRange]);

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

  const renderTypeButton = (type: string, icon: string) => {
    const isSelected = selectedTypes.has(type);
    return (
      <IconButton
        key={type}
        icon={icon}
        mode={isSelected ? 'contained' : 'outlined'}
        selected={isSelected}
        onPress={() => toggleType(type)}
        style={styles.iconBtn}
        iconColor={isSelected ? theme.colors.onPrimary : theme.colors.primary}
        containerColor={isSelected ? theme.colors.primary : undefined}
      />
    );
  };

  if (!isVisible) {
    return (
      <FAB
        icon="filter"
        style={[styles.fab, { backgroundColor: theme.colors.surface }]}
        onPress={() => setIsVisible(true)}
        size="small"
      />
    );
  }

  // Calculate generic width for container
  const containerWidth = Math.min(300, width - 20);
  const sliderWidth = containerWidth - 20; // 20 padding

  return (
    <View style={[styles.container, { width: containerWidth, backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>Filters</Text>
            <IconButton icon="close" size={20} onPress={() => setIsVisible(false)} />
        </View>

        <ScrollView style={styles.content}>
            {/* Type Section */}
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Type</Text>
            <View style={styles.row}>
                {renderTypeButton('hiking', 'hiking')}
                {renderTypeButton('cycling', 'bike')}
                {renderTypeButton('walking', 'walk')}
            </View>

            {/* Difficulty Section */}
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Difficulty</Text>
            <View style={styles.rowWrap}>
                {['easy', 'normal', 'moderate', 'hard'].map((d) => (
                    <Chip
                        key={d}
                        selected={selectedDifficulties.has(d)}
                        onPress={() => toggleDifficulty(d)}
                        style={styles.chip}
                        showSelectedOverlay
                    >
                        {d}
                    </Chip>
                ))}
            </View>

            {/* Distance Slider */}
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                Distance: {distanceRange.min.toFixed(1)} - {distanceRange.max.toFixed(1)} km
            </Text>
            <View style={{ marginVertical: 10 }}>
                <RangeSlider
                    min={minDistance}
                    max={maxDistance}
                    step={0.1}
                    low={distanceRange.min}
                    high={distanceRange.max}
                    onValueChanged={(low, high) => setDistanceRange({ min: low, max: high })}
                    width={sliderWidth}
                />
            </View>

            {/* Time Slider */}
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                Time: {timeRange.min.toFixed(1)} - {timeRange.max.toFixed(1)} h
            </Text>
            <View style={{ marginVertical: 10 }}>
                <RangeSlider
                    min={minTime}
                    max={maxTime}
                    step={0.1}
                    low={timeRange.min}
                    high={timeRange.max}
                    onValueChanged={(low, high) => setTimeRange({ min: low, max: high })}
                    width={sliderWidth}
                />
            </View>
             <View style={{ height: 20 }} />
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2000,
  },
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    maxHeight: '80%',
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 2000,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    padding: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  iconBtn: {
    margin: 0,
  },
  chip: {
    margin: 4,
  },
});
