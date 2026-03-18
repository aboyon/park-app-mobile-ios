import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/auth';
import { MeProvider, useMe } from '@/context/me';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function NotificationOverlay() {
  const { notificationAlert, clearNotificationAlert } = useMe();
  const theme = useAppTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!notificationAlert) return;
    const timer = setTimeout(clearNotificationAlert, 5000);
    return () => clearTimeout(timer);
  }, [notificationAlert]);

  if (!notificationAlert) return null;

  const { type } = notificationAlert;
  const isExpired = type === 'reservation_expired';
  const isPayment = type === 'payment_completed';
  const styles = makeOverlayStyles(theme, isDark, isExpired, isPayment);

  return (
    <View style={styles.overlay}>
      <View style={styles.alertBox}>
        <Text style={styles.alertIcon}>{isPayment ? '✅' : isExpired ? '⏰' : '✕'}</Text>
        <Text style={styles.alertMessage}>{notificationAlert.message}</Text>
      </View>
    </View>
  );
}

function makeOverlayStyles(theme: AppTheme, isDark: boolean, isExpired: boolean, isPayment: boolean) {
  const cancelledBg = isDark ? '#3d1010' : '#ea867e';
  const expiredBg   = isDark ? '#0d2b3d' : '#90daf2';
  const paymentBg   = isDark ? '#0d3320' : '#dcfce7';

  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.55)',
      zIndex: 999,
    },
    alertBox: {
      marginHorizontal: 32,
      borderRadius: 16,
      padding: 15,
      alignItems: 'center',
      backgroundColor: isPayment ? paymentBg : isExpired ? expiredBg : cancelledBg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.5 : 0.2,
      shadowRadius: 12,
      elevation: 8,
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
      color: theme.text,
    },
  });
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
