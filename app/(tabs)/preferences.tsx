import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { LinearGradient } from 'expo-linear-gradient';

import { Picker } from '@react-native-picker/picker';

import { API_BASE_URL, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useMe } from '@/context/me';
import { useSearchPreferences } from '@/context/search-preferences';
import { useTheme } from '@/context/theme';
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

export default function PreferencesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { refresh } = useMe();
  const theme = useAppTheme();
  const { colorScheme } = useTheme();
  const { t } = useLocale();
  const styles = makeStyles(theme);

  const gradientColors: [string, string] = colorScheme === 'dark'
    ? ['#0c1422', '#0a0a0f']
    : ['#dceeff', '#f0f4ff'];

  const { inDayTimes, onlyOperatives, setInDayTimes, setOnlyOperatives } = useSearchPreferences();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState('');
  const [notifiableDistance, setNotifiableDistance] = useState<number>(500);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/me`, {
        headers: apiHeaders(token!),
      });
      const data = await response.json();
      setUser(data);
      setName(data.name);
      setNotifiableDistance(data.notifiable_distance);
    } catch {
      setFetchError(t('profile.couldNotLoad'));
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
      const response = await fetch(`${API_BASE_URL}/api/me`, {
        method: 'PATCH',
        headers: apiHeaders(token!),
        body: JSON.stringify({
          profile: { name, notifiable_distance: notifiableDistance },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setSaveError(data.message ?? t('profile.couldNotSave'));
        return;
      }

      const data = await response.json();
      setUser(data);
      setSaveSuccess(true);
      refresh();
    } catch {
      setSaveError(t('common.connectionError'));
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    user !== null &&
    (name !== user.name || notifiableDistance !== user.notifiable_distance);

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={styles.centered}>
        <ActivityIndicator size="large" color={theme.tint} />
      </LinearGradient>
    );
  }

  if (fetchError) {
    return (
      <LinearGradient colors={gradientColors} style={styles.centered}>
        <Text style={styles.errorText}>{fetchError}</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradientColors} style={styles.outer}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.navigate('/(tabs)/profile')}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('profile.preferences')}</Text>

        <Text style={styles.sectionLabel}>{t('profile.sectionLabel')}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>{t('profile.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(v) => { setName(v); setSaveSuccess(false); }}
            placeholder={t('profile.namePlaceholder')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
          />

          <View style={styles.fieldDivider} />

          <Text style={styles.label}>{t('profile.notificationDistance')}</Text>
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
        {saveSuccess && <Text style={styles.successText}>{t('profile.changesSaved')}</Text>}

        <TouchableOpacity
          style={[styles.saveButton, (!isDirty || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{t('profile.saveChanges')}</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, styles.sectionLabelTop]}>{t('profile.searchPreferences')}</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('profile.inDayTimes')}</Text>
            <Switch
              value={inDayTimes}
              onValueChange={setInDayTimes}
              trackColor={{ false: theme.border, true: theme.tint }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('profile.onlyOperatives')}</Text>
            <Switch
              value={onlyOperatives}
              onValueChange={setOnlyOperatives}
              trackColor={{ false: theme.border, true: theme.tint }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    outer: {
      flex: 1,
    },
    fill: {
      flex: 1,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    container: {
      paddingHorizontal: 8,
      paddingTop: 40,
      paddingBottom: 40,
    },
    backButton: {
      marginBottom: 12,
    },
    backText: {
      fontSize: 16,
      color: theme.tint,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginBottom: 8,
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
    sectionLabelTop: {
      marginTop: 40,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    toggleLabel: {
      fontSize: 15,
      color: theme.text,
      flex: 1,
      paddingRight: 12,
    },
    saveButton: {
      backgroundColor: theme.tint,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
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
  });
}
