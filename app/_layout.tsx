import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/auth';
import { useMe, MeProvider } from '@/context/me';
import { useColorScheme } from '@/hooks/use-color-scheme';

function NotificationOverlay() {
  const { notificationAlert, clearNotificationAlert } = useMe();

  useEffect(() => {
    if (!notificationAlert) return;
    const timer = setTimeout(clearNotificationAlert, 4000);
    return () => clearTimeout(timer);
  }, [notificationAlert]);

  if (!notificationAlert) return null;

  const isExpired = notificationAlert.type === 'reservation_expired';

  return (
    <View style={styles.overlay}>
      <View style={[styles.alertBox, isExpired ? styles.alertExpired : styles.alertCancelled]}>
        <Text style={styles.alertIcon}>{isExpired ? '⏰' : '✕'}</Text>
        <Text style={styles.alertMessage}>{notificationAlert.message}</Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <MeProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
        <NotificationOverlay />
      </MeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 999,
  },
  alertBox: {
    marginHorizontal: 32,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  alertCancelled: {
    backgroundColor: '#fff1f0',
  },
  alertExpired: {
    backgroundColor: '#f5f5f5',
  },
  alertIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    color: '#1a1a1a',
  },
});
