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

import { useAuth } from '@/context/auth';
import { API_BASE, apiHeaders } from '@/constants/config';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

type User = {
  name: string;
  email: string;
  notifiable_distance: number;
};

export default function ProfileScreen() {
  const { token, logout } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [name, setName] = useState('');
  const [notifiableDistance, setNotifiableDistance] = useState('');
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
      setNotifiableDistance(String(data.notifiable_distance));
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
          user: {
            name,
            notifiable_distance: Number(notifiableDistance),
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
    } catch {
      setSaveError('Connection error');
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    user !== null &&
    (name !== user.name || notifiableDistance !== String(user.notifiable_distance));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
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
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(v) => { setName(v); setSaveSuccess(false); }}
            placeholder="Your name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>{user?.email}</Text>
          </View>

          <Text style={styles.label}>Notification distance (m)</Text>
          <TextInput
            style={styles.input}
            value={notifiableDistance}
            onChangeText={(v) => { setNotifiableDistance(v); setSaveSuccess(false); }}
            placeholder="Distance in metres"
            keyboardType="numeric"
          />
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

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
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
      padding: 20,
      paddingTop: 60,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 20,
    },
    label: {
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 11,
      fontSize: 15,
      color: theme.text,
    },
    readonlyField: {
      borderWidth: 1,
      borderColor: theme.divider,
      borderRadius: 8,
      padding: 11,
      backgroundColor: theme.pageBackground,
    },
    readonlyText: {
      fontSize: 15,
      color: theme.textMuted,
    },
    saveButton: {
      backgroundColor: '#007AFF',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 12,
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
      padding: 15,
      borderRadius: 10,
      backgroundColor: '#ff3b30',
      alignItems: 'center',
    },
    logoutText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
}
