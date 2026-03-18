import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { type ActiveReservation, type Rate } from '@/context/me';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

function getRemainingSeconds(startTime: string, keepMinutes: number): number {
  const expiresAt = new Date(startTime).getTime() + keepMinutes * 60 * 1000;
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    timeStyle: 'short',
  });
}

function getElapsedSeconds(startTime: string): number {
  return Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function getCurrentRate(rates: Rate[]): Rate | null {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return rates.find((rate) => {
    if (rate.day_of_week !== todayName) return false;
    const startMinutes =
      parseInt(rate.start_time.slice(11, 13), 10) * 60 + parseInt(rate.start_time.slice(14, 16), 10);
    const endMinutes =
      parseInt(rate.end_time.slice(11, 13), 10) * 60 + parseInt(rate.end_time.slice(14, 16), 10);
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }) ?? null;
}

function formatRate(cents: number): string {
  return `€${(cents / 100).toFixed(2)}/h`;
}

function calculateCost(elapsedSeconds: number, ratePerHour: number): string {
  const cost = (elapsedSeconds / 3600) * (ratePerHour / 100);
  return `€${cost.toFixed(2)}`;
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
  const [confirmingStart, setConfirmingStart] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isInProgress = reservation.status === 'in_progress';
  const busy = cancelling || starting;

  const keepMinutes = reservation.parking.keep_slot_open_minutes;
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    keepMinutes != null ? getRemainingSeconds(reservation.start_time, keepMinutes) : 0
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() =>
    getElapsedSeconds(reservation.start_time)
  );

  // Countdown for pending reservations
  useEffect(() => {
    if (isInProgress || keepMinutes == null) return;

    const autoCancel = () => {
      fetch(`${API_BASE}/api/parking-reservations/${reservation.id}?expired_by_app=true`, {
        method: 'DELETE',
        headers: apiHeaders(token!),
      })
        .then(() => onDismiss())
        .catch(() => {});
    };

    if (getRemainingSeconds(reservation.start_time, keepMinutes) === 0) {
      autoCancel();
      return;
    }

    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(reservation.start_time, keepMinutes);
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        autoCancel();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservation.start_time, keepMinutes, isInProgress]);

  // Elapsed timer for in_progress reservations
  useEffect(() => {
    if (!isInProgress) return;
    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds(reservation.start_time));
    }, 1000);
    return () => clearInterval(interval);
  }, [reservation.start_time, isInProgress]);

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

  const rates = reservation.parking.rates ?? [];
  const currentRate = getCurrentRate(rates);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.heading}>You're parked at</Text>

      <View style={styles.card}>
        <Text style={styles.parkingName}>{reservation.parking.name}</Text>
        <Text style={styles.parkingAddress}>{reservation.parking.address}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Reserved at</Text>
          <Text style={styles.value}>{formatDate(reservation.start_time)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount due</Text>
          <Text style={[styles.value, styles.costValue]}>$ {reservation.amount_due}</Text>
        </View>
      </View>

      {isInProgress ? (
        <View style={styles.card}>
          <View style={styles.elapsed}>
            <Text style={styles.elapsedTimer}>{formatElapsed(elapsedSeconds)}</Text>
            <Text style={styles.elapsedLabel}>Parking duration</Text>
          </View>
          <View style={styles.divider} />
          {currentRate ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Current rate</Text>
                <Text style={styles.value}>{formatRate(currentRate.rate_per_hour)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Estimated cost</Text>
                <Text style={[styles.value, styles.costValue]}>
                  {calculateCost(elapsedSeconds, currentRate.rate_per_hour)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.noRate}>No rate available for the current time</Text>
          )}
        </View>
      ) : (
        keepMinutes != null && (
          <View style={styles.countdownCard}>
            <View style={styles.countdownAccent} />
            <View style={styles.countdownBody}>
              <Text style={styles.countdownTimer}>{formatCountdown(remainingSeconds)}</Text>
              <Text style={styles.countdownLabel}>to arrive — reservation cancels after this</Text>
            </View>
          </View>
        )
      )}

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      {!isInProgress && (
        <>
          {confirmingStart ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                Your parking session will start immediately and charges will begin now. Are you ready to proceed?
              </Text>
              <TouchableOpacity
                style={[styles.startButton, starting && styles.buttonDisabled]}
                onPress={handleStart}
                disabled={starting}
              >
                {starting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.startButtonText}>Yes, start parking</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.notYetButton}
                onPress={() => setConfirmingStart(false)}
                disabled={starting}
              >
                <Text style={styles.notYetText}>Not yet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.startButton, busy && styles.buttonDisabled]}
              onPress={() => setConfirmingStart(true)}
              disabled={busy}
            >
              <Text style={styles.startButtonText}>Start Parking</Text>
            </TouchableOpacity>
          )}

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
        </>
      )}
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
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 40,
    },
    heading: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
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
      height: StyleSheet.hairlineWidth,
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
    elapsed: {
      alignItems: 'center',
      paddingVertical: 12,
      marginBottom: 4,
    },
    elapsedTimer: {
      fontSize: 48,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    elapsedLabel: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 4,
    },
    costValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#6366f1',
    },
    noRate: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      paddingVertical: 8,
    },
    countdownCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 16,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    countdownAccent: {
      width: 4,
      backgroundColor: '#f59e0b',
    },
    countdownBody: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 16,
    },
    countdownTimer: {
      fontSize: 52,
      fontWeight: 'bold',
      color: '#f59e0b',
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    countdownLabel: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 6,
    },
    error: {
      color: '#ff3b30',
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 16,
    },
    startButton: {
      backgroundColor: '#6366f1',
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
    confirmBox: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#6366f1',
    },
    confirmText: {
      fontSize: 14,
      color: theme.text,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 20,
    },
    notYetButton: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    notYetText: {
      fontSize: 15,
      color: theme.textSecondary,
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
