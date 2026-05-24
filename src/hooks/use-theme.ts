import { useThemeContext } from '@/hooks/theme-provider';

export function useTheme() {
  return useThemeContext().palette;
}
