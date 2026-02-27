import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';

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

type MeContextType = {
  me: MeData | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
};

const MeContext = createContext<MeContextType>({
  me: null,
  loading: false,
  error: false,
  refresh: () => Promise.resolve(),
});

export function MeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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

  return (
    <MeContext.Provider value={{ me, loading, error, refresh }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe() {
  return useContext(MeContext);
}
