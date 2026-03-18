import { Colors, type AppTheme } from '@/constants/theme';
import { useTheme } from '@/context/theme';

export type { AppTheme };

export function useAppTheme(): AppTheme {
  const { colorScheme } = useTheme();
  return Colors[colorScheme];
}
