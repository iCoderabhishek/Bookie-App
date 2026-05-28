import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

/**
 * Initialise Sentry once at app boot. When EXPO_PUBLIC_SENTRY_DSN is unset
 * (e.g. local dev with no Sentry project) we still call `Sentry.init` with
 * `enabled: false` — that way `Sentry.wrap` at the layout's default export
 * has the SDK state it needs and doesn't warn about "wrap called before init".
 *
 * Set EXPO_PUBLIC_SENTRY_DSN in your env (or app.json -> extra) before building
 * for production.
 */
export function initSentry() {
  const dsn =
    process.env.EXPO_PUBLIC_SENTRY_DSN ??
    (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn;

  Sentry.init({
    dsn: dsn || undefined,
    enabled: !!dsn,
    enableAutoSessionTracking: !!dsn,
    // Lower in prod once volume is known.
    tracesSampleRate: 0.2,
    // Don't send PII by default.
    sendDefaultPii: false,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export { Sentry };
