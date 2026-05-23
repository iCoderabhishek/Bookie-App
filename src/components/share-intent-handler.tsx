import { useRouter } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { useEffect } from 'react';

/**
 * Listens for Android share-intent payloads (text/url shared from another app)
 * and routes to /add with the URL prefilled. Render once near the root.
 *
 * Note: Requires an EAS dev build — share intents do NOT work in Expo Go.
 */
export function ShareIntentHandler() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent) return;
    const url = shareIntent.webUrl ?? extractUrl(shareIntent.text ?? '');
    if (url) {
      router.push({ pathname: '/add', params: { url } });
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  return null;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/i;

function extractUrl(text: string): string | null {
  const m = text.match(URL_REGEX);
  return m ? m[0] : null;
}
