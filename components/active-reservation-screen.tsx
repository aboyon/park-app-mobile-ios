import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { type ActiveReservation } from '@/context/me';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ActiveReservationScreen({
  reservation,
  onDismiss,
}: {
  reservation: ActiveReservation;
  onDismiss: () => Promise<void>;
}) {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [cancelling, setCancelling] = useState(false);
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const busy = cancelling || starting;

  const handleRefresh = async () => {
    setRefreshing(true);
    await onDismiss();
    setRefreshing(false);
  };

  const handleCancel = async () => {
    setCancelling(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/parking-reservations/${reservation.id}`, {
        method: 'DELETE',
        headers: apiHeaders(token!),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.message ?? 'Could not cancel reservation');
        return;
      }
      onDismiss();
    } catch {
      setError('Connection error');
    } finally {
      setCancelling(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setError('');
    try {
      const response = await fetch(
        `${API_BASE}/api/parking-reservations/${reservation.id}/start`,
        { method: 'PATCH', headers: apiHeaders(token!) },
      );
      if (!response.ok) {
        const data = await response.json();
        setError(data.message ?? 'Could not start reservation');
        return;
      }
      onDismiss();
    } catch {
      setError('Connection error');
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.heading}>Active Reservation</Text>

      <View style={styles.card}>
        <Text style={styles.parkingName}>{reservation.parking.name}</Text>
        <Text style={styles.parkingAddress}>{reservation.parking.address}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Reservation</Text>
          <Text style={styles.value}>#{reservation.id}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reserved at</Text>
          <Text style={styles.value}>{formatDate(reservation.start_time)}</Text>
        </View>
        {reservation.parking.keep_slot_open_minutes != null && (
          <View style={styles.row}>
            <Text style={styles.label}>Expires after</Text>
            <Text style={styles.value}>{reservation.parking.keep_slot_open_minutes} min</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Amount due</Text>
          <Text style={styles.value}>${reservation.amount_due}</Text>
        </View>
      </View>

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.startButton, busy && styles.buttonDisabled]}
        onPress={handleStart}
        disabled={busy}
      >
        {starting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.startButtonText}>Start Parking</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cancelButton, busy && styles.buttonDisabled]}
        onPress={handleCancel}
        disabled={busy}
      >
        {cancelling ? (
          <ActivityIndicator color="#ff3b30" />
        ) : (
          <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: theme.pageBackground,
    },
    container: {
      padding: 20,
      paddingTop: 60,
      paddingBottom: 40,
    },
    heading: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 24,
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    parkingName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    parkingAddress: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    divider: {
      height: 1,
      backgroundColor: theme.divider,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    label: {
      fontSize: 14,
      color: theme.textMuted,
    },
    value: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    error: {
      color: '#ff3b30',
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 16,
    },
    startButton: {
      backgroundColor: '#34c759',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
    },
    startButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    cancelButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ff3b30',
    },
    cancelButtonText: {
      color: '#ff3b30',
      fontSize: 16,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
}
