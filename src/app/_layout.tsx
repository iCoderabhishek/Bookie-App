import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { ErrorBoundary } from '@/components/error-boundary';
import { ShareIntentHandler } from '@/components/share-intent-handler';
import { Colors } from '@/constants/theme';
import { Sentry, initSentry } from '@/lib/sentry';

initSentry();

function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  return (
    <ErrorBoundary>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ShareIntentHandler />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.background },
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
        </Stack>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
