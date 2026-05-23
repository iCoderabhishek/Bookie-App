import { Platform } from 'react-native';

/**
 * Backend base URL.
 * - Android emulator: http://10.0.2.2:8080 reaches host machine's localhost.
 * - iOS simulator: http://localhost:8080 works.
 * - Physical device: replace with your machine's LAN IP, e.g. http://192.168.1.42:8080.
 * - Production: set to your deployed bookie.ai URL.
 */
const DEV_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export const API_BASE_URL = DEV_BASE_URL;
