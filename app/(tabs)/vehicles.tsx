import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
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
import { useLocale } from '@/context/locale';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

type VehicleType = 'car' | 'truck' | 'motorcycle' | 'pickup' | 'suv';

type Vehicle = {
  id: number;
  license_plate: string;
  vehicle_type: VehicleType;
  is_default: boolean;
};

type FormState = {
  license_plate: string;
  vehicle_type: VehicleType;
  is_default: boolean;
};

const BLANK_FORM: FormState = { license_plate: '', vehicle_type: 'car', is_default: false };

const VEHICLE_TYPES: { value: VehicleType; icon: string }[] = [
  { value: 'car',        icon: '🚗' },
  { value: 'truck',      icon: '🚚' },
  { value: 'pickup',     icon: '🛻' },
  { value: 'suv',        icon: '🚙' },
  { value: 'motorcycle', icon: '🏍️' },
];

const VEHICLE_ICON: Record<VehicleType, string> = {
  car:        '🚗',
  truck:      '🚚',
  pickup:     '🛻',
  suv:        '🚙',
  motorcycle: '🏍️',
};

export default function VehiclesScreen() {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { t } = useLocale();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fetchVehicles = useCallback(
    async ({ refresh = false } = {}) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setFetchError('');
      try {
        const response = await fetch(`${API_BASE}/api/my-vehicles`, {
          headers: apiHeaders(token!),
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setVehicles(data);
      } catch {
        setFetchError(t('vehicles.couldNotLoad'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [token])
  );

  const openAdd = () => {
    setForm(BLANK_FORM);
    setSaveError('');
    setEditing(null);
    setIsAdding(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setForm({
      license_plate: vehicle.license_plate,
      vehicle_type: vehicle.vehicle_type,
      is_default: vehicle.is_default,
    });
    setSaveError('');
    setIsAdding(false);
    setEditing(vehicle);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!form.license_plate.trim()) {
      setSaveError(t('vehicles.licensePlateRequired'));
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const isEdit = editing !== null;
      const url = isEdit
        ? `${API_BASE}/api/my-vehicles/${editing.id}`
        : `${API_BASE}/api/my-vehicles`;
      const response = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: apiHeaders(token!),
        body: JSON.stringify({ vehicle: form }),
      });
      if (!response.ok) {
        const data = await response.json();
        setSaveError(data.message ?? t('vehicles.couldNotSave'));
        return;
      }
      closeForm();
      fetchVehicles();
    } catch {
      setSaveError(t('common.connectionError'));
    } finally {
      setSaving(false);
    }
  };

  if (isAdding || editing !== null) {
    return (
      <KeyboardAvoidingView
        style={styles.outer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.outer}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backButton} onPress={closeForm}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>{t('vehicles.sectionDetails')}</Text>
          <View style={styles.groupCard}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{t('vehicles.licensePlate')}</Text>
              <TextInput
                style={styles.fieldInput}
                value={form.license_plate}
                onChangeText={(v) => setForm({ ...form, license_plate: v.toUpperCase() })}
                placeholder={t('vehicles.licensePlatePlaceholder')}
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.groupDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{t('vehicles.setAsDefault')}</Text>
              <Switch
                value={form.is_default}
                onValueChange={(v) => setForm({ ...form, is_default: v })}
                trackColor={{ false: theme.border, true: theme.tint }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <Text style={styles.sectionHeader}>{t('vehicles.sectionType')}</Text>
          <View style={styles.groupCard}>
            {VEHICLE_TYPES.map(({ value, icon }, index) => (
              <View key={value}>
                {index > 0 && <View style={styles.groupDivider} />}
                <TouchableOpacity
                  style={styles.typeRow}
                  onPress={() => setForm({ ...form, vehicle_type: value })}
                >
                  <Text style={styles.typeIcon}>{icon}</Text>
                  <Text style={styles.typeLabel}>{t(`vehicles.types.${value}`)}</Text>
                  {form.vehicle_type === value && (
                    <Text style={styles.typeCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {saveError !== '' && <Text style={styles.errorText}>{saveError}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {editing ? t('vehicles.saveChanges') : t('vehicles.addVehicle')}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{fetchError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchVehicles()}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>{t('vehicles.title')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAdd}>
          <Text style={styles.addButtonText}>{t('vehicles.add')}</Text>
        </TouchableOpacity>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('vehicles.empty')}</Text>
          <TouchableOpacity style={styles.addEmptyButton} onPress={openAdd}>
            <Text style={styles.addEmptyButtonText}>{t('vehicles.addFirst')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchVehicles({ refresh: true })}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
              <View style={styles.cardLeft}>
                <Text style={styles.vehicleIcon}>{VEHICLE_ICON[item.vehicle_type]}</Text>
                <View>
                  <Text style={styles.licensePlate}>{item.license_plate}</Text>
                  <Text style={styles.vehicleType}>{t(`vehicles.types.${item.vehicle_type}`)}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                {item.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>{t('vehicles.defaultBadge')}</Text>
                  </View>
                )}
                <Text style={styles.cardArrow}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    outer: {
      flex: 1,
      backgroundColor: theme.pageBackground,
    },
    container: {
      flex: 1,
      backgroundColor: theme.pageBackground,
      paddingTop: 60,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.pageBackground,
    },
    // List header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    heading: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    addButton: {
      backgroundColor: theme.tint,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    addButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
    },
    list: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 12,
    },
    // Vehicle card
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    cardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    vehicleIcon: {
      fontSize: 28,
    },
    licensePlate: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: 1,
    },
    vehicleType: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
    },
    cardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    defaultBadge: {
      backgroundColor: `${theme.tint}22`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    defaultBadgeText: {
      color: theme.tint,
      fontSize: 12,
      fontWeight: '600',
    },
    cardArrow: {
      fontSize: 20,
      color: theme.border,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textMuted,
      marginBottom: 16,
    },
    addEmptyButton: {
      backgroundColor: theme.tint,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
    },
    addEmptyButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
    },
    // Form
    formContent: {
      paddingTop: 60,
      paddingBottom: 40,
    },
    backButton: {
      marginBottom: 12,
      paddingHorizontal: 20,
    },
    backText: {
      fontSize: 16,
      color: theme.tint,
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
      color: theme.tint,
      fontWeight: '600',
    },
    errorText: {
      color: '#ff3b30',
      fontSize: 14,
      textAlign: 'center',
      marginVertical: 8,
    },
    submitButton: {
      backgroundColor: theme.tint,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 20,
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
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: theme.tint,
      borderRadius: 8,
      marginTop: 8,
    },
    retryText: {
      color: '#fff',
      fontWeight: '600',
    },
  });
}
