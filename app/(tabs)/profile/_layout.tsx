import { Stack } from 'expo-router';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function ProfileLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.pageBackground },
      }}
    />
  );
}
