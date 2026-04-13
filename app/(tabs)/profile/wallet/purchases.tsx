import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_BASE_URL, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

export type WalletPurchase = {
  id:           string;
  amount_cents: number;
  amount:       number;
  currency:     string;
  status:       string;
  created_at:   string;
};

export default function WalletPurchasesScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const theme = useAppTheme();
  const { t } = useLocale();
  const styles = makeStyles(theme);

  const [purchases, setPurchases] = useState<WalletPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPurchases = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/purchases`, {
        headers: apiHeaders(token!),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPurchases(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPurchases(); }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('wallet.purchasesCouldNotLoad')}</Text>
          <TouchableOpacity onPress={fetchPurchases} style={styles.retryButton}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : purchases.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('wallet.purchasesEmpty')}</Text>
        </View>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>{t('wallet.purchasesSectionLabel')}</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/profile/wallet/purchases/[id]',
                  params: { id: item.id, data: JSON.stringify(item) },
                })
              }
            >
              <View style={styles.rowLeft}>
                <Text style={styles.rowAmount}>
                  +${item.amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })} ARS
                </Text>
                <Text style={styles.rowDate}>
                  {new Date(item.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowStatus, styles[`status_${item.status}` as keyof typeof styles] as any]}>
                  {t(`wallet.purchaseStatus.${item.status}` as any, { defaultValue: item.status })}
                </Text>
                <Text style={styles.rowChevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.pageBackground,
      padding: 16,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButton: {
      marginBottom: 8,
    },
    backText: {
      fontSize: 14,
      color: theme.tint,
      fontWeight: '500',
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.5,
      marginTop: 16,
      marginBottom: 8,
      marginLeft: 4,
    },
    list: {
      paddingBottom: 40,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    rowLeft: {
      flex: 1,
      gap: 4,
    },
    rowAmount: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    rowDate: {
      fontSize: 13,
      color: theme.textMuted,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rowStatus: {
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      overflow: 'hidden',
      color: theme.textMuted,
      backgroundColor: theme.surface2 ?? theme.pageBackground,
    },
    status_completed: {
      color: '#34c759',
      backgroundColor: 'rgba(52,199,89,0.12)',
    },
    status_pending: {
      color: theme.amber ?? '#f5a623',
      backgroundColor: 'rgba(245,166,35,0.12)',
    },
    status_failed: {
      color: '#ff3b30',
      backgroundColor: 'rgba(255,59,48,0.12)',
    },
    rowChevron: {
      fontSize: 20,
      color: theme.border,
      lineHeight: 22,
    },
    separator: {
      height: 8,
    },
    errorText: {
      color: theme.textMuted,
      fontSize: 14,
      marginBottom: 12,
    },
    retryButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.tint,
      borderRadius: 8,
    },
    retryText: {
      color: '#fff',
      fontWeight: '600',
    },
    emptyText: {
      color: theme.textMuted,
      fontSize: 15,
    },
  });
}
