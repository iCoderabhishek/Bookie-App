import { useThemeContext } from '@/hooks/theme-provider';

export function useVibe() {
  return useThemeContext().vibe;
}

export function useVibeKey() {
  return useThemeContext().vibeKey;
}
