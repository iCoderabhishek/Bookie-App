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
  Themes,
  type ThemeKey,
  type ThemePalette,
} from '@/constants/theme';
import { getSetting, setSetting } from '@/lib/db';

const THEME_SETTING_KEY = 'theme';
const FOLLOW_SYSTEM_KEY = '__system__';

type Ctx = {
  themeKey: ThemeKey | typeof FOLLOW_SYSTEM_KEY;
  palette: ThemePalette;
  appearance: 'light' | 'dark';
  setThemeKey: (key: ThemeKey | typeof FOLLOW_SYSTEM_KEY) => void;
  followsSystem: boolean;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [themeKey, setThemeKeyState] = useState<ThemeKey | typeof FOLLOW_SYSTEM_KEY>(
    FOLLOW_SYSTEM_KEY,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await getSetting(THEME_SETTING_KEY);
        if (!alive) return;
        if (v && (v === FOLLOW_SYSTEM_KEY || v in Themes)) {
          setThemeKeyState(v as ThemeKey | typeof FOLLOW_SYSTEM_KEY);
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
      palette,
      appearance: palette.appearance,
      setThemeKey,
      followsSystem,
    };
  }, [themeKey, scheme, setThemeKey]);

  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback before provider mounts (e.g. very early render): use cream.
    return {
      themeKey: FOLLOW_SYSTEM_KEY,
      palette: Themes[DEFAULT_THEME],
      appearance: Themes[DEFAULT_THEME].appearance,
      setThemeKey: () => {},
      followsSystem: true,
    };
  }
  return ctx;
}

export { FOLLOW_SYSTEM_KEY };
