import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useFocusEffect, useRouter } from 'expo-router';
import { MapPin, RefreshCw, TriangleAlert, Wallet } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ParkingDetail from '@/components/parking-detail';
import { API_BASE_URL, apiHeaders, MIN_DRIVING_SPEED_KMH, NEARBY_RADIUS_METRES } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useMe } from '@/context/me';
import { useSearchPreferences } from '@/context/search-preferences';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

type ParkingRate = {
  week_of_day: number;
  rate_per_hour_cents: number;
};

type Vehicle = {
  id: string;
  license_plate: string;
  vehicle_type: 'car' | 'truck' | 'motorcycle' | 'suv' | 'pickup';
  is_default: boolean;
};

type VehicleRate = {
  rate_per_hour: number;
  rate_per_hour_cents: number;
  wday: number;
};

type VehicleRates = Record<string, VehicleRate>;

type Opening = {
  open_at: string;
  close_at: string;
};

type Parking = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  available_slots: number;
  keep_slot_open_minutes: number;
  rate_policy_strategy: string;
  lock_slot_charge_policy?: string;
  today_penalization_rate: string | null;
  today_rate_cents: VehicleRates;
  today_penalization_rates_cents: VehicleRates;
  parking_rates?: ParkingRate[];
  openings?: Opening[];
  active_subscription?: { id?: string };
};

function getTodayRate(rates: ParkingRate[]): ParkingRate | null {
  const today = new Date().getDay();
  return rates.find((r) => r.week_of_day === today) ?? null;
}

function getTodayOpening(openings: Opening[]): Opening | null {
  const today = new Date().getDay();
  return openings[today] ?? null;
}

function formatRate(cents: number): string {
  return `€${(cents / 100).toFixed(2)}/h`;
}

const LOW_BALANCE_THRESHOLD = 10000;

