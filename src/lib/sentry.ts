import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

/**
 * Initialise Sentry once at app boot. No-ops if EXPO_PUBLIC_SENTRY_DSN is unset
 * so local dev doesn't need a project.
 *
 * Set EXPO_PUBLIC_SENTRY_DSN in your env (or app.json -> extra) before building
 * for production.
 */
export function initSentry() {
  const dsn =
    process.env.EXPO_PUBLIC_SENTRY_DSN ??
    (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn;

  if (!dsn) return;

  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    // Lower in prod once volume is known.
    tracesSampleRate: 0.2,
    // Don't send PII by default.
    sendDefaultPii: false,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export { Sentry };
