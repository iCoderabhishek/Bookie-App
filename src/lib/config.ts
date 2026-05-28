import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const DEFAULT_BACKEND_PORT = '8080';

/**
 * Best-effort LAN host detection for dev builds. We try, in order:
 *   1. `Constants.expoConfig.hostUri` (set when running in Expo Go)
 *   2. `Constants.expoGoConfig.debuggerHost` (older Expo Go field)
 *   3. The Metro bundle URL (`SourceCode.scriptURL`) — populated in any RN
 *      dev build, including custom dev clients. This is the laptop's actual
 *      LAN IP because that's where Metro served the JS from.
 * Falls back to `127.0.0.1` only if every source is empty (which usually
 * means we're not in dev — at which point we'd return the prod URL anyway).
 */
const resolveLanHost = (): string => {
  // Manual override — set EXPO_PUBLIC_LAN_HOST in your .env when on WiFi.
  const envHost = process.env.EXPO_PUBLIC_LAN_HOST;
  if (envHost) return envHost;

  const expoHostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } })
      .expoGoConfig?.debuggerHost ??
    '';
  if (expoHostUri) {
    const host = expoHostUri.split(':')[0].replace(/^https?:\/\//, '');
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }

  const scriptURL: string =
    (NativeModules as { SourceCode?: { scriptURL?: string } }).SourceCode
      ?.scriptURL ?? '';
  const match = scriptURL.match(/https?:\/\/([^:/]+)/);
  if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
    return match[1];
  }

  // Falling back to 127.0.0.1 assumes `adb reverse tcp:8080 tcp:8080` is set
  // up on USB. On WiFi, set EXPO_PUBLIC_LAN_HOST=<laptop-lan-ip> in .env.
  return '127.0.0.1';
};

/**
 * Resolve API_BASE_URL from env first, then fall back to dev/prod defaults.
 *
 * Precedence:
 *   1. `EXPO_PUBLIC_API_BASE_URL` — explicit override; wins for any build.
 *      Use this when pointing at a staging server, ngrok tunnel, etc.
 *   2. In dev: `http://<inferred-or-EXPO_PUBLIC_LAN_HOST>:<EXPO_PUBLIC_API_PORT|8080>`
 *   3. In prod: `EXPO_PUBLIC_API_PROD_URL` or a placeholder if unset.
 */
const resolveApiBaseUrl = (): string => {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  if (__DEV__) {
    const port = process.env.EXPO_PUBLIC_API_PORT ?? DEFAULT_BACKEND_PORT;
    const host = Platform.OS === 'android' ? resolveLanHost() : 'localhost';
    return `http://${host}:${port}`;
  }

  const prod = process.env.EXPO_PUBLIC_API_PROD_URL;
  if (prod) return prod.replace(/\/+$/, '');

  return 'https://api.getbookie.fun';
};

export const API_BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[config] API_BASE_URL =', API_BASE_URL);
}
