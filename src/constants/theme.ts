import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1118',
    textSecondary: '#6B5D5A',
    textOnPrimary: '#FFFFFF',
    background: '#FFF4EA',
    backgroundElement: '#FFE4D1',
    backgroundSelected: '#FFD1B0',
    border: '#F0D5BC',
    primary: '#FF6B6B',
    accent: '#A78BFA',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
  dark: {
    text: '#FFF4EA',
    textSecondary: '#B0A4A8',
    textOnPrimary: '#1A1118',
    background: '#0F0B14',
    backgroundElement: '#1F1822',
    backgroundSelected: '#2D2532',
    border: '#2A2230',
    primary: '#FF8E72',
    accent: '#C4B5FD',
    success: '#4ADE80',
    danger: '#F87171',
    warning: '#FBBF24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
