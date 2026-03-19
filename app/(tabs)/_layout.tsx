import { Redirect, Tabs } from 'expo-router';
import { Car, ClipboardList, CreditCard, Home, User } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import ActiveReservationScreen from '@/components/active-reservation-screen';
import RequireVehicleScreen from '@/components/require-vehicle-screen';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useMe } from '@/context/me';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TabLayout() {
  const { token } = useAuth();
  const { me, loading, error, refresh } = useMe();
  const theme = useAppTheme();
  const { t } = useLocale();

  if (!token) return <Redirect href="/login" />;

  if (loading || (!me && !error)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.pageBackground }}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  if (me && me.user_vehicles.length === 0) {
    return <RequireVehicleScreen onDismiss={refresh} />;
  }

  if (me?.active_reservation) {
    return <ActiveReservationScreen reservation={me.active_reservation} onDismiss={refresh} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.divider,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: t('tabs.reservations'),
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: t('tabs.vehicles'),
          tabBarIcon: ({ color, size }) => <Car color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: t('tabs.payments'),
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="home-tab" options={{ href: null }} />
      <Tabs.Screen name="parking-detail" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
    </Tabs>
  );
}
