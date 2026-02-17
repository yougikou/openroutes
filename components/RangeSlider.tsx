import React, { useRef, useEffect } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  onValueChanged: (low: number, high: number) => void;
  width: number;
}

export default function RangeSlider({
  min,
  max,
  step,
  low,
  high,
  onValueChanged,
  width,
}: RangeSliderProps) {
  const theme = useTheme();
  const THUMB_SIZE = 20;

  // Use refs to store the latest props and state values to avoid stale closures in PanResponder
  const propsRef = useRef({ min, max, step, width, onValueChanged });
  const lowRef = useRef(low);
  const highRef = useRef(high);

  useEffect(() => {
    propsRef.current = { min, max, step, width, onValueChanged };
    lowRef.current = low;
    highRef.current = high;
  }, [min, max, step, width, onValueChanged, low, high]);

  const valueToPos = (val: number, currentProps = propsRef.current) => {
    const { min, max, width } = currentProps;
    if (max <= min) return 0;
    const clamped = Math.max(min, Math.min(max, val));
    return ((clamped - min) / (max - min)) * width;
  };

  const posToValue = (pos: number, currentProps = propsRef.current) => {
    const { min, max, step, width } = currentProps;
    if (width === 0) return min;
    const raw = (pos / width) * (max - min) + min;
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, stepped));
  };

  const startLowRef = useRef(0);
  const startHighRef = useRef(0);

  const panResponderLow = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startLowRef.current = lowRef.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const currentProps = propsRef.current;
        const startPos = valueToPos(startLowRef.current, currentProps);
        const newPos = startPos + gestureState.dx;
        const newValue = posToValue(newPos, currentProps);

        const constrained = Math.min(Math.max(newValue, currentProps.min), highRef.current);
        if (constrained !== lowRef.current) {
             currentProps.onValueChanged(constrained, highRef.current);
        }
      },
    })
  ).current;

  const panResponderHigh = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startHighRef.current = highRef.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const currentProps = propsRef.current;
        const startPos = valueToPos(startHighRef.current, currentProps);
        const newPos = startPos + gestureState.dx;
        const newValue = posToValue(newPos, currentProps);

        const constrained = Math.max(Math.min(newValue, currentProps.max), lowRef.current);
        if (constrained !== highRef.current) {
             currentProps.onValueChanged(lowRef.current, constrained);
        }
      },
    })
  ).current;

  // Render positions based on current render scope props
  const lowPos = valueToPos(low, { min, max, step, width, onValueChanged });
  const highPos = valueToPos(high, { min, max, step, width, onValueChanged });

  return (
    <View style={[styles.container, { width, height: 40 }]}>
      {/* Track Background */}
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.colors.outline,
            width: width,
            left: 0,
          },
        ]}
      />

      {/* Active Range Track */}
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.colors.primary,
            left: lowPos,
            width: Math.max(0, highPos - lowPos),
          },
        ]}
      />

      {/* Low Thumb */}
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: theme.colors.primary,
            left: lowPos - THUMB_SIZE / 2,
          },
        ]}
        {...panResponderLow.panHandlers}
      />

      {/* High Thumb */}
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: theme.colors.primary,
            left: highPos - THUMB_SIZE / 2,
          },
        ]}
        {...panResponderHigh.panHandlers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: 10, // (40 - 20) / 2 = 10 to center vertically
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
});
