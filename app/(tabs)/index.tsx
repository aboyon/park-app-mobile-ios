import * as Location from 'expo-location';
import { MapPin, RefreshCw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ParkingDetail from '@/components/parking-detail';
import { API_BASE, apiHeaders, MIN_DRIVING_SPEED_KMH, NEARBY_RADIUS_METRES } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useMe } from '@/context/me';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

type ParkingRate = {
  week_of_day: number;
  rate_per_hour_cents: number;
};

type Vehicle = {
  id: number;
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

type Parking = {
  id: number;
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
};

function getTodayRate(rates: ParkingRate[]): ParkingRate | null {
  const today = new Date().getDay();
  return rates.find((r) => r.week_of_day === today) ?? null;
}

function formatRate(cents: number): string {
  return `€${(cents / 100).toFixed(2)}/h`;
}

export default function IndexScreen() {
  const { token } = useAuth();
  const { me } = useMe();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { t } = useLocale();
  const [speed, setSpeed] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [selectedParking, setSelectedParking] = useState<Parking | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const lastCoords = useRef<{ latitude: number; longitude: number } | null>(null);

  const nearbyRadius = useRef<number>(NEARBY_RADIUS_METRES);
  const isNotDriving = speed !== null && speed <= MIN_DRIVING_SPEED_KMH;

  useEffect(() => {
    if (me?.notifiable_distance) nearbyRadius.current = me.notifiable_distance;
  }, [me?.notifiable_distance]);

  const fetchNearbyParkings = async (latitude: number, longitude: number) => {
    try {
      const url = `${API_BASE}/api/near-to-me?latitude=${latitude}&longitude=${longitude}&radius=${nearbyRadius.current}`;
      const response = await fetch(url, { headers: apiHeaders(token!) });
      const data = await response.json();
      setParkings(data);
      setStatus(t('home.foundParkings', { count: data.length }));
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
            setStatus(t('home.notDriving'));
            setParkings([]);
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
    return <ParkingDetail parking={selectedParking} onBack={() => setSelectedParking(null)} />;
  }

  return (
    <View style={styles.container}>
      {/* Large title header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('home.title')}</Text>
      </View>

      <Text style={styles.statusText}>{status}{speed !== null ? ` · ${speed} km/h` : ''}</Text>

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
        {parkings.length > 0 && (
          <View style={styles.groupCard}>
            {parkings.map((parking, index) => {
              const rate = getTodayRate(parking.parking_rates ?? []);
              const isFlexible = parking.rate_policy_strategy === 'flexible';
              const isStrict = parking.rate_policy_strategy === 'strict';

              return (
                <View key={index}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => setSelectedParking(parking)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{parking.name}</Text>
                      <View style={styles.rowAddressLine}>
                        <MapPin color={theme.textMuted} size={11} />
                        <Text style={styles.rowAddress}>{parking.address}</Text>
                      </View>
                      <Text style={styles.rowDistance}>{t('common.kmAway', { distance: (parking.distance / 1000).toFixed(1) })}</Text>
                      {(isFlexible || isStrict) && (
                        <View style={[styles.policyBadge, isFlexible ? styles.policyFlexible : styles.policyStrict]}>
                          <Text style={[styles.policyBadgeText, isFlexible ? styles.policyFlexibleText : styles.policyStrictText]}>
                            {isFlexible ? t('home.flexible') : t('home.strict')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.rowRight}>
                      {rate && <Text style={styles.rowRate}>{formatRate(rate.rate_per_hour_cents)}</Text>}
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
      paddingTop: 60,
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
      marginBottom: 14,
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
      paddingHorizontal: 16,
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
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
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
    policyBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    policyFlexible: {
      backgroundColor: '#dcfce7',
    },
    policyStrict: {
      backgroundColor: '#fef3c7',
    },
    policyBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    policyFlexibleText: {
      color: '#15803d',
    },
    policyStrictText: {
      color: '#92400e',
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
  });
}
