import { MD3LightTheme as DefaultTheme, type MD3Theme } from 'react-native-paper';

export const theme: MD3Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    // Primary: A bright, modern 'Spring/Nature' green. Distinctive but not harsh.
    primary: '#00BA63',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D1F7E2',
    onPrimaryContainer: '#00391D',

    // Secondary: Blue Grey. Modern, serious, complements green without clashing.
    secondary: '#546E7A',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#ECEFF1',
    onSecondaryContainer: '#263238',

    // Tertiary: Ocean Blue. For accents/info.
    tertiary: '#0288D1',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#E1F5FE',
    onTertiaryContainer: '#002845',

    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',

    // Backgrounds: Pure White for that 'Bright/Light' feel.
    background: '#FFFFFF',
    onBackground: '#191C1C',

    surface: '#FFFFFF',
    onSurface: '#191C1C',
    // Surface Variant: Neutral clean gray. Removed the green tint to avoid 'overwhelming green'.
    surfaceVariant: '#F7F9FA',
    onSurfaceVariant: '#404944',

    outline: '#707973',
    outlineVariant: '#C0C9C2',

    // Elevation: subtle cool gray/white tones.
    elevation: {
      level0: 'transparent',
      level1: '#F8F9FA',
      level2: '#F1F3F4',
      level3: '#ECEFF1',
      level4: '#E6E9EC',
      level5: '#E2E6EA',
    },
  },
};
