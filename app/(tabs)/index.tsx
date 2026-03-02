import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ParkingDetail from '@/components/parking-detail';
import { API_BASE, apiHeaders, MIN_DRIVING_SPEED_KMH, NEARBY_RADIUS_METRES } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useMe } from '@/context/me';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

type Rate = {
  day_of_week: string;
  start_time: string;
  end_time: string;
  rate_per_hour: number;
};

type Parking = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  available_slots: number;
  keep_slot_open_minutes: number;
  rates: Rate[];
};

export default function IndexScreen() {
  const { token } = useAuth();
  const { me } = useMe();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [speed, setSpeed] = useState<number | null>(null);
  const [status, setStatus] = useState('waiting...');
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
      setStatus(`Found ${data.length} parkings nearby`);
    } catch {
      setStatus('❌ API error');
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
        setStatus('Location permission denied');
        return;
      }

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
            setStatus('🅿️ Not driving');
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
      <Text style={styles.title}>Park App</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.speed}>Speed: {speed !== null ? `${speed} km/h` : '---'}</Text>

      {isNotDriving && (
        <TouchableOpacity
          style={[styles.manualButton, manualLoading && styles.manualButtonDisabled]}
          onPress={handleManualSearch}
          disabled={manualLoading}
        >
          {manualLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.manualButtonText}>Search Nearby Parkings</Text>
          )}
        </TouchableOpacity>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {parkings.map((parking, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => setSelectedParking(parking)}
          >
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{parking.name}</Text>
              <Text style={styles.cardAddress}>📍 {parking.address}</Text>
            </View>
            <Text style={styles.cardArrow}>→</Text>
          </TouchableOpacity>
        ))}
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
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
      textAlign: 'center',
      color: theme.text,
    },
    status: {
      fontSize: 16,
      marginBottom: 4,
      textAlign: 'center',
      color: theme.text,
    },
    speed: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 20,
      textAlign: 'center',
    },
    manualButton: {
      backgroundColor: '#007AFF',
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 16,
    },
    manualButtonDisabled: {
      opacity: 0.6,
    },
    manualButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
    list: {
      flex: 1,
    },
    listContent: {
      gap: 12,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardInfo: {
      flex: 1,
    },
    cardName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    cardAddress: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    cardArrow: {
      fontSize: 18,
      color: '#007AFF',
      marginLeft: 12,
    },
  });
}
