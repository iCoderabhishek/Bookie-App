import '@/global.css';

import { Platform } from 'react-native';

export type ThemePalette = {
  text: string;
  textSecondary: string;
  textOnPrimary: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  border: string;
  primary: string;
  accent: string;
  success: string;
  danger: string;
  warning: string;
  shadow: string;
  appearance: 'light' | 'dark';
};

export const Themes = {
  cream: {
    text: '#0A0A0A',
    textSecondary: '#4A4A4A',
    textOnPrimary: '#FFFFFF',
    background: '#F4ECD8',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#FFE45C',
    border: '#0A0A0A',
    primary: '#FF3B3B',
    accent: '#3B5CFF',
    success: '#00B894',
    danger: '#FF3B3B',
    warning: '#FFB400',
    shadow: '#0A0A0A',
    appearance: 'light',
  },
  paper: {
    text: '#0A0A0A',
    textSecondary: '#555555',
    textOnPrimary: '#FFFFFF',
    background: '#FFFFFF',
    backgroundElement: '#F5F5F5',
    backgroundSelected: '#FFE45C',
    border: '#0A0A0A',
    primary: '#FF2D2D',
    accent: '#0033CC',
    success: '#00875A',
    danger: '#FF2D2D',
    warning: '#FFB400',
    shadow: '#0A0A0A',
    appearance: 'light',
  },
  noir: {
    text: '#F4ECD8',
    textSecondary: '#B0A89C',
    textOnPrimary: '#0A0A0A',
    background: '#1A1612',
    backgroundElement: '#2A2520',
    backgroundSelected: '#3A3025',
    border: '#F4ECD8',
    primary: '#FF6B6B',
    accent: '#7B9BFF',
    success: '#4ADE80',
    danger: '#FF6B6B',
    warning: '#FFD24A',
    shadow: '#F4ECD8',
    appearance: 'dark',
  },
  neon: {
    text: '#FFE6FB',
    textSecondary: '#9B7BC4',
    textOnPrimary: '#0A0A0F',
    background: '#0B0420',
    backgroundElement: '#1A0B33',
    backgroundSelected: '#3F1A66',
    border: '#FF4FCB',
    primary: '#FF4FCB',
    accent: '#22E5FF',
    success: '#5EFFB3',
    danger: '#FF5470',
    warning: '#FFDA3A',
    shadow: '#22E5FF',
    appearance: 'dark',
  },
  mint: {
    text: '#0B2D24',
    textSecondary: '#3E6B5F',
    textOnPrimary: '#FFFFFF',
    background: '#E6F5EC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#CFEFD7',
    border: '#0B2D24',
    primary: '#1F8F5E',
    accent: '#FF6B9D',
    success: '#1F8F5E',
    danger: '#E85A5A',
    warning: '#F4A93E',
    shadow: '#0B2D24',
    appearance: 'light',
  },
  rosa: {
    text: '#2A0B17',
    textSecondary: '#7A4A57',
    textOnPrimary: '#FFFFFF',
    background: '#FFE9EC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#FFD0DA',
    border: '#2A0B17',
    primary: '#E63A6E',
    accent: '#7245E0',
    success: '#3FAE7A',
    danger: '#E63A6E',
    warning: '#F4A93E',
    shadow: '#2A0B17',
    appearance: 'light',
  },
  carbon: {
    text: '#F2EFE6',
    textSecondary: '#9E988A',
    textOnPrimary: '#1A1612',
    background: '#1C1C1C',
    backgroundElement: '#2A2A2A',
    backgroundSelected: '#3A3A3A',
    border: '#F2EFE6',
    primary: '#FFB400',
    accent: '#4FD0FF',
    success: '#4ADE80',
    danger: '#FF6B6B',
    warning: '#FFB400',
    shadow: '#F2EFE6',
    appearance: 'dark',
  },
} as const satisfies Record<string, ThemePalette>;

export type ThemeKey = keyof typeof Themes;

export const ThemeMeta: Record<ThemeKey, { label: string; tagline: string }> = {
  cream: { label: 'Cream', tagline: 'classic zine' },
  paper: { label: 'Paper', tagline: 'pure newsprint' },
  noir: { label: 'Noir', tagline: 'lights out' },
  neon: { label: 'Neon', tagline: 'synthwave bookmark' },
  mint: { label: 'Mint', tagline: 'fresh garden' },
  rosa: { label: 'Rosa', tagline: 'soft punk' },
  carbon: { label: 'Carbon', tagline: 'mustard noir' },
};

export const DEFAULT_THEME: ThemeKey = 'cream';

