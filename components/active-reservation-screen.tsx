import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { API_BASE_URL, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { type ActiveReservation } from '@/context/me';
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

function formatRate(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/h`;
}

function billedSeconds(elapsed: number, minFracMin: number): number {
  const unit = minFracMin * 60;
  return Math.ceil(elapsed / unit) * unit;
}

function formatBilledTime(billedSec: number): string {
  const h = Math.floor(billedSec / 3600);
  const m = Math.floor((billedSec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function calculateCost(elapsed: number, rateCents: number, minFracMin: number = 60): string {
  return ((billedSeconds(elapsed, minFracMin) / 3600) * (rateCents / 100)).toFixed(2);
}

function calcPeriods(elapsedSec: number, periodSec: number): number {
  return Math.max(1, Math.ceil(elapsedSec / periodSec));
}

export default function ActiveReservationScreen({
  reservation,
  onDismiss,
  onBack,
}: {
  reservation: ActiveReservation;
  onDismiss: () => Promise<void>;
  onBack?: () => void;
}) {
  useKeepAwake();

  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { t } = useLocale();
  const [cancelling, setCancelling] = useState(false);
  const [starting, setStarting] = useState(false);
  const [confirmingStart, setConfirmingStart] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [qrSize, setQrSize] = useState(0);

  const isInProgress = reservation.status === 'in_progress';
  const busy = cancelling || starting;

  const keepMinutes = reservation.parking.keep_slot_open_minutes;
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    keepMinutes != null ? getRemainingSeconds(reservation.start_time, keepMinutes) : 0
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() =>
    getElapsedSeconds(reservation.start_time)
  );

  // Countdown display for pending reservations (auto-cancel is handled by the global layout)
  useEffect(() => {
    if (isInProgress || keepMinutes == null) return;
    const interval = setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(reservation.start_time, keepMinutes));
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
      const response = await fetch(`${API_BASE_URL}/api/parking-reservations/${reservation.id}`, {
        method: 'DELETE',
        headers: apiHeaders(token!),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.message ?? t('activeReservation.couldNotCancel'));
        return;
      }
      onDismiss();
    } catch {
      setError(t('common.connectionError'));
    } finally {
      setCancelling(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setError('');
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/parking-reservations/${reservation.id}/start`,
        { method: 'PATCH', headers: apiHeaders(token!) },
      );
      if (!response.ok) {
        const data = await response.json();
        setError(data.message ?? t('activeReservation.couldNotStart'));
        return;
      }
      onDismiss();
    } catch {
      setError(t('common.connectionError'));
    } finally {
      setStarting(false);
    }
  };

  const vehicleType = reservation.vehicle?.vehicle_type;
  const todayRateCents = reservation.parking.today_rate_cents ?? {};
  const vehicleRates = (vehicleType
    ? (todayRateCents[vehicleType] ?? Object.values(todayRateCents)[0])
    : Object.values(todayRateCents)[0]) ?? {};
  const serviceFeePercentage = reservation.parking.service_fee_percentage ?? 0;
  const minFracMin = reservation.parking.minimum_fractionable_minutes ?? 60;
  const rateType = reservation.rate_type_billing ?? 'hourly';
  const isFixedPeriod = rateType === 'half_day' || rateType === 'entire_day';
  const periodSeconds = rateType === 'half_day' ? 43200 : 86400;
  const hourlyEntry = vehicleRates['hourly'];
  const hourlyRateCents = (hourlyEntry?.rate ?? 0) * 100;

  const rateSummaryLabel = rateType === 'half_day'
    ? t('activeReservation.rateTypeHalfDay')
    : rateType === 'entire_day'
    ? t('activeReservation.rateTypeEntireDay')
    : t('activeReservation.hourlyRate');

  const rateSummaryValue = isFixedPeriod
    ? `$${(vehicleRates[rateType]?.rate ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
    : hourlyEntry
    ? formatRate(hourlyRateCents)
    : `$ ${reservation.amount_due}`;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.heading}>
        {isInProgress ? t('activeReservation.parkedAt') : t('activeReservation.reservedAt')}
      </Text>

      <View style={styles.card}>
        <Text style={styles.parkingName}>{reservation.parking.name}</Text>
        <Text style={styles.parkingAddress}>{reservation.parking.address}</Text>

        <View
          style={styles.qrContainer}
          onLayout={(e) => setQrSize(e.nativeEvent.layout.width)}
        >
          {qrSize > 0 && (
            <QRCode
              value={reservation.id}
              size={qrSize}
              backgroundColor="#ffffff"
              color="#000000"
            />
          )}
        </View>
        <Text style={styles.qrHint}>{t('activeReservation.qrHint')}</Text>

        <View style={styles.divider} />
        {reservation.parking.parking_method && (
          <View style={styles.row}>
            <Text style={styles.value}>{t(`parkingDetail.parkingMethod_${reservation.parking.parking_method}`)}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>{t('activeReservation.reservedAtLabel')}</Text>
          <Text style={styles.value}>{formatDate(reservation.start_time)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{rateSummaryLabel}</Text>
          <Text style={[styles.value, styles.costValue]}>{rateSummaryValue}</Text>
        </View>
        <View style={styles.vehicleLicencePlate}>
          <Text style={styles.licensePlate}>{reservation.vehicle?.license_plate}</Text>
        </View>
      </View>

      {(reservation.parking.parking_method === 'parking_attendance' || reservation.parking.parking_method === 'both') && (
        <View style={styles.keyNoteCard}>
          <View style={styles.keyNoteAccent} />
          <View style={styles.keyNoteBody}>
            <Text style={styles.keyNoteText}>{t('parkingDetail.keyNote')}</Text>
          </View>
        </View>
      )}

      {isInProgress ? (
        <>
          <View style={styles.card}>
            <View style={styles.elapsed}>
              <Text style={styles.elapsedTimer}>{formatElapsed(elapsedSeconds)}</Text>
              <Text style={styles.elapsedLabel}>{t('activeReservation.parkingDuration')}</Text>
            </View>
            <View style={styles.divider} />

            {isFixedPeriod ? (
              /* Half-day / entire-day billing */
              (() => {
                const periodRate = vehicleRates[rateType]?.rate ?? 0;
                const periods = calcPeriods(elapsedSeconds, periodSeconds);
                const totalCost = periods * periodRate;
                const rateLabel = rateType === 'half_day'
                  ? t('activeReservation.rateTypeHalfDay')
                  : t('activeReservation.rateTypeEntireDay');
                return (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>{t('activeReservation.rate')}</Text>
                      <Text style={styles.value}>{rateLabel}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>{t('activeReservation.periods')}</Text>
                      <Text style={styles.value}>{periods} × ${periodRate.toLocaleString('es-AR', { minimumFractionDigits: 0 })}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>{t('activeReservation.totalCost')}</Text>
                      <Text style={[styles.value, styles.costValue]}>${totalCost.toLocaleString('es-AR', { minimumFractionDigits: 0 })}</Text>
                    </View>
                  </>
                );
              })()
            ) : hourlyEntry ? (
              /* Hourly billing */
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>{t('activeReservation.rate')}{vehicleType ? ` · ${vehicleType}` : ''}</Text>
                  <Text style={styles.value}>{formatRate(hourlyRateCents)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>{t('activeReservation.billedTime')}</Text>
                  <Text style={styles.value}>{formatBilledTime(billedSeconds(elapsedSeconds, minFracMin))}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>{t('activeReservation.totalCost')}</Text>
                  <Text style={[styles.value, styles.costValue]}>
                    ${calculateCost(elapsedSeconds, hourlyRateCents, minFracMin)}
                  </Text>
                </View>
                {serviceFeePercentage > 0 && (
                  <View style={styles.row}>
                    <Text style={styles.label}>
                      {t('activeReservation.serviceFee', { percentage: Math.round(serviceFeePercentage * 100) })}
                    </Text>
                    <Text style={[styles.value, styles.costValue]}>
                      ${(parseFloat(calculateCost(elapsedSeconds, hourlyRateCents, minFracMin)) * serviceFeePercentage).toFixed(2)}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noRate}>{t('activeReservation.noRateAvailable')}</Text>
            )}
          </View>

          {/* Renewal notice for fixed-period stays */}
          {isFixedPeriod && calcPeriods(elapsedSeconds, periodSeconds) > 1 && (
            <View style={styles.renewalNoticeCard}>
              <View style={styles.renewalNoticeAccent} />
              <View style={styles.renewalNoticeBody}>
                <Text style={styles.renewalNoticeText}>
                  {t('activeReservation.renewalNotice', {
                    rateType: rateType === 'half_day'
                      ? t('activeReservation.rateTypeHalfDay')
                      : t('activeReservation.rateTypeEntireDay'),
                  })}
                </Text>
              </View>
            </View>
          )}
        </>
      ) : (
        <>
          {keepMinutes != null && (
            <View style={styles.countdownCard}>
              <View style={styles.countdownAccent} />
              <View style={styles.countdownBody}>
                <Text style={styles.countdownTimer}>{formatCountdown(remainingSeconds)}</Text>
                <Text style={styles.countdownLabel}>{t('activeReservation.toArrive')}</Text>
              </View>
            </View>
          )}
          {isFixedPeriod ? (
            <View style={styles.card}>
              {(() => {
                const periodRate = vehicleRates[rateType]?.rate ?? 0;
                const fixedRateLabel = rateType === 'half_day'
                  ? t('activeReservation.rateTypeHalfDay')
                  : t('activeReservation.rateTypeEntireDay');
                return (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>{t('activeReservation.rate')}</Text>
                      <Text style={styles.value}>{fixedRateLabel}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>{t('activeReservation.billedTime')}</Text>
                      <Text style={styles.value}>{rateType === 'half_day' ? '12h' : '24h'}</Text>
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.label}>{t('activeReservation.totalCost')}</Text>
                      <Text style={[styles.value, styles.costValue]}>
                        ${periodRate.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                      </Text>
                    </View>
                    {serviceFeePercentage > 0 && (
                      <View style={styles.row}>
                        <Text style={styles.label}>
                          {t('activeReservation.serviceFee', { percentage: Math.round(serviceFeePercentage * 100) })}
                        </Text>
                        <Text style={[styles.value, styles.costValue]}>
                          ${(periodRate * serviceFeePercentage).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          ) : hourlyEntry ? (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>{t('activeReservation.rate')}{vehicleType ? ` · ${vehicleType}` : ''}</Text>
                <Text style={styles.value}>{formatRate(hourlyRateCents)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>{t('activeReservation.billedTime')}</Text>
                <Text style={styles.value}>1h</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>{t('activeReservation.firstHourEstimate')}</Text>
                <Text style={[styles.value, styles.costValue]}>
                  ${calculateCost(3600, hourlyRateCents, 60)}
                </Text>
              </View>
              {serviceFeePercentage > 0 && (
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {t('activeReservation.serviceFee', { percentage: Math.round(serviceFeePercentage * 100) })}
                  </Text>
                  <Text style={[styles.value, styles.costValue]}>
                    ${(parseFloat(calculateCost(3600, hourlyRateCents, 60)) * serviceFeePercentage).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          ) : null}
          {reservation.parking.rate_policy_strategy === 'flexible' && (
            <View style={styles.flexibleNoticeCard}>
              <View style={styles.flexibleNoticeAccent} />
              <View style={styles.flexibleNoticeBody}>
                <Text style={styles.flexibleNoticeText}>{t('activeReservation.flexibleNotice')}</Text>
              </View>
            </View>
          )}
        </>
      )}

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      {!isInProgress && (
        <>
          <TouchableOpacity
            style={[styles.cancelButton, busy && styles.buttonDisabled]}
            onPress={handleCancel}
            disabled={busy}
          >
            {cancelling ? (
              <ActivityIndicator color="#ff3b30" />
            ) : (
              <Text style={styles.cancelButtonText}>{t('activeReservation.cancelReservation')}</Text>
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
      paddingHorizontal: 8,
      paddingTop: 20,
      paddingBottom: 40,
    },
    backButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    backText: {
      fontSize: 16,
      color: theme.tint,
      fontWeight: '500',
    },
    heading: {
      fontSize: 25,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    qrContainer: {
      width: '100%',
      backgroundColor: '#ffffff',
      borderRadius: 8,
      marginTop: 16,
      overflow: 'hidden',
    },
    qrHint: {
      fontSize: 12,
      color: '#8E8E93',
      marginTop: 10,
      marginBottom: 16,
      textAlign: 'center',
      letterSpacing: 0.3,
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
    vehicleLicencePlate: {
      alignItems: 'center',
      paddingVertical: 12,
      marginBottom: 4,
    },
    elapsedTimer: {
      fontSize: 40,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    licensePlate: {
      fontSize: 26,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
      backgroundColor: theme.pageBackground,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
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
      color: theme.tint,
    },
    keyNoteCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 16,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    keyNoteAccent: {
      width: 10,
      backgroundColor: theme.amber,
    },
    keyNoteBody: {
      flex: 1,
      padding: 14,
    },
    keyNoteText: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 18,
    },
    noRate: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      paddingVertical: 8,
    },
    flexibleNoticeCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 16,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    flexibleNoticeAccent: {
      width: 10,
      backgroundColor: theme.tint,
    },
    flexibleNoticeBody: {
      flex: 1,
      padding: 14,
    },
    flexibleNoticeText: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 18,
    },
    renewalNoticeCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 16,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    renewalNoticeAccent: {
      width: 10,
      backgroundColor: theme.amber ?? '#f5a623',
    },
    renewalNoticeBody: {
      flex: 1,
      padding: 14,
    },
    renewalNoticeText: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 18,
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
      width: 10,
      backgroundColor: theme.tint,
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
      color: theme.tint,
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
      backgroundColor: theme.tint,
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
