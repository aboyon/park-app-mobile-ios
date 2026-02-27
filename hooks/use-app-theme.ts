import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AppTheme = typeof Colors.light;

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}
