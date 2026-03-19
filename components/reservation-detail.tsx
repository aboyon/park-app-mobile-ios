import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

export type Payment = {
  id: number;
  amount_cents: number;
  amount_currency: string;
  status: string;
  product: string;
  line_item_description: string;
  payment_method_description: string;
  created_at: string;
};

export type Reservation = {
  id: number;
  start_time: string;
  end_time: string | null;
  status: string;
  parking: {
    name: string;
    address: string;
  };
  vehicle: {
    license_plate: string;
  };
  payments: Payment[];
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#eff6ff', text: '#2563eb' },
  active:    { bg: '#f0fdf4', text: '#15803d' },
  expired:   { bg: '#f5f5f5', text: '#999' },
  cancelled: { bg: '#fff1f0', text: '#ff3b30' },
};

const PAYMENT_STATUS_ICONS: Record<string, { bg: string; text: string; icon: string }> = {
  completed: { bg: '#f0fdf4', text: '#15803d', icon: '✅' },
  pending:   { bg: '#fffbeb', text: '#d97706', icon: '⏳' },
  failed:    { bg: '#fff1f0', text: '#ff3b30', icon: '❌' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatAmount(cents: number, currency: string) {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency,
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

function PaymentDetailModal({
  payment,
  onClose,
  theme,
}: {
  payment: Payment;
  onClose: () => void;
  theme: AppTheme;
}) {
  const styles = makeStyles(theme);
  const { t } = useLocale();
  const ps = PAYMENT_STATUS_ICONS[payment.status] ?? PAYMENT_STATUS_ICONS.pending;
  const statusLabel = t(`reservationDetail.paymentStatus.${payment.status}`, {
    defaultValue: payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
  });

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* drag handle */}
        <View style={styles.sheetHandle} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* hero section */}
          <View style={styles.sheetHero}>
            <Text style={styles.sheetStatusIcon}>{ps.icon}</Text>
            <Text style={styles.sheetAmount}>
              {formatAmount(payment.amount_cents, payment.amount_currency)}
            </Text>
            <View style={[styles.sheetBadge, { backgroundColor: ps.bg }]}>
              <Text style={[styles.sheetBadgeText, { color: ps.text }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.sheetDivider} />

          {/* detail rows */}
          <View style={styles.sheetSection}>
            <View style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>{t('reservationDetail.product')}</Text>
              <Text style={styles.sheetValue}>{payment.product}</Text>
            </View>
            <View style={styles.sheetRowDivider} />
            <View style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>{t('reservationDetail.paymentMethod')}</Text>
              <Text style={styles.sheetValue}>{payment.payment_method_description}</Text>
            </View>
            <View style={styles.sheetRowDivider} />
            <View style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>{t('reservationDetail.date')}</Text>
              <Text style={styles.sheetValue}>{formatDate(payment.created_at)}</Text>
            </View>
            <View style={styles.sheetRowDivider} />
            <View style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>{t('reservationDetail.reference')}</Text>
              <Text style={styles.sheetValue}>#{payment.id}</Text>
            </View>
          </View>

          <View style={styles.sheetDescriptionBlock}>
            <Text style={styles.sheetDescriptionLabel}>{t('reservationDetail.description')}</Text>
            <Text style={styles.sheetDescriptionText}>{payment.line_item_description}</Text>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.sheetCloseButton} onPress={onClose}>
          <Text style={styles.sheetCloseText}>{t('common.close')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function ReservationDetail({
  reservation,
  onBack,
  onCancel,
}: {
  reservation: Reservation;
  onBack: () => void;
  onCancel?: () => void;
}) {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { t } = useLocale();
  const statusStyle = STATUS_COLORS[reservation.status] ?? STATUS_COLORS.expired;
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const statusLabel = t(`reservations.status.${reservation.status}`, {
    defaultValue: reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1),
  });

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      const response = await fetch(`${API_BASE}/api/parking-reservations/${reservation.id}`, {
        method: 'DELETE',
        headers: apiHeaders(token!),
      });
      if (!response.ok) {
        const data = await response.json();
        setCancelError(data.message ?? t('reservationDetail.couldNotCancel'));
        return;
      }
      onCancel?.();
    } catch {
      setCancelError(t('common.connectionError'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.card}>
            <Text style={styles.parkingName}>{reservation.parking.name}</Text>
            <Text style={styles.parkingAddress}>{reservation.parking.address}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>{t('reservationDetail.vehicle')}</Text>
          <Text style={styles.value}>{reservation.vehicle.license_plate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('reservationDetail.started')}</Text>
          <Text style={styles.value}>{formatDate(reservation.start_time)}</Text>
        </View>

        {reservation.end_time && (
          <View style={styles.row}>
            <Text style={styles.label}>{t('reservationDetail.ended')}</Text>
            <Text style={styles.value}>{formatDate(reservation.end_time)}</Text>
          </View>
        )}

        {reservation.end_time && (
          <View style={styles.row}>
            <Text style={styles.label}>{t('reservationDetail.duration')}</Text>
            <Text style={styles.value}>
              {duration(reservation.start_time, reservation.end_time)}
            </Text>
          </View>
        )}
      </View>

      {reservation.payments?.length > 0 && (
        <View style={styles.paymentsCard}>
          <Text style={styles.paymentsTitle}>{t('reservationDetail.payments')}</Text>
          {reservation.payments.map((p, index) => {
            const ps = PAYMENT_STATUS_ICONS[p.status] ?? PAYMENT_STATUS_ICONS.pending;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.paymentItem,
                  index > 0 && styles.paymentItemBorder,
                ]}
                onPress={() => setSelectedPayment(p)}
                activeOpacity={0.7}
              >
                <View style={[styles.paymentIconWrap, { backgroundColor: ps.bg }]}>
                  <Text style={styles.paymentIcon}>{ps.icon}</Text>
                </View>
                <View style={styles.paymentItemInfo}>
                  <Text style={styles.paymentItemProduct} numberOfLines={1}>{p.product}</Text>
                  <Text style={styles.paymentItemMethod} numberOfLines={1}>{p.payment_method_description}</Text>
                  <Text style={styles.paymentItemDate}>{formatDate(p.created_at)}</Text>
                </View>
                <View style={styles.paymentItemRight}>
                  <Text style={[styles.paymentItemAmount, { color: ps.text }]}>
                    {formatAmount(p.amount_cents, p.amount_currency)}
                  </Text>
                  <Text style={styles.paymentChevron}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {reservation.status === 'pending' && onCancel && (
        <>
          {cancelError !== '' && <Text style={styles.cancelError}>{cancelError}</Text>}
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#ff3b30" />
            ) : (
              <Text style={styles.cancelButtonText}>{t('reservationDetail.cancelReservation')}</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          theme={theme}
        />
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.pageBackground,
    },
    container: {
      flex: 1,
      backgroundColor: theme.pageBackground,
    },
    content: {
      padding: 20,
      paddingTop: 60,
      paddingBottom: 40,
    },
    backButton: { marginBottom: 20 },
    backText: { fontSize: 16, color: '#6366f1' },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    headerRow: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 13, fontWeight: '600' },
    divider: { height: 1, backgroundColor: theme.divider, marginBottom: 12 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    parkingName: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
    parkingAddress: { fontSize: 14, color: theme.textSecondary, marginBottom: 16 },
    label: { fontSize: 14, color: theme.textMuted },
    value: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      flexShrink: 1,
      textAlign: 'right',
      marginLeft: 16,
    },
    cancelButton: {
      marginTop: 24,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ff3b30',
    },
    cancelButtonDisabled: { opacity: 0.5 },
    cancelButtonText: { color: '#ff3b30', fontSize: 16, fontWeight: '600' },
    cancelError: { color: '#ff3b30', fontSize: 14, textAlign: 'center', marginTop: 16 },

    // payments list
    paymentsCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginTop: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    paymentsTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.5,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
    },
    paymentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    paymentItemBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.divider,
    },
    paymentIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    paymentIcon: { fontSize: 18 },
    paymentItemInfo: { flex: 1 },
    paymentItemProduct: { fontSize: 14, fontWeight: '600', color: theme.text },
    paymentItemMethod: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    paymentItemDate: { fontSize: 12, color: theme.textMuted, marginTop: 1 },
    paymentItemRight: { alignItems: 'flex-end', gap: 2 },
    paymentItemAmount: { fontSize: 15, fontWeight: '700' },
    paymentChevron: { fontSize: 20, color: theme.textMuted, lineHeight: 22 },

    // modal sheet
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 36,
      paddingHorizontal: 20,
      maxHeight: '85%',
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.divider,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 8,
    },
    sheetHero: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    sheetStatusIcon: { fontSize: 48 },
    sheetAmount: {
      fontSize: 34,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: -0.5,
    },
    sheetBadge: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 20,
    },
    sheetBadgeText: { fontSize: 13, fontWeight: '700' },
    sheetDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.divider, marginBottom: 16 },
    sheetSection: {
      backgroundColor: theme.pageBackground,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
    },
    sheetRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 13,
      gap: 16,
    },
    sheetRowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.divider,
      marginLeft: 16,
    },
    sheetLabel: { fontSize: 14, color: theme.textMuted, flexShrink: 0 },
    sheetValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      flex: 1,
      textAlign: 'right',
    },
    sheetDescriptionBlock: {
      backgroundColor: theme.pageBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    sheetDescriptionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    sheetDescriptionText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 21,
    },
    sheetCloseButton: {
      backgroundColor: theme.pageBackground,
      borderRadius: 12,
      padding: 15,
      alignItems: 'center',
      marginTop: 4,
    },
    sheetCloseText: { fontSize: 16, fontWeight: '600', color: theme.text },
  });
}
