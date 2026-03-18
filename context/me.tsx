import * as Notifications from 'expo-notifications';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';

export type Rate = {
  day_of_week: string;
  start_time: string;
  end_time: string;
  rate_per_hour: number;
};

export type ActiveReservation = {
  id: number;
  status: string;
  start_time: string;
  end_time: string | null;
  amount_due: number;
  parking: {
    id: number;
    name: string;
    address: string;
    keep_slot_open_minutes?: number;
    rates?: Rate[];
  };
};

export type Vehicle = {
  id: number;
  license_plate: string;
  vehicle_type: 'car' | 'truck' | 'motorcycle';
  is_default: boolean;
};

type MeData = {
  notifiable_distance: number;
  active_reservation: ActiveReservation | null;
  user_vehicles: Vehicle[];
};

export type NotificationAlert = {
  type: 'reservation_cancelled' | 'reservation_expired' | 'payment_completed';
  message: string;
};

type MeContextType = {
  me: MeData | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  notificationAlert: NotificationAlert | null;
  clearNotificationAlert: () => void;
};

const MeContext = createContext<MeContextType>({
  me: null,
  loading: false,
  error: false,
  refresh: () => Promise.resolve(),
  notificationAlert: null,
  clearNotificationAlert: () => {},
});

// Module-level: track which push token has already been sent so it's only
// registered once per app session regardless of how many times the user logs in.
let registeredPushToken: string | null = null;

const NOTIFICATION_MESSAGES: Record<string, { default: string; admin: string }> = {
  reservation_cancelled: {
    default: 'Your reservation has been cancelled.',
    admin: 'Your reservation has been cancelled by the parking.',
  },
  reservation_expired: {
    default: 'Your reservation has expired.',
    admin: 'Your reservation has been expired by the parking.',
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function MeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [notificationAlert, setNotificationAlert] = useState<NotificationAlert | null>(null);
  const meRef = useRef(me);
  useEffect(() => { meRef.current = me; }, [me]);

  useEffect(() => {
    if (!token) return;

    const registerPushToken = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
          projectId: '3cde002a-6754-482d-8754-6bd8c6e298c0',
        });
        if (pushToken === registeredPushToken) return;
        await fetch(`${API_BASE}/api/app-notfication-token`, {
          method: 'PATCH',
          headers: apiHeaders(token),
          body: JSON.stringify({ app_notification_token: pushToken }),
        });
        registeredPushToken = pushToken;
      } catch {}
    };

    registerPushToken();
  }, [token]);

  useEffect(() => {
    setMe(null);
    setError(false);
    if (!token) return;

    setLoading(true);
    fetch(`${API_BASE}/api/me`, { headers: apiHeaders(token) })
      .then(async (r) => {
        if (r.ok) setMe(await r.json());
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    await fetch(`${API_BASE}/api/me`, { headers: apiHeaders(token) })
      .then(async (r) => { if (r.ok) setMe(await r.json()); })
      .catch(() => {});
  }, [token]);

  const handleIncomingNotification = useCallback((notification: Notifications.Notification) => {
    const data = notification.request.content.data as { type?: string; triggered_by?: string };
    const type = data?.type;
    if (type === 'reservation_cancelled' || type === 'reservation_expired') {
      const byAdmin = data?.triggered_by === 'admin';
      const message = byAdmin
        ? NOTIFICATION_MESSAGES[type].admin
        : NOTIFICATION_MESSAGES[type].default;
      setNotificationAlert({ type, message });
      refresh();
    } else if (type === 'notify_payment_completed') {
      const parkingName = meRef.current?.active_reservation?.parking.name ?? 'the parking';
      setNotificationAlert({ type: 'payment_completed', message: `Thanks for parking at ${parkingName}!` });
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    const foreground = Notifications.addNotificationReceivedListener(handleIncomingNotification);
    const response = Notifications.addNotificationResponseReceivedListener(
      (r) => handleIncomingNotification(r.notification),
    );
    return () => {
      foreground.remove();
      response.remove();
    };
  }, [handleIncomingNotification]);

  const clearNotificationAlert = useCallback(() => setNotificationAlert(null), []);

  return (
    <MeContext.Provider value={{ me, loading, error, refresh, notificationAlert, clearNotificationAlert }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe() {
  return useContext(MeContext);
}
