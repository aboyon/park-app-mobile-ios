import { useRouter } from 'expo-router';
import { Car, ClipboardList, CreditCard, LogOut, Moon, Settings, Smartphone, Sun, User } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_BASE_URL, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale, type SupportedLocale } from '@/context/locale';
import { useTheme, type ThemePreference } from '@/context/theme';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

type UserData = {
  name: string;
  email: string;
};

const THEME_OPTIONS: { value: ThemePreference; labelKey: string; Icon: typeof Sun }[] = [
  { value: 'system', labelKey: 'profile.theme.system', Icon: Smartphone },
  { value: 'light',  labelKey: 'profile.theme.light',  Icon: Sun },
  { value: 'dark',   labelKey: 'profile.theme.dark',   Icon: Moon },
];

const LANGUAGE_OPTIONS: { value: SupportedLocale }[] = [
  { value: 'en' },
  { value: 'es' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const theme = useAppTheme();
  const { themePreference, setThemePreference } = useTheme();
  const { t, locale, setLocale } = useLocale();
  const styles = makeStyles(theme);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/me`, {
        headers: apiHeaders(token!),
      });
      const data = await response.json();
      setUser(data);
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
    fetchProfile();
  };

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
      <ScrollView
        style={styles.outer}
        contentContainerStyle={styles.container}
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

        {/* Account section */}
        <Text style={styles.sectionLabel}>{t('profile.account')}</Text>
        <View style={styles.accountCard}>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => router.navigate('/(tabs)/preferences')}
            activeOpacity={0.7}
          >
            <Settings color={theme.tint} size={20} />
            <Text style={styles.accountRowLabel}>{t('profile.preferences')}</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.accountRowDivider} />
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => router.navigate('/(tabs)/reservations')}
            activeOpacity={0.7}
          >
            <ClipboardList color={theme.tint} size={20} />
            <Text style={styles.accountRowLabel}>{t('tabs.reservations')}</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.accountRowDivider} />
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => router.navigate('/(tabs)/vehicles')}
            activeOpacity={0.7}
          >
            <Car color={theme.tint} size={20} />
            <Text style={styles.accountRowLabel}>{t('tabs.vehicles')}</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.accountRowDivider} />
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => router.navigate('/(tabs)/payments')}
            activeOpacity={0.7}
          >
            <CreditCard color={theme.tint} size={20} />
            <Text style={styles.accountRowLabel}>{t('tabs.payments')}</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance section */}
        <Text style={styles.sectionLabel}>{t('profile.appearance')}</Text>
        <View style={styles.card}>
          <Text style={styles.appearanceHint}>{t('profile.appearanceHint')}</Text>
          <View style={styles.segmented}>
            {THEME_OPTIONS.map(({ value, labelKey, Icon }) => {
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
                    {t(labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Language section */}
        <Text style={styles.sectionLabel}>{t('profile.language')}</Text>
        <View style={styles.card}>
          <View style={styles.segmented}>
            {LANGUAGE_OPTIONS.map(({ value }) => {
              const active = locale === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  onPress={() => setLocale(value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                    {t(`language.${value}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOut color="#ff3b30" size={18} />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
      paddingHorizontal: 8,
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
    accountCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    accountRowLabel: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
    },
    accountRowChevron: {
      fontSize: 20,
      color: theme.border,
      lineHeight: 22,
    },
    accountRowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.divider,
      marginLeft: 48,
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
