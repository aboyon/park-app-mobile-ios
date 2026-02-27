import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

type VehicleType = 'car' | 'truck' | 'motorcycle';

const VEHICLE_TYPES: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'car', label: 'Car', icon: '🚗' },
  { value: 'truck', label: 'Truck', icon: '🚚' },
  { value: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
];

export default function RequireVehicleScreen({ onDismiss }: { onDismiss: () => Promise<void> }) {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!licensePlate.trim()) {
      setError('License plate is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/my-vehicles`, {
        method: 'POST',
        headers: apiHeaders(token!),
        body: JSON.stringify({
          vehicle: { license_plate: licensePlate, vehicle_type: vehicleType, is_default: isDefault },
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.message ?? 'Could not save vehicle');
        return;
      }
      await onDismiss();
    } catch {
      setError('Connection error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.outer}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Add a Vehicle</Text>
        <Text style={styles.subheading}>
          You need at least one vehicle registered before you can use the app.
        </Text>

        <Text style={styles.sectionHeader}>DETAILS</Text>
        <View style={styles.groupCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>License Plate</Text>
            <TextInput
              style={styles.fieldInput}
              value={licensePlate}
              onChangeText={(v) => setLicensePlate(v.toUpperCase())}
              placeholder="e.g. AB-12-CD"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.groupDivider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Set as default</Text>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: theme.border, true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={styles.sectionHeader}>TYPE</Text>
        <View style={styles.groupCard}>
          {VEHICLE_TYPES.map(({ value, label, icon }, index) => (
            <View key={value}>
              {index > 0 && <View style={styles.groupDivider} />}
              <TouchableOpacity
                style={styles.typeRow}
                onPress={() => setVehicleType(value)}
              >
                <Text style={styles.typeIcon}>{icon}</Text>
                <Text style={styles.typeLabel}>{label}</Text>
                {vehicleType === value && <Text style={styles.typeCheck}>✓</Text>}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {error !== '' && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Add Vehicle</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    outer: {
      flex: 1,
      backgroundColor: theme.pageBackground,
    },
    content: {
      paddingTop: 60,
      paddingBottom: 40,
    },
    heading: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subheading: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: 8,
      paddingHorizontal: 32,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.6,
      marginTop: 24,
      marginBottom: 8,
      paddingHorizontal: 20,
    },
    groupCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginHorizontal: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    groupDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.divider,
      marginLeft: 16,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 52,
    },
    fieldLabel: {
      fontSize: 15,
      color: theme.text,
      flex: 1,
    },
    fieldInput: {
      fontSize: 15,
      color: theme.text,
      textAlign: 'right',
      flex: 1,
    },
    typeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 52,
    },
    typeIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    typeLabel: {
      fontSize: 15,
      color: theme.text,
      flex: 1,
    },
    typeCheck: {
      fontSize: 16,
      color: '#007AFF',
      fontWeight: '600',
    },
    errorText: {
      color: '#ff3b30',
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
      marginHorizontal: 20,
    },
    submitButton: {
      backgroundColor: '#007AFF',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 24,
      marginHorizontal: 20,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
}
