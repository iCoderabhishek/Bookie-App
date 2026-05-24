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
import { useEffect } from 'react';
import { View } from 'react-native';

import { ErrorBoundary } from '@/components/error-boundary';
import { ShareIntentHandler } from '@/components/share-intent-handler';
import { Themes } from '@/constants/theme';
import {
  ThemeProvider as AppThemeProvider,
  useThemeContext,
} from '@/hooks/theme-provider';
import { Sentry, initSentry } from '@/lib/sentry';

initSentry();
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayout() {
  const [fontsLoaded] = useFonts({
    ArchivoBlack_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    DMSerifDisplay_400Regular,
    PermanentMarker_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Themes.cream.background }} />;
  }

  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <ThemedStack />
      </AppThemeProvider>
    </ErrorBoundary>
  );
}

function ThemedStack() {
  const { palette, appearance } = useThemeContext();
  const navTheme = appearance === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={appearance === 'dark' ? 'light' : 'dark'} />
      <ShareIntentHandler />
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
    </ThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
