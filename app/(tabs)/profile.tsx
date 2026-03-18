import { LogOut, Moon, Smartphone, Sun, User } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Picker } from '@react-native-picker/picker';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useMe } from '@/context/me';
import { type ThemePreference, useTheme } from '@/context/theme';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

const DISTANCE_OPTIONS: { value: number; label: string }[] = [
  { value: 500,   label: '500 m' },
  { value: 1000,  label: '1 km' },
  { value: 3000,  label: '3 km' },
  { value: 10000, label: '10 km' },
  { value: 15000, label: '15 km' },
];

type UserData = {
  name: string;
  email: string;
  notifiable_distance: number;
};

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', Icon: Smartphone },
  { value: 'light',  label: 'Light',  Icon: Sun },
  { value: 'dark',   label: 'Dark',   Icon: Moon },
];

export default function ProfileScreen() {
  const { token, logout } = useAuth();
  const { refresh } = useMe();
  const theme = useAppTheme();
  const { themePreference, setThemePreference } = useTheme();
  const styles = makeStyles(theme);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [name, setName] = useState('');
  const [notifiableDistance, setNotifiableDistance] = useState<number>(500);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/me`, {
        headers: apiHeaders(token!),
      });
      const data = await response.json();
      setUser(data);
      setName(data.name);
      setNotifiableDistance(data.notifiable_distance);
    } catch {
      setFetchError('Could not load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchProfile(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setSaveSuccess(false);
    setSaveError('');
    fetchProfile();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const response = await fetch(`${API_BASE}/api/me`, {
        method: 'PATCH',
        headers: apiHeaders(token!),
        body: JSON.stringify({
          profile: {
            name,
            notifiable_distance: notifiableDistance,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setSaveError(data.message ?? 'Could not save changes');
        return;
      }

      const data = await response.json();
      setUser(data);
      setSaveSuccess(true);
      refresh();
    } catch {
      setSaveError('Connection error');
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    user !== null &&
    (name !== user.name || notifiableDistance !== user.notifiable_distance);

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
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.outer}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <User color={theme.tint} size={28} />
          </View>
          <View>
            <Text style={styles.headerName}>{user?.name ?? ''}</Text>
            <Text style={styles.headerEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>

        {/* Profile section */}
        <Text style={styles.sectionLabel}>PROFILE</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(v) => { setName(v); setSaveSuccess(false); }}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
          />

          <View style={styles.fieldDivider} />

          <Text style={styles.label}>Notification distance</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={notifiableDistance}
              onValueChange={(value) => { setNotifiableDistance(value); setSaveSuccess(false); }}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {DISTANCE_OPTIONS.map(({ value, label }) => (
                <Picker.Item key={value} label={label} value={value} />
              ))}
            </Picker>
          </View>
        </View>

        {saveError !== '' && <Text style={styles.errorText}>{saveError}</Text>}
        {saveSuccess && <Text style={styles.successText}>Changes saved</Text>}

        <TouchableOpacity
          style={[styles.saveButton, (!isDirty || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Appearance section */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.card}>
          <Text style={styles.appearanceHint}>Choose how the app looks</Text>
          <View style={styles.segmented}>
            {THEME_OPTIONS.map(({ value, label, Icon }) => {
              const active = themePreference === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  onPress={() => setThemePreference(value)}
                  activeOpacity={0.7}
                >
                  <Icon color={active ? '#fff' : theme.textMuted} size={16} />
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOut color="#ff3b30" size={18} />
          <Text style={styles.logoutText}>Logout</Text>
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.pageBackground,
    },
    container: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 28,
    },
    avatarCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    headerName: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    headerEmail: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 4,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 6,
    },
    input: {
      fontSize: 15,
      color: theme.text,
      paddingVertical: 4,
    },
    fieldDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.divider,
      marginVertical: 12,
    },
    pickerWrapper: {
      overflow: 'hidden',
      marginTop: 2,
    },
    picker: {
      color: theme.text,
    },
    pickerItem: {
      fontSize: 15,
      color: theme.text,
    },
    appearanceHint: {
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 12,
    },
    segmented: {
      flexDirection: 'row',
      gap: 8,
    },
    segmentButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.pageBackground,
    },
    segmentButtonActive: {
      backgroundColor: theme.tint,
      borderColor: theme.tint,
    },
    segmentLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textMuted,
    },
    segmentLabelActive: {
      color: '#fff',
    },
    saveButton: {
      backgroundColor: theme.tint,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 24,
    },
    saveButtonDisabled: {
      opacity: 0.4,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    successText: {
      color: '#34c759',
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 10,
    },
    errorText: {
      color: '#ff3b30',
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 10,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 15,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#ff3b30',
    },
    logoutText: {
      color: '#ff3b30',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
