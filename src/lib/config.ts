import { Platform } from 'react-native';

const BACKEND_PORT = 8080;
const DEV_LAN_HOST = '192.168.215.47';

export const API_BASE_URL = __DEV__
  ? `http://${Platform.OS === 'android' ? DEV_LAN_HOST : 'localhost'}:${BACKEND_PORT}`
  : 'https://your-prod-host.example.com';
