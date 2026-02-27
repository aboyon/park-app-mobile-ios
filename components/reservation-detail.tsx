import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

export type Reservation = {
  id: number;
  start_time: string;
  end_time: string | null;
  status: string;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:    { bg: '#f0fdf4', text: '#15803d' },
  expired:   { bg: '#f5f5f5', text: '#999' },
  cancelled: { bg: '#fff1f0', text: '#ff3b30' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function duration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function ReservationDetail({
  reservation,
  onBack,
}: {
  reservation: Reservation;
  onBack: () => void;
}) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const statusStyle = STATUS_COLORS[reservation.status] ?? STATUS_COLORS.expired;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Reservation #{reservation.id}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Started</Text>
          <Text style={styles.value}>{formatDate(reservation.start_time)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Ended</Text>
          <Text style={styles.value}>
            {reservation.end_time ? formatDate(reservation.end_time) : '—'}
          </Text>
        </View>

        {reservation.end_time && (
          <View style={styles.row}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>
              {duration(reservation.start_time, reservation.end_time)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.pageBackground,
      padding: 20,
      paddingTop: 60,
    },
    backButton: {
      marginBottom: 20,
    },
    backText: {
      fontSize: 16,
      color: '#007AFF',
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    badgeText: {
      fontSize: 13,
      fontWeight: '600',
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
      flexShrink: 1,
      textAlign: 'right',
      marginLeft: 16,
    },
  });
}
