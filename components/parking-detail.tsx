import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useMe } from '@/context/me';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

type Vehicle = {
  id: number;
  license_plate: string;
  vehicle_type: 'car' | 'truck' | 'motorcycle';
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
  lock_slot_charge_policy: string;
  today_rate_cents: VehicleRates;
  today_penalization_rates_cents: VehicleRates;
};

const VEHICLE_RATE_ICON: Record<string, string> = {
  car: '🚗',
  truck: '🚚',
  motorcycle: '🏍️',
  pickup: '🛻',
};

function formatRate(cents: number) {
  return `$${(cents / 100).toFixed(2)}/h`;
}


export default function ParkingDetail({ parking, onBack }: { parking: Parking; onBack: () => void }) {
  const { token } = useAuth();
  const { refresh } = useMe();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const [reserving, setReserving] = useState(false);
  const [reservationError, setReservationError] = useState('');

  const [selectingVehicle, setSelectingVehicle] = useState(false);
  const [noPaymentMethod, setNoPaymentMethod] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  const openMaps = () => {
    const url = `maps://app?daddr=${parking.latitude},${parking.longitude}`;
    Linking.openURL(url);
  };

  const handleReservePress = async () => {
    setVehiclesError('');
    setVehiclesLoading(true);
    try {
      const [vehiclesRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/my-vehicles`, { headers: apiHeaders(token!) }),
        fetch(`${API_BASE}/api/payment-methods`, { headers: apiHeaders(token!) }),
      ]);
      if (!vehiclesRes.ok) throw new Error();
      const vehiclesData: Vehicle[] = await vehiclesRes.json();
      const paymentsData: unknown[] = paymentsRes.ok ? await paymentsRes.json() : [];

      if (paymentsData.length === 0) {
        setNoPaymentMethod(true);
        setSelectingVehicle(true);
        return;
      }

      setNoPaymentMethod(false);
      setVehicles(vehiclesData);
      const defaultVehicle = vehiclesData.find((v) => v.is_default);
      setSelectedVehicleId(defaultVehicle?.id ?? vehiclesData[0]?.id ?? null);
      setSelectingVehicle(true);
    } catch {
      setVehiclesError('Could not load data');
    } finally {
      setVehiclesLoading(false);
    }
  };

  const handleReserve = async () => {
    setReserving(true);
    setReservationError('');
    try {
      const response = await fetch(`${API_BASE}/api/parking-reservations`, {
        method: 'POST',
        headers: apiHeaders(token!),
        body: JSON.stringify({
          reservation: { parking_id: parking.id, vehicle_id: selectedVehicleId },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setReservationError(data.message ?? 'Could not complete reservation');
        return;
      }

      setSelectingVehicle(false);
      await refresh();
    } catch {
      setReservationError('Connection error');
    } finally {
      setReserving(false);
    }
  };

  const noSlotsAvailable = parking.available_slots === 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.name}>{parking.name}</Text>
        <Text style={styles.address}>{parking.address}</Text>
        <Text style={styles.distance}>
          {(parking.distance / 1000).toFixed(1)} km away
        </Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.metaLabel}>Available slots</Text>
          <Text style={[styles.metaValue, noSlotsAvailable && styles.noSlots]}>
            {parking.available_slots}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.metaLabel}>Reservation expires after</Text>
          <Text style={styles.metaValue}>{parking.keep_slot_open_minutes} min</Text>
        </View>
      </View>

      {Object.keys(parking.today_rate_cents ?? {}).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Today's rates</Text>
          {Object.entries(parking.today_rate_cents).map(([type, rate], i, arr) => (
            <View key={type} style={[styles.rateRow, i < arr.length - 1 && styles.rateRowBorder]}>
              <Text style={styles.rateIcon}>{VEHICLE_RATE_ICON[type] ?? '🚘'}</Text>
              <Text style={styles.rateVehicle}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
              <Text style={styles.ratePrice}>{formatRate(rate.rate_per_hour_cents)}</Text>
            </View>
          ))}
        </View>
      )}

      {parking.rate_policy_strategy === 'strict' &&
        Object.keys(parking.today_penalization_rates_cents ?? {}).length > 0 && (
          <View style={styles.warningCard}>
            <View style={styles.warningAccent} />
            <View style={styles.warningBody}>
              <Text style={styles.warningTitle}>
                WARNING: Charges apply if you don't arrive within {parking.keep_slot_open_minutes} min
              </Text>
              {parking.lock_slot_charge_policy === 'flat_rate' ? (
                <Text style={styles.warningRate}>
                  {formatRate(Object.values(parking.today_penalization_rates_cents)[0].rate_per_hour_cents)}
                </Text>
              ) : (
                Object.entries(parking.today_penalization_rates_cents).map(([type, rate]) => (
                  <View key={type} style={styles.rateRow}>
                    <Text style={styles.warningVehicle}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                    <Text style={styles.warningRate}>{formatRate(rate.rate_per_hour_cents)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

      {selectingVehicle ? (
        <View style={styles.vehiclePicker}>
          {noPaymentMethod ? (
            <>
              <View style={styles.noPaymentCard}>
                <Text style={styles.noPaymentIcon}>💳</Text>
                <Text style={styles.noPaymentTitle}>No payment method</Text>
                <Text style={styles.noPaymentMessage}>
                  You need to add a payment method before reserving a spot.
                </Text>
                <TouchableOpacity
                  style={styles.addPaymentButton}
                  onPress={() => { setSelectingVehicle(false); router.navigate('/(tabs)/payments'); }}
                >
                  <Text style={styles.addPaymentButtonText}>Add Payment Method</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.cancelPickerButton}
                onPress={() => { setSelectingVehicle(false); setNoPaymentMethod(false); }}
              >
                <Text style={styles.cancelPickerText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
          <Text style={styles.vehiclePickerTitle}>Select your vehicle</Text>

          {vehiclesLoading ? (
            <ActivityIndicator color="#6366f1" style={styles.vehiclesLoader} />
          ) : vehiclesError !== '' ? (
            <Text style={styles.errorText}>{vehiclesError}</Text>
          ) : vehicles.length === 0 ? (
            <Text style={styles.vehiclesEmpty}>
              No vehicles found. Add one in the Vehicles tab first.
            </Text>
          ) : (
            <View style={styles.vehicleGroup}>
              {vehicles.map((vehicle, index) => (
                <View key={vehicle.id}>
                  {index > 0 && <View style={styles.vehicleGroupDivider} />}
                  <TouchableOpacity
                    style={styles.vehicleRow}
                    onPress={() => setSelectedVehicleId(vehicle.id)}
                  >
                    <View style={styles.vehicleRowInfo}>
                      <Text style={styles.vehicleRowPlate}>{vehicle.license_plate}</Text>
                      <Text style={styles.vehicleRowType}>
                        {vehicle.vehicle_type.charAt(0).toUpperCase() +
                          vehicle.vehicle_type.slice(1)}
                        {vehicle.is_default ? ' · Default' : ''}
                      </Text>
                    </View>
                    {selectedVehicleId === vehicle.id && (
                      <Text style={styles.vehicleRowCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {reservationError !== '' && (
            <Text style={styles.errorText}>{reservationError}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.reserveButton,
              (!selectedVehicleId || reserving) && styles.reserveButtonDisabled,
            ]}
            onPress={handleReserve}
            disabled={!selectedVehicleId || reserving}
          >
            {reserving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.reserveButtonText}>Confirm Reservation</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelPickerButton}
            onPress={() => setSelectingVehicle(false)}
          >
            <Text style={styles.cancelPickerText}>Cancel</Text>
          </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.reserveButton,
            noSlotsAvailable && styles.reserveButtonDisabled,
          ]}
          onPress={handleReservePress}
          disabled={noSlotsAvailable}
        >
          <Text style={styles.reserveButtonText}>
            {noSlotsAvailable ? 'No Slots Available' : 'Reserve a Spot'}
          </Text>
        </TouchableOpacity>
      )}

      {!selectingVehicle && reservationError !== '' && (
        <Text style={styles.errorText}>{reservationError}</Text>
      )}

      <TouchableOpacity style={styles.mapsButton} onPress={openMaps}>
        <Text style={styles.mapsButtonText}>Open in Maps</Text>
      </TouchableOpacity>
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
      padding: 20,
      paddingTop: 60,
      paddingBottom: 40,
    },
    backButton: {
      marginBottom: 20,
    },
    backText: {
      fontSize: 16,
      color: '#6366f1',
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
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    rateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    rateRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.divider,
    },
    rateIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    rateVehicle: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
    },
    ratePrice: {
      fontSize: 14,
      fontWeight: '700',
      color: '#6366f1',
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
    reserveButton: {
      backgroundColor: '#6366f1',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 12,
    },
    reserveButtonDisabled: {
      opacity: 0.5,
    },
    reserveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    // Vehicle picker
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
    vehicleRowIcon: {
      fontSize: 22,
      marginRight: 12,
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
    vehicleRowCheck: {
      fontSize: 16,
      color: '#34c759',
      fontWeight: '700',
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
    noPaymentIcon: { fontSize: 48, marginBottom: 12 },
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
      backgroundColor: '#6366f1',
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
    mapsButton: {
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#6366f1',
    },
    mapsButtonText: {
      color: '#6366f1',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
