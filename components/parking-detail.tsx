import { useRouter } from 'expo-router';
import { Bike, CalendarDays, Car, Check, Clock, CreditCard, Sunrise, Truck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ParkingMap } from '@/components/parking-map';

import { API_BASE_URL, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useMe } from '@/context/me';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

type Vehicle = {
  id: string;
  license_plate: string;
  vehicle_type: 'car' | 'truck' | 'motorcycle' | 'suv' | 'pickup';
  is_default: boolean;
};

type RateEntry = {
  rate: number;
  rate_type: 'hourly' | 'half_day' | 'entire_day';
  wday: number;
};

type PenalizationRate = {
  rate_per_hour: number;
  rate_per_hour_cents: number;
  wday: number;
};

type ParkingMethod = 'self' | 'parking_attendance' | 'both';

type Parking = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  available_slots: number;
  available?: boolean;
  keep_slot_open_minutes: number;
  rate_policy_strategy: string;
  lock_slot_charge_policy?: string;
  phone?: string;
  parking_method?: ParkingMethod;
  today_rate_cents: Record<string, Record<string, RateEntry>>;
  today_penalization_rates_cents: Record<string, PenalizationRate>;
  service_fee_percentage?: number;
  minimum_fractionable_minutes?: number;
  active_subscription?: { id?: string };
};

type RateBillingType = 'hourly' | 'half_day' | 'entire_day';

type LucideIcon = typeof Car;
const RATE_TYPE_ORDER: RateBillingType[] = ['hourly', 'half_day', 'entire_day'];
const RATE_ICONS: Record<RateBillingType, LucideIcon> = {
  hourly: Clock,
  half_day: Sunrise,
  entire_day: CalendarDays,
};

type UserLocation = { latitude: number; longitude: number };