export default function IndexScreen() {
  const { token } = useAuth();
  const { me } = useMe();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { t } = useLocale();
  const { inDayTimes, onlyOperatives } = useSearchPreferences();
  const [speed, setSpeed] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [selectedParking, setSelectedParking] = useState<Parking | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const lastCoords = useRef<{ latitude: number; longitude: number } | null>(null);

  const nearbyRadius = useRef<number>(NEARBY_RADIUS_METRES);
  const isNotDriving = speed !== null && speed <= MIN_DRIVING_SPEED_KMH;
  const isDriving = speed !== null && speed > MIN_DRIVING_SPEED_KMH;
  const [screenFocused, setScreenFocused] = useState(false);

  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    return () => {
      setScreenFocused(false);
      deactivateKeepAwake('home-search');
    };
  }, []));

  useEffect(() => {
    if (!screenFocused) return;
    const tag = 'home-search';
    if (isDriving || manualLoading) {
      activateKeepAwakeAsync(tag);
    } else {
      deactivateKeepAwake(tag);
    }
  }, [screenFocused, isDriving, manualLoading]);

  useEffect(() => {
    if (me?.notifiable_distance) nearbyRadius.current = me.notifiable_distance;
  }, [me?.notifiable_distance]);

  const fetchNearbyParkings = async (latitude: number, longitude: number) => {
    try {
      let url = `${API_BASE_URL}/api/near-to-me?latitude=${latitude}&longitude=${longitude}&radius=${nearbyRadius.current}`;
      if (inDayTimes) url += `&in_day_times=true`;
      if (onlyOperatives) url += `&only_operatives=true`;
      const response = await fetch(url, { headers: apiHeaders(token!) });
      const data = await response.json();
      setParkings(data);
      setStatus(data.length > 0 ? t('home.foundParkings', { count: data.length }) : '');
    } catch {
      setStatus(t('home.couldNotFetch'));
    }
  };

  const handleManualSearch = async () => {
    if (!lastCoords.current) return;
    setManualLoading(true);
    await fetchNearbyParkings(lastCoords.current.latitude, lastCoords.current.longitude);
    setManualLoading(false);
  };

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        setStatus(t('home.waitingForLocation'));
        return;
      }

      setStatus(t('home.waitingForLocation'));

      subscriber = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (location) => {
          const { latitude, longitude } = location.coords;
          lastCoords.current = { latitude, longitude };
          const speedMs = location.coords.speed ?? 0;
          const speedKmh = Math.round(speedMs * 3.6);
          setSpeed(speedKmh);

          if (speedKmh > MIN_DRIVING_SPEED_KMH) {
            fetchNearbyParkings(latitude, longitude);
          } else {
            setParkings([]);
            setStatus('');
          }
        }
      );
    };

    startTracking();
    return () => {
      subscriber?.remove();
    };
  }, []);

  if (selectedParking) {
    return (
      <ParkingDetail
        parking={selectedParking}
        onBack={() => setSelectedParking(null)}
        userLocation={lastCoords.current ?? undefined}
      />
    );
  }

  const walletBalance = me?.wallet?.balance ?? null;
  const isNegativeBalance = walletBalance !== null && walletBalance < 0;
  const isLowBalance = walletBalance !== null && walletBalance >= 0 && walletBalance < LOW_BALANCE_THRESHOLD;

  if (isNegativeBalance) {
    return (
      <View style={styles.blockerContainer}>
        <Wallet color={theme.tint} size={48} style={styles.blockerIcon} />
        <Text style={styles.blockerTitle}>{t('home.negativeBalanceTitle')}</Text>
        <Text style={styles.blockerMessage}>{t('home.negativeBalanceMessage')}</Text>
        <TouchableOpacity
          style={styles.blockerButton}
          onPress={() => router.push('/(tabs)/profile/wallet/topup')}
          activeOpacity={0.8}
        >
          <Text style={styles.blockerButtonText}>{t('home.negativeBalanceCTA')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Large title header */}

      {/* Speed indicator — fixed top-right overlay */}
      <View style={styles.speedOverlay}>
        <Text style={styles.speedNumber}>{speed !== null ? String(Math.max(0, speed)) : '—'}</Text>
        <Text style={styles.speedUnit}>km/h</Text>
      </View>

      {isLowBalance && (
        <TouchableOpacity
          style={styles.lowBalanceBanner}
          onPress={() => router.push('/(tabs)/profile/wallet/topup')}
          activeOpacity={0.8}
        >
          <TriangleAlert color={theme.amber ?? '#f5a623'} size={16} />
          <Text style={styles.lowBalanceText}>
            {t('home.lowBalanceWarning', { balance: (walletBalance ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0 }) })}
          </Text>
          <Text style={styles.lowBalanceCTA}>{t('home.lowBalanceCTA')}</Text>
        </TouchableOpacity>
      )}

      {status !== '' && <Text style={styles.statusText}>{status}</Text>}

      {isNotDriving && (
        <TouchableOpacity
          style={[styles.refreshButton, manualLoading && styles.refreshButtonLoading]}
          onPress={handleManualSearch}
          disabled={manualLoading}
          activeOpacity={0.7}
        >
          {manualLoading ? (
            <ActivityIndicator color={theme.tint} size="small" />
          ) : (
            <RefreshCw color={theme.tint} size={18} />
          )}
          <Text style={styles.refreshButtonText}>
            {manualLoading ? t('home.searching') : t('home.searchNearby')}
          </Text>
        </TouchableOpacity>
      )}

      {parkings.length > 0 && (
        <Text style={styles.sectionLabel}>{t('home.availableNow')}</Text>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {parkings.length === 0 && (
          <Text style={styles.emptyText}>{t('home.noParkingsNearby')}</Text>
        )}
        {parkings.length > 0 && (
          <View style={styles.groupCard}>
            {parkings.map((parking, index) => {
              const rate = getTodayRate(parking.parking_rates ?? []);
              const opening = getTodayOpening(parking.openings ?? []);
              const hasSubscription = !!parking.active_subscription?.id;

              return (
                <View key={index}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <TouchableOpacity
                    style={[styles.row, !hasSubscription && styles.rowMuted]}
                    onPress={() => setSelectedParking(parking)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowName, !hasSubscription && styles.rowNameMuted]}>
                        {parking.name}
                      </Text>
                      <View style={styles.rowAddressLine}>
                        <MapPin color={theme.textMuted} size={11} />
                        <Text style={styles.rowAddress}>{parking.address}</Text>
                      </View>
                      <Text style={styles.rowDistance}>{t('common.kmAway', { distance: (parking.distance / 1000).toFixed(1) })}</Text>
                      {hasSubscription && (
                        <View style={styles.rowMeta}>
                          <Text style={styles.rowMetaText}>
                            {t('home.waitsForArrival', { minutes: parking.keep_slot_open_minutes })}
                          </Text>
                          <Text style={styles.rowMetaDot}>·</Text>
                          <Text style={styles.rowMetaText}>
                            {opening
                              ? t('home.openToday', { open: opening.open_at, close: opening.close_at })
                              : t('home.closedToday')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.rowRight}>
                      {hasSubscription && rate && (
                        <Text style={styles.rowRate}>{formatRate(rate.rate_per_hour_cents)}</Text>
                      )}
                      <Text style={styles.rowChevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.pageBackground,
      paddingTop: 20,
    },
    header: {
      paddingHorizontal: 15,
      marginBottom: 4,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    speedOverlay: {
      position: 'absolute',
      bottom: 24,
      right: 15,
      alignItems: 'flex-end',
      zIndex: 10,
    },
    speedNumber: {
      fontSize: 48,
      fontWeight: 'bold',
      color: theme.text,
      fontVariant: ['tabular-nums'],
      lineHeight: 52,
      textAlign: 'right',
    },
    speedUnit: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textMuted,
      textAlign: 'right',
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 15,
      marginBottom: 14,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.tint,
    },
    refreshButtonLoading: {
      opacity: 0.6,
    },
    refreshButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.tint,
    },
    statusText: {
      fontSize: 13,
      color: theme.textMuted,
      paddingHorizontal: 15,
      marginBottom: 10,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.5,
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    groupCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 14,
      gap: 12,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.divider,
      marginLeft: 16,
    },
    rowInfo: {
      flex: 1,
    },
    rowMuted: {
      opacity: 0.5,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    rowNameMuted: {
      color: theme.textMuted,
    },
    rowAddressLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 2,
    },
    rowAddress: {
      fontSize: 13,
      color: theme.textMuted,
      flex: 1,
    },
    rowDistance: {
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 6,
    },
    rowMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    rowMetaText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    rowMetaDot: {
      fontSize: 12,
      color: theme.textMuted,
    },
    rowRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    rowRate: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.tint,
    },
    rowChevron: {
      fontSize: 20,
      color: theme.border,
      lineHeight: 22,
    },
    emptyText: {
      fontSize: 15,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 40,
    },
    lowBalanceBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 15,
      marginBottom: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: 'rgba(245,166,35,0.12)',
      borderWidth: 1,
      borderColor: theme.amber ?? '#f5a623',
    },
    lowBalanceText: {
      flex: 1,
      fontSize: 13,
      color: theme.amber ?? '#f5a623',
    },
    lowBalanceCTA: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.amber ?? '#f5a623',
    },
    blockerContainer: {
      flex: 1,
      backgroundColor: theme.pageBackground,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    blockerIcon: {
      marginBottom: 8,
    },
    blockerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    blockerMessage: {
      fontSize: 15,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    blockerButton: {
      marginTop: 12,
      backgroundColor: theme.tint,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 32,
    },
    blockerButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
