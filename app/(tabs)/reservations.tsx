import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ReservationDetail, { type Reservation } from '@/components/reservation-detail';
import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

const STATUS_DOT: Record<string, string> = {
  pending:     '#6366f1',
  in_progress: '#34c759',
  completed:   '#34c759',
  expired:     '#8E8E93',
  cancelled:   '#ff3b30',
};

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  pending:     { bg: '#eff6ff', text: '#2563eb' },
  in_progress: { bg: '#f0fdf4', text: '#15803d' },
  completed:   { bg: '#f0fdf4', text: '#15803d' },
  expired:     { bg: '#f5f5f5', text: '#6b7280' },
  cancelled:   { bg: '#fff1f0', text: '#ff3b30' },
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
  const { t } = useLocale();
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
      setError(t('reservations.couldNotLoad'));
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
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchReservations()}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchReservations({ refresh: true })}
        />
      }
    >
      <Text style={styles.heading}>{t('reservations.title')}</Text>

      {reservations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('reservations.empty')}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>{t('reservations.sectionLabel')}</Text>
          <View style={styles.groupCard}>
            {reservations.map((item, index) => {
              const colors = STATUS_BADGE_COLORS[item.status] ?? STATUS_BADGE_COLORS.expired;
              const dotColor = STATUS_DOT[item.status] ?? '#8E8E93';
              const statusLabel = t(`reservations.status.${item.status}`, { defaultValue: item.status });
              return (
                <View key={item.id}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <TouchableOpacity style={styles.row} onPress={() => setSelected(item)} activeOpacity={0.7}>
                    <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{item.parking.name}</Text>
                      <Text style={styles.rowDate}>{formatDate(item.start_time)}</Text>
                      <Text style={styles.rowPlate}>{item.vehicle.license_plate}</Text>
                    </View>
                    <View style={styles.rowRight}>
                      <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.badgeText, { color: colors.text }]}>{statusLabel}</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.pageBackground,
    },
    content: {
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.pageBackground,
    },
    heading: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 16,
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
      marginLeft: 44,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    rowInfo: {
      flex: 1,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    rowDate: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
    },
    rowPlate: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
      marginTop: 1,
    },
    rowRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    chevron: {
      fontSize: 20,
      color: theme.border,
      lineHeight: 22,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
      backgroundColor: theme.tint,
      borderRadius: 8,
    },
    retryText: {
      color: '#fff',
      fontWeight: '600',
    },
  });
}