export default function ParkingDetail({
  parking,
  onBack,
  userLocation,
}: {
  parking: Parking;
  onBack: () => void;
  userLocation?: UserLocation;
}) {
  const { token } = useAuth();
  const { refresh } = useMe();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { t } = useLocale();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [noPaymentMethod, setNoPaymentMethod] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [reservationError, setReservationError] = useState('');
  const [pendingRateBillingType, setPendingRateBillingType] = useState<RateBillingType | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/my-vehicles`, { headers: apiHeaders(token!) })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((data: Vehicle[]) => {
        if (cancelled) return;
        setVehicles(data);
        const defaultV = data.find(v => v.is_default);
        setSelectedVehicleId(defaultV?.id ?? data[0]?.id ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setVehiclesError(t('parkingDetail.couldNotLoadData'));
      })
      .finally(() => {
        if (cancelled) return;
        setVehiclesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const openMaps = () => {
    const url = `maps://app?daddr=${parking.latitude},${parking.longitude}`;
    Linking.openURL(url);
  };

  const handleRateCTA = async (rateBillingType: RateBillingType) => {
    if (reserving) return;
    setPendingRateBillingType(rateBillingType);
    setReservationError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/payment-methods`, { headers: apiHeaders(token!) });
      const data: unknown[] = res.ok ? await res.json() : [];
      if (data.length === 0) {
        setNoPaymentMethod(true);
        return;
      }
    } catch {
      setReservationError(t('common.connectionError'));
      return;
    }

    setNoPaymentMethod(false);

    if (vehicles.length <= 1) {
      const vehicleId = vehicles[0]?.id;
      if (vehicleId) await handleReserve(rateBillingType, vehicleId);
    } else {
      setShowVehiclePicker(true);
    }
  };

  const handleReserve = async (rateBillingType: RateBillingType, vehicleId: string) => {
    setReserving(true);
    setReservationError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/parking-reservations`, {
        method: 'POST',
        headers: apiHeaders(token!),
        body: JSON.stringify({
          reservation: {
            parking_id: parking.id,
            vehicle_id: vehicleId,
            rate_type_billing: rateBillingType,
            ...(userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : {}),
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setReservationError(data.message ?? t('parkingDetail.couldNotReserve'));
        return;
      }

      setShowVehiclePicker(false);
      setPendingRateBillingType(null);
      await refresh();
    } catch {
      setReservationError(t('common.connectionError'));
    } finally {
      setReserving(false);
    }
  };

  const receivingVehicles = parking.available_slots <= 0 && parking.available === true;
  const noSlotsAvailable = parking.available_slots <= 0 && !receivingVehicles;
  const needsKey = parking.parking_method === 'parking_attendance' || parking.parking_method === 'both';
  const hasSubscription = !!parking.active_subscription?.id;
  const ctaDisabled = noSlotsAvailable || reserving;

  const vehicleRateMap = parking.today_rate_cents ?? {};
  const allVehicleRates = Object.values(vehicleRateMap);
  const noRatesToday = allVehicleRates.length === 0;

  const getDisplayPrice = (rateType: RateBillingType): string => {
    const primary = vehicles.find(v => v.is_default) ?? vehicles[0];
    const entry = primary
      ? (vehicleRateMap[primary.vehicle_type]?.[rateType] ?? allVehicleRates.find(vr => vr[rateType] != null)?.[rateType])
      : allVehicleRates.find(vr => vr[rateType] != null)?.[rateType];
    if (!entry) return '';
    const amount = entry.rate.toLocaleString('es-AR', { minimumFractionDigits: 0 });
    return rateType === 'hourly' ? `$${amount}/h` : `$${amount}`;
  };

  const availableRates: { type: RateBillingType; price: string }[] = RATE_TYPE_ORDER
    .filter(rt => allVehicleRates.some(vr => vr[rt] != null))
    .map(type => ({ type, price: getDisplayPrice(type) }));

  const rateLabel: Record<RateBillingType, string> = {
    hourly: t('parkingDetail.rateTypeHourly'),
    half_day: t('parkingDetail.rateTypeHalfDay'),
    entire_day: t('parkingDetail.rateTypeEntireDay'),
  };

  if (!hasSubscription) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.name}>{parking.name}</Text>
          <Text style={styles.address}>{parking.address}</Text>
          <Text style={styles.distance}>
            {t('common.kmAway', { distance: (parking.distance / 1000).toFixed(1) })}
          </Text>
        </View>

        <View style={styles.noSubscriptionCard}>
          <View style={styles.noSubscriptionAccent} />
          <View style={styles.noSubscriptionBody}>
            <Text style={styles.noSubscriptionTitle}>{t('parkingDetail.noSubscriptionTitle')}</Text>
            <Text style={styles.noSubscriptionMessage}>{t('parkingDetail.noSubscriptionMessage')}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.mapsButton} onPress={openMaps}>
          <Text style={styles.mapsButtonText}>{t('parkingDetail.openMaps')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.mapHeader}>
        <ParkingMap parking={parking} userLocation={userLocation} theme={theme} />
        <TouchableOpacity style={styles.backButtonOverlay} onPress={onBack}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentPadded}>
        <View style={styles.card}>
          <Text style={styles.name}>{parking.name}</Text>
          <Text style={styles.address}>{parking.address}</Text>
          <Text style={styles.distance}>
            {t('common.kmAway', { distance: (parking.distance / 1000).toFixed(1) })}
          </Text>

          <View style={styles.divider} />

          {receivingVehicles ? (
            <Text style={styles.receivingVehicles}>{t('parkingDetail.receivingVehicles')}</Text>
          ) : (
            <View style={styles.row}>
              <Text style={styles.metaLabel}>{t('parkingDetail.availableSlots')}</Text>
              <Text style={[styles.metaValue, noSlotsAvailable && styles.noSlots]}>
                {parking.available_slots}
              </Text>
            </View>
          )}
          {parking.parking_method && (
            <View style={styles.row}>
              <Text style={styles.metaValue}>{t(`parkingDetail.parkingMethod_${parking.parking_method}`)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.metaLabel}>{t('parkingDetail.reservationExpires')}</Text>
            <Text style={styles.metaValue}>{parking.keep_slot_open_minutes} {t('parkingDetail.min')}</Text>
          </View>
        </View>

        {needsKey && (
          <View style={styles.keyNoteCard}>
            <View style={styles.keyNoteAccent} />
            <View style={styles.keyNoteBody}>
              <Text style={styles.keyNoteText}>{t('parkingDetail.keyNote')}</Text>
            </View>
          </View>
        )}

        {noRatesToday ? (
          <View style={styles.closedCard}>
            <View style={styles.closedAccent} />
            <View style={styles.closedBody}>
              <Text style={styles.closedTitle}>{t('parkingDetail.closedTitle')}</Text>
              <Text style={styles.closedMessage}>{t('parkingDetail.closedMessage')}</Text>
              {parking.phone ? (
                <>
                  <Text style={styles.closedMessage}>{t('parkingDetail.closedMessagePhone')}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${parking.phone}`)}>
                    <Text style={styles.closedPhone}>{parking.phone}</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('parkingDetail.todayRates')}</Text>

            {vehiclesLoading ? (
              <ActivityIndicator color={theme.tint} style={styles.vehiclesLoader} />
            ) : vehiclesError !== '' ? (
              <Text style={styles.errorText}>{vehiclesError}</Text>
            ) : vehicles.length === 0 ? (
              <Text style={styles.vehiclesEmpty}>{t('parkingDetail.noVehicles')}</Text>
            ) : (
              <View style={styles.rateTypeGroup}>
                {availableRates.map(({ type, price }) => {
                  const RateIcon = RATE_ICONS[type];
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.rateTypeButton, ctaDisabled && styles.rateTypeButtonDisabled]}
                      onPress={() => handleRateCTA(type)}
                      disabled={ctaDisabled}
                      activeOpacity={0.75}
                    >
                      <View style={styles.rateTypeLeft}>
                        <RateIcon color="#fff" size={18} style={styles.rateTypeIcon} />
                        <Text style={styles.rateTypeLabel}>{rateLabel[type]}</Text>
                      </View>
                      <Text style={styles.rateTypePrice}>{price}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {parking.service_fee_percentage != null && parking.service_fee_percentage > 0 && (
              <Text style={styles.serviceFeeNotice}>
                {t('parkingDetail.serviceFeeNotice', {
                  percentage: Math.round(parking.service_fee_percentage * 100),
                })}
              </Text>
            )}
          </View>
        )}

        {parking.rate_policy_strategy === 'strict' &&
          Object.keys(parking.today_penalization_rates_cents ?? {}).length > 0 && (
            <View style={styles.warningCard}>
              <View style={styles.warningAccent} />
              <View style={styles.warningBody}>
                <Text style={styles.warningTitle}>
                  {t('parkingDetail.warningCharges', { minutes: parking.keep_slot_open_minutes })}
                </Text>
                {parking.lock_slot_charge_policy === 'flat_rate' ? (
                  <Text style={styles.warningRate}>
                    {`$${(Object.values(parking.today_penalization_rates_cents)[0].rate_per_hour_cents / 100).toFixed(2)}/h`}
                  </Text>
                ) : (
                  Object.entries(parking.today_penalization_rates_cents).map(([type, rate]) => (
                    <View key={type} style={styles.rateRow}>
                      <Text style={styles.warningVehicle}>
                        {t(`vehicles.types.${type}`, { defaultValue: type.charAt(0).toUpperCase() + type.slice(1) })}
                      </Text>
                      <Text style={styles.warningRate}>
                        {`$${(rate.rate_per_hour_cents / 100).toFixed(2)}/h`}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

        {reservationError !== '' && (
          <Text style={styles.errorText}>{reservationError}</Text>
        )}

        {noPaymentMethod && (
          <View style={styles.vehiclePicker}>
            <View style={styles.noPaymentCard}>
              <CreditCard color={theme.tint} size={48} style={styles.noPaymentIcon} />
              <Text style={styles.noPaymentTitle}>{t('parkingDetail.noPaymentTitle')}</Text>
              <Text style={styles.noPaymentMessage}>{t('parkingDetail.noPaymentMessage')}</Text>
              <TouchableOpacity
                style={styles.addPaymentButton}
                onPress={() => { setNoPaymentMethod(false); router.navigate('/(tabs)/payments'); }}
              >
                <Text style={styles.addPaymentButtonText}>{t('parkingDetail.addPaymentMethod')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.cancelPickerButton}
              onPress={() => setNoPaymentMethod(false)}
            >
              <Text style={styles.cancelPickerText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {showVehiclePicker && (
          <View style={styles.vehiclePicker}>
            <Text style={styles.vehiclePickerTitle}>{t('parkingDetail.selectVehicle')}</Text>

            {reservationError !== '' && (
              <Text style={styles.errorText}>{reservationError}</Text>
            )}

            <View style={styles.vehicleGroup}>
              {vehicles.map((vehicle, index) => (
                <View key={vehicle.id}>
                  {index > 0 && <View style={styles.vehicleGroupDivider} />}
                  <TouchableOpacity
                    style={styles.vehicleRow}
                    onPress={() => {
                      setSelectedVehicleId(vehicle.id);
                      setShowVehiclePicker(false);
                      if (pendingRateBillingType) {
                        handleReserve(pendingRateBillingType, vehicle.id);
                      }
                    }}
                    disabled={reserving}
                  >
                    <View style={styles.vehicleRowInfo}>
                      <Text style={styles.vehicleRowPlate}>{vehicle.license_plate}</Text>
                      <Text style={styles.vehicleRowType}>
                        {t(`vehicles.types.${vehicle.vehicle_type}`, {
                          defaultValue: vehicle.vehicle_type.charAt(0).toUpperCase() + vehicle.vehicle_type.slice(1),
                        })}
                        {vehicle.is_default ? t('parkingDetail.defaultVehicleSuffix') : ''}
                      </Text>
                    </View>
                    {selectedVehicleId === vehicle.id && (
                      <Check color="#34c759" size={16} />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelPickerButton}
              onPress={() => { setShowVehiclePicker(false); setPendingRateBillingType(null); }}
            >
              <Text style={styles.cancelPickerText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {reserving && (
          <ActivityIndicator color={theme.tint} style={styles.vehiclesLoader} />
        )}

        <TouchableOpacity style={styles.mapsButton} onPress={openMaps}>
          <Text style={styles.mapsButtonText}>{t('parkingDetail.openMaps')}</Text>
        </TouchableOpacity>
      </View>
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
      paddingBottom: 40,
    },
    mapHeader: {
      width: '100%',
      height: 260,
    },
    backButtonOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.35)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 0,
    },
    backButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    backText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    contentPadded: {
      paddingHorizontal: 8,
      paddingTop: 16,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 10,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    name: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 6,
      color: theme.text,
    },
    address: {
      fontSize: 15,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    distance: {
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 12,
    },
    divider: {
      height: 1,
      backgroundColor: theme.divider,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 5,
    },
    metaLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    metaValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    noSlots: {
      color: '#ff3b30',
    },
    receivingVehicles: {
      fontSize: 13,
      fontWeight: '600',
      color: '#34c759',
      paddingVertical: 5,
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
      width: 4,
      backgroundColor: theme.tint,
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
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    rateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    vehicleTypeGroup: {
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.divider,
    },
    vehicleTypeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    vehicleTypeIcon: {
      marginRight: 6,
    },
    vehicleTypeLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    serviceFeeNotice: {
      fontSize: 12,
      color: theme.textMuted,
      paddingTop: 10,
      lineHeight: 17,
    },
    closedCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 16,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    closedAccent: {
      width: 4,
      backgroundColor: '#8E8E93',
    },
    closedBody: {
      flex: 1,
      padding: 14,
    },
    closedTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    closedMessage: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 18,
    },
    closedPhone: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.tint,
      marginTop: 8,
    },
    warningCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 16,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    warningAccent: {
      width: 4,
      backgroundColor: '#f59e0b',
    },
    warningBody: {
      flex: 1,
      padding: 14,
    },
    warningTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    warningVehicle: {
      flex: 1,
      fontSize: 14,
      color: theme.textSecondary,
    },
    warningRate: {
      fontSize: 14,
      fontWeight: '700',
      color: '#f59e0b',
    },
    vehiclePicker: {
      marginBottom: 12,
    },
    vehiclePickerTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    vehiclesLoader: {
      marginVertical: 20,
    },
    vehiclesEmpty: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
      marginVertical: 16,
    },
    vehicleGroup: {
      backgroundColor: theme.card,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    vehicleGroupDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.divider,
      marginLeft: 16,
    },
    vehicleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 56,
    },
    vehicleRowInfo: {
      flex: 1,
    },
    vehicleRowPlate: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: 0.5,
    },
    vehicleRowType: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 1,
    },
    cancelPickerButton: {
      alignItems: 'center',
      paddingVertical: 12,
      marginBottom: 4,
    },
    cancelPickerText: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    rateTypeGroup: {
      gap: 10,
      marginBottom: 4,
    },
    rateTypeButton: {
      backgroundColor: theme.tint,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rateTypeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rateTypeIcon: {
      marginRight: 10,
    },
    rateTypeButtonDisabled: {
      opacity: 0.5,
    },
    rateTypeLabel: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    rateTypePrice: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 15,
      fontWeight: '600',
    },
    noPaymentCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    noPaymentIcon: { marginBottom: 12 },
    noPaymentTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    noPaymentMessage: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    addPaymentButton: {
      backgroundColor: theme.tint,
      paddingHorizontal: 28,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      width: '100%',
    },
    addPaymentButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    errorText: {
      color: '#ff3b30',
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 12,
    },
    noSubscriptionCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: 'row',
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    noSubscriptionAccent: {
      width: 4,
      backgroundColor: theme.textMuted,
    },
    noSubscriptionBody: {
      flex: 1,
      padding: 14,
    },
    noSubscriptionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textMuted,
      marginBottom: 6,
    },
    noSubscriptionMessage: {
      fontSize: 13,
      color: theme.textMuted,
      lineHeight: 19,
    },
    mapsButton: {
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.tint,
    },
    mapsButtonText: {
      color: theme.tint,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
