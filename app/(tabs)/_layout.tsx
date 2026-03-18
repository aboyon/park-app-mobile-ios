import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import ActiveReservationScreen from '@/components/active-reservation-screen';
import RequireVehicleScreen from '@/components/require-vehicle-screen';
import { useAuth } from '@/context/auth';
import { useMe } from '@/context/me';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TabLayout() {
  const { token } = useAuth();
  const { me, loading, error, refresh } = useMe();
  const theme = useAppTheme();

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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Index',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Reservations',
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Vehicles',
          tabBarIcon: ({ color }) => <Ionicons name="car-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color }) => <Ionicons name="card-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="home-tab" options={{ href: null }} />
      <Tabs.Screen name="parking-detail" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
    </Tabs>
  );
}
