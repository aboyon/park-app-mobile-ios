import { Redirect, Tabs } from 'expo-router';
import { CalendarClock, ChevronRight, Home, User } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RequireVehicleScreen from '@/components/require-vehicle-screen';
import { API_BASE_URL, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { type ActiveReservation, useMe } from '@/context/me';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getRemainingSeconds(startTime: string, keepMinutes: number): number {
  const expiresAt = new Date(startTime).getTime() + keepMinutes * 60 * 1000;
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

function ParkeArLogo() {
  const theme = useAppTheme();
  return (
    <View style={logoStyles.container}>
      <Text style={[logoStyles.text, { color: theme.text }]}>parke</Text>
      <Text style={[logoStyles.text, { color: theme.tint }]}>.ar</Text>
      <Text style={[logoStyles.separator, { color: theme.textMuted }]}> ·</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 4,
  },
  text: {
    fontSize: 20,
    fontFamily: 'Syne_800ExtraBold',
    letterSpacing: -0.5,
  },
  separator: {
    fontSize: 16,
    fontFamily: 'Syne_700Bold',
  },
});

function CustomTabBar({
  state,
  descriptors,
  navigation,
  isPending,
  countdown,
  blinkAnim,
  reservation,
}: {
  state: any;
  descriptors: any;
  navigation: any;
  isPending: boolean;
  countdown: number;
  blinkAnim: Animated.Value;
  reservation: ActiveReservation | null;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const styles = makeTabBarStyles(theme);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {reservation && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => navigation.navigate('index')}
          activeOpacity={0.9}
        >
          <Animated.View
            style={[
              styles.bannerDot,
              isPending ? styles.bannerDotPending : styles.bannerDotActive,
              isPending && { opacity: blinkAnim },
            ]}
          />
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerStatus} numberOfLines={1}>
              {isPending
                ? `${t('reservations.status.pending')}${countdown > 0 ? ` · ${formatCountdown(countdown)}` : ''}`
                : t('reservations.status.in_progress')}
            </Text>
            <Text style={styles.bannerName} numberOfLines={1}>{reservation.parking.name}</Text>
          </View>
          <ChevronRight color={theme.textMuted} size={16} />
        </TouchableOpacity>
      )}
      <View style={styles.tabRow}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          if (!options.tabBarIcon) return null;

          const isFocused = state.index === index;
          const color = isFocused ? theme.tint : theme.textMuted;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              {options.tabBarIcon({ color, size: 24, focused: isFocused })}
              <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                {options.title ?? route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { token } = useAuth();
  const { me, loading, error, refresh } = useMe();
  const theme = useAppTheme();
  const { t } = useLocale();
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const [countdown, setCountdown] = useState(0);

  const reservation = me?.active_reservation ?? null;
  const isPending = reservation?.status === 'pending';

  useEffect(() => {
    if (!isPending) {
      blinkAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.15, duration: 900, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isPending]);

  useEffect(() => {
    if (!isPending || !reservation) return;
    const keepMinutes = reservation.parking.keep_slot_open_minutes;
    if (keepMinutes == null) return;

    const current = getRemainingSeconds(reservation.start_time, keepMinutes);
    setCountdown(current);

    if (current === 0) {
      fetch(`${API_BASE_URL}/api/parking-reservations/${reservation.id}?expired_by_app=true`, {
        method: 'DELETE',
        headers: apiHeaders(token!),
      })
        .then(() => refresh())
        .catch(() => {});
      return;
    }

    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(reservation.start_time, keepMinutes);
      setCountdown(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        fetch(`${API_BASE_URL}/api/parking-reservations/${reservation.id}?expired_by_app=true`, {
          method: 'DELETE',
          headers: apiHeaders(token!),
        })
          .then(() => refresh())
          .catch(() => {});
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPending, reservation?.id, reservation?.start_time]);

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

  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          isPending={isPending}
          countdown={countdown}
          blinkAnim={blinkAnim}
          reservation={reservation}
        />
      )}
      screenOptions={{
        headerShown: true,
        headerLeft: () => <ParkeArLogo />,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          fontSize: 14,
          paddingTop: 2,
        },
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="reservations" options={{ href: null }} />
      <Tabs.Screen
        name="scheduled"
        options={{
          title: t('tabs.scheduled'),
          tabBarIcon: ({ color, size }) => <CalendarClock color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="preferences" options={{ href: null }} />
      <Tabs.Screen name="vehicles" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="home-tab" options={{ href: null }} />
      <Tabs.Screen name="parking-detail" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
    </Tabs>
  );
}

function makeTabBarStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.tabBarBg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.divider,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.divider,
    },
    bannerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      flexShrink: 0,
    },
    bannerDotPending: {
      backgroundColor: theme.amber ?? '#f5a623',
    },
    bannerDotActive: {
      backgroundColor: theme.tint,
    },
    bannerInfo: {
      flex: 1,
      gap: 1,
    },
    bannerStatus: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    bannerName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    tabRow: {
      flexDirection: 'row',
      height: 49,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: '500',
    },
  });
}
