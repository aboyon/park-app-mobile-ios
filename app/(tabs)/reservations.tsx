import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ReservationDetail, { type Reservation } from '@/components/reservation-detail';
import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending:        { bg: '#eff6ff', text: '#2563eb', label: 'Pending' },
  in_progress:    { bg: '#f0fdf4', text: '#15803d', label: 'In progress' },
  completed:      { bg: '#f0fdf4', text: '#15803d', label: 'Completed' },
  expired:        { bg: '#f5f5f5', text: '#6b7280', label: 'Expired' },
  cancelled:      { bg: '#fff1f0', text: '#ff3b30', label: 'Cancelled' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ReservationsScreen() {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Reservation | null>(null);

  const fetchReservations = async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/my-reservations`, {
        headers: apiHeaders(token!),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setReservations(data);
    } catch {
      setError('Could not load reservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReservations();
    }, [token])
  );

  if (selected) {
    return <ReservationDetail reservation={selected} onBack={() => setSelected(null)} />;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchReservations}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Reservations</Text>

      {reservations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No reservations yet</Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchReservations({ refresh: true })}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardId}>{item.parking.name}</Text>
                <Text style={styles.cardDate}>{formatDate(item.start_time)}</Text>
                <Text style={styles.cardPlate}>{item.vehicle.license_plate}</Text>
                {(() => {
                  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.expired;
                  return (
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.pageBackground,
    },
    heading: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    list: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 12,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    cardLeft: {
      flex: 1,
    },
    cardId: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    cardDate: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
    },
    cardPlate: {
      fontSize: 13,
      color: theme.text,
      fontWeight: '500',
      marginTop: 2,
    },
    cardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      marginTop: 8,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    cardArrow: {
      fontSize: 20,
      color: theme.border,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textMuted,
    },
    errorText: {
      fontSize: 15,
      color: '#ff3b30',
      marginBottom: 16,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: '#007AFF',
      borderRadius: 8,
    },
    retryText: {
      color: '#fff',
      fontWeight: '600',
    },
  });
}
