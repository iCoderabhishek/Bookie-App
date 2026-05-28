import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  DEFAULT_THEME,
  DEFAULT_VIBE,
  Themes,
  Vibes,
  type ThemeKey,
  type ThemePalette,
  type VibeForm,
  type VibeKey,
} from '@/constants/theme';
import { getSetting, setSetting } from '@/lib/db';

const THEME_SETTING_KEY = 'theme';
const VIBE_SETTING_KEY = 'vibe';
const FOLLOW_SYSTEM_KEY = '__system__';

type Ctx = {
  themeKey: ThemeKey | typeof FOLLOW_SYSTEM_KEY;
  vibeKey: VibeKey;
  palette: ThemePalette;
  vibe: VibeForm;
  appearance: 'light' | 'dark';
  setThemeKey: (key: ThemeKey | typeof FOLLOW_SYSTEM_KEY) => void;
  setVibeKey: (key: VibeKey) => void;
  followsSystem: boolean;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [themeKey, setThemeKeyState] = useState<ThemeKey | typeof FOLLOW_SYSTEM_KEY>(
    FOLLOW_SYSTEM_KEY,
  );
  const [vibeKey, setVibeKeyState] = useState<VibeKey>(DEFAULT_VIBE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [t, v] = await Promise.all([
          getSetting(THEME_SETTING_KEY),
          getSetting(VIBE_SETTING_KEY),
        ]);
        if (!alive) return;
        if (t && (t === FOLLOW_SYSTEM_KEY || t in Themes)) {
          setThemeKeyState(t as ThemeKey | typeof FOLLOW_SYSTEM_KEY);
        }
        if (v && v in Vibes) {
          setVibeKeyState(v as VibeKey);
        }
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setThemeKey = useCallback(
    (key: ThemeKey | typeof FOLLOW_SYSTEM_KEY) => {
      setThemeKeyState(key);
      setSetting(THEME_SETTING_KEY, key).catch(() => {});
    },
    [],
  );

  const setVibeKey = useCallback((key: VibeKey) => {
    setVibeKeyState(key);
    setSetting(VIBE_SETTING_KEY, key).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => {
    const followsSystem = themeKey === FOLLOW_SYSTEM_KEY;
    const resolvedKey: ThemeKey = followsSystem
      ? scheme === 'dark'
        ? 'noir'
        : DEFAULT_THEME
      : themeKey;
    const palette = Themes[resolvedKey];
    return {
      themeKey,
      vibeKey,
      palette,
      vibe: Vibes[vibeKey],
      appearance: palette.appearance,
      setThemeKey,
      setVibeKey,
      followsSystem,
    };
  }, [themeKey, vibeKey, scheme, setThemeKey, setVibeKey]);

  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      themeKey: FOLLOW_SYSTEM_KEY,
      vibeKey: DEFAULT_VIBE,
      palette: Themes[DEFAULT_THEME],
      vibe: Vibes[DEFAULT_VIBE],
      appearance: Themes[DEFAULT_THEME].appearance,
      setThemeKey: () => {},
      setVibeKey: () => {},
      followsSystem: true,
    };
  }
  return ctx;
}

export { FOLLOW_SYSTEM_KEY };
