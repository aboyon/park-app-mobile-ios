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

const VEHICLE_ICON: Record<Vehicle['vehicle_type'], string> = {
  car: '🚗',
  truck: '🚚',
  motorcycle: '🏍️',
};

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

function formatTime(iso: string) {
  return new Date(iso).toISOString().slice(11, 16);
}

function formatRate(cents: number) {
  return `€${(cents / 100).toFixed(2)}/h`;
}

export default function ParkingDetail({ parking, onBack }: { parking: Parking; onBack: () => void }) {
  const { token } = useAuth();
  const { refresh } = useMe();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [reserving, setReserving] = useState(false);
  const [reservationError, setReservationError] = useState('');

  const [selectingVehicle, setSelectingVehicle] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  const openMaps = () => {
    const url = `maps://app?daddr=${parking.latitude},${parking.longitude}`;
    Linking.openURL(url);
  };

  const handleReservePress = async () => {
    setSelectingVehicle(true);
    setVehiclesError('');
    setVehiclesLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/my-vehicles`, {
        headers: apiHeaders(token!),
      });
      if (!response.ok) throw new Error();
      const data: Vehicle[] = await response.json();
      setVehicles(data);
      const defaultVehicle = data.find((v) => v.is_default);
      setSelectedVehicleId(defaultVehicle?.id ?? data[0]?.id ?? null);
    } catch {
      setVehiclesError('Could not load vehicles');
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

      {parking.rates?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rates</Text>
          {parking.rates.map((rate, i) => (
            <View key={i} style={[styles.rateRow, i < parking.rates.length - 1 && styles.rateRowBorder]}>
              <Text style={styles.rateDay}>{rate.day_of_week}</Text>
              <Text style={styles.rateTime}>
                {formatTime(rate.start_time)} – {formatTime(rate.end_time)}
              </Text>
              <Text style={styles.ratePrice}>{formatRate(rate.rate_per_hour)}</Text>
            </View>
          ))}
        </View>
      )}

      {selectingVehicle ? (
        <View style={styles.vehiclePicker}>
          <Text style={styles.vehiclePickerTitle}>Select your vehicle</Text>

          {vehiclesLoading ? (
            <ActivityIndicator color="#007AFF" style={styles.vehiclesLoader} />
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
                    <Text style={styles.vehicleRowIcon}>
                      {VEHICLE_ICON[vehicle.vehicle_type]}
                    </Text>
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
        <Text style={styles.mapsButtonText}>Open in Apple Maps</Text>
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
      color: '#007AFF',
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
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    rateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    rateRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    rateDay: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      width: 90,
    },
    rateTime: {
      fontSize: 13,
      color: theme.textSecondary,
      flex: 1,
    },
    ratePrice: {
      fontSize: 14,
      fontWeight: '600',
      color: '#007AFF',
    },
    reserveButton: {
      backgroundColor: '#34c759',
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
    errorText: {
      color: '#ff3b30',
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 12,
    },
    mapsButton: {
      backgroundColor: '#007AFF',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    mapsButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
}
