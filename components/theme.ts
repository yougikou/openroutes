import { MD3LightTheme as DefaultTheme, type MD3Theme } from 'react-native-paper';

export const theme: MD3Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2E7D32', // Forest Green
    onPrimary: '#FFFFFF',
    primaryContainer: '#C8E6C9',
    onPrimaryContainer: '#002105',

    secondary: '#5D4037', // Earth Brown
    onSecondary: '#FFFFFF',
    secondaryContainer: '#D7CCC8',
    onSecondaryContainer: '#1E110F',

    tertiary: '#1565C0', // Water Blue
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#BBDEFB',
    onTertiaryContainer: '#001E3C',

    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',

    background: '#F5F5F5',
    onBackground: '#1C1C1E',

    surface: '#FFFFFF',
    onSurface: '#1C1C1E',
    surfaceVariant: '#E0E0E0',
    onSurfaceVariant: '#49454F',

    outline: '#79747E',
    outlineVariant: '#C4C7C5',

    elevation: {
      level0: 'transparent',
      level1: '#F5F5F5',
      level2: '#EEEEEE',
      level3: '#E0E0E0',
      level4: '#BDBDBD',
      level5: '#9E9E9E',
    },
  },
};
