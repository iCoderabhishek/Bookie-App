import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { ErrorBoundary } from '@/components/error-boundary';
import { OnboardingCarousel } from '@/components/onboarding/onboarding-carousel';
import { ShareIntentHandler } from '@/components/share-intent-handler';
import { Themes } from '@/constants/theme';
import {
  ThemeProvider as AppThemeProvider,
  useThemeContext,
} from '@/hooks/theme-provider';
import { getSetting, setSetting } from '@/lib/db';
import { Sentry, initSentry } from '@/lib/sentry';

const ONBOARDING_KEY = 'onboarding_complete';
const ONBOARDED_AT_KEY = 'onboarded_at';
const USER_NAME_KEY = 'user_name'; // mirrors NAME_KEY in app/settings.tsx

initSentry();
SplashScreen.preventAutoHideAsync().catch(() => {});

// tentap-editor's bridge warns "Editor isn't ready yet" every time it tries
// to send a message before the WebView ref attaches (~10 warns per editor
// mount during the brief init window). Silence just that one — it's benign
// and the editor recovers on its own once the WebView is up.
{
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes("Editor isn't ready yet")) {
      return;
    }
    origWarn(...args);
  };
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    ArchivoBlack_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    DMSerifDisplay_400Regular,
    PermanentMarker_400Regular,
  });

  // null = still reading the flag; true/false once known. We hold the native
  // splash until both fonts and this are resolved so the home screen never
  // flashes before the first-run carousel.
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    getSetting(ONBOARDING_KEY)
      .then((v) => {
        if (alive) setOnboardingDone(v === '1');
      })
      .catch(() => {
        // If the read fails, don't trap the user behind onboarding.
        if (alive) setOnboardingDone(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const appReady = fontsLoaded && onboardingDone !== null;

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  if (!appReady) {
    return <View style={{ flex: 1, backgroundColor: Themes.cream.background }} />;
  }

  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <ThemedStack needsOnboarding={onboardingDone === false} />
      </AppThemeProvider>
    </ErrorBoundary>
  );
}

function ThemedStack({ needsOnboarding }: { needsOnboarding: boolean }) {
  const { palette, appearance } = useThemeContext();
  const navTheme = appearance === 'dark' ? DarkTheme : DefaultTheme;
  const [showOnboarding, setShowOnboarding] = useState(needsOnboarding);

  // Establish the user only on genuine completion (Get Started): persist their
  // name (if any) and stamp the moment as the baseline for any counting.
  const finishOnboarding = useCallback((name: string) => {
    setShowOnboarding(false);
    const trimmed = name.trim();
    const writes = [
      setSetting(ONBOARDING_KEY, '1'),
      setSetting(ONBOARDED_AT_KEY, String(Date.now())),
    ];
    if (trimmed) writes.push(setSetting(USER_NAME_KEY, trimmed));
    Promise.all(writes).catch(() => {});
  }, []);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={appearance === 'dark' ? 'light' : 'dark'} />
      <ShareIntentHandler />
      <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: palette.background },
          headerShown: false,
          animation: 'fade_from_bottom',
          animationDuration: 200,
        }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="add"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="bookmark/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="notes" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="note/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="todos" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="folder/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="settings"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
      {showOnboarding ? <OnboardingCarousel onComplete={finishOnboarding} /> : null}
      </View>
    </ThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