// ─────────────────────────────────────────────────────────────────────────────
// Vibes — full aesthetic systems. Vibe controls the FORM (borders, shadows,
// radii, decoration density), palette controls the COLOR.
// ─────────────────────────────────────────────────────────────────────────────

export type VibeKey = 'retro' | 'glass' | 'minimal' | 'clay' | 'brutalist';

export type ShadowStyle = 'hard' | 'soft' | 'none';

export type VibeForm = {
  borderWidth: number;
  shadowStyle: ShadowStyle;
  shadowOffset: number;
  shadowOpacity: number;
  shadowBlur: number;
  radius: number;
  radiusSmall: number;
  showDecorations: boolean;
  surfaceOpacity: number;
  pressTranslate: number;
};

export const Vibes: Record<VibeKey, VibeForm> = {
  retro: {
    borderWidth: 2.5,
    shadowStyle: 'hard',
    shadowOffset: 4,
    shadowOpacity: 1,
    shadowBlur: 0,
    radius: 4,
    radiusSmall: 2,
    showDecorations: true,
    surfaceOpacity: 1,
    pressTranslate: 4,
  },
  glass: {
    borderWidth: 1,
    shadowStyle: 'soft',
    shadowOffset: 6,
    shadowOpacity: 0.18,
    shadowBlur: 18,
    radius: 18,
    radiusSmall: 12,
    showDecorations: false,
    surfaceOpacity: 0.55,
    pressTranslate: 0,
  },
  minimal: {
    borderWidth: 1,
    shadowStyle: 'none',
    shadowOffset: 0,
    shadowOpacity: 0,
    shadowBlur: 0,
    radius: 8,
    radiusSmall: 4,
    showDecorations: false,
    surfaceOpacity: 1,
    pressTranslate: 0,
  },
  clay: {
    borderWidth: 0,
    shadowStyle: 'soft',
    shadowOffset: 8,
    shadowOpacity: 0.22,
    shadowBlur: 22,
    radius: 24,
    radiusSmall: 14,
    showDecorations: false,
    surfaceOpacity: 1,
    pressTranslate: 2,
  },
  brutalist: {
    borderWidth: 4,
    shadowStyle: 'none',
    shadowOffset: 0,
    shadowOpacity: 0,
    shadowBlur: 0,
    radius: 0,
    radiusSmall: 0,
    showDecorations: false,
    surfaceOpacity: 1,
    pressTranslate: 0,
  },
};

export const VibeMeta: Record<
  VibeKey,
  { label: string; tagline: string }
> = {
  retro: { label: 'Retro', tagline: 'sticker zine — the original' },
  glass: { label: 'Glass', tagline: 'frosted liquid panels' },
  minimal: { label: 'Minimal', tagline: 'hairlines and whitespace' },
  clay: { label: 'Clay', tagline: 'soft tactile 3D' },
  brutalist: { label: 'Brutalist', tagline: 'mono · sharp · loud' },
};

export const VibeOrder: VibeKey[] = ['retro', 'glass', 'minimal', 'clay', 'brutalist'];

export const DEFAULT_VIBE: VibeKey = 'retro';

// Back-compat alias — most code still imports `Colors`.
// `Colors.light` and `Colors.dark` remain available; new screens prefer `useTheme()`.
export const Colors = {
  light: Themes.cream,
  dark: Themes.noir,
};

export type ThemeColor = keyof ThemePalette;

export type FolderColor =
  | 'tomato'
  | 'lemon'
  | 'mint'
  | 'sky'
  | 'lilac'
  | 'bubblegum';

export const FolderColors: Record<FolderColor, string> = {
  tomato: '#FF6B5C',
  lemon: '#FFD24A',
  mint: '#7FE0B8',
  sky: '#7BB7FF',
  lilac: '#C9A6FF',
  bubblegum: '#FF9DC5',
};

export const FolderColorList: FolderColor[] = [
  'tomato',
  'lemon',
  'mint',
  'sky',
  'lilac',
  'bubblegum',
];

export const Fonts = {
  display: 'ArchivoBlack_400Regular',
  sans: 'Inter_500Medium',
  sansBold: 'Inter_700Bold',
  serif: 'DMSerifDisplay_400Regular',
  marker: 'PermanentMarker_400Regular',
  mono: Platform.select({
    ios: 'ui-monospace',
    default: 'monospace',
  }) as string,
  rounded: 'Inter_700Bold',
};

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
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  pill: 999,
} as const;

export const Borders = {
  hair: 1,
  thin: 1.5,
  thick: 2.5,
  chonk: 4,
} as const;

export const Shadows = {
  hard: { offset: 4, color: '#0A0A0A' },
  hardSmall: { offset: 2, color: '#0A0A0A' },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
