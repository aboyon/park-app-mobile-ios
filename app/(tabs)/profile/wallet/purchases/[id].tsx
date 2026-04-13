import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useLocale } from '@/context/locale';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';
import type { WalletPurchase } from '../purchases';

export default function WalletPurchaseDetailScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useLocale();
  const styles = makeStyles(theme);

  const { data } = useLocalSearchParams<{ id: string; data: string }>();
  const purchase: WalletPurchase = JSON.parse(data);

  const date = new Date(purchase.created_at);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>{t('wallet.purchaseDetailLabel')}</Text>

      <View style={styles.card}>
        <Text style={styles.amountValue}>
          +${purchase.amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })} ARS
        </Text>

        <View style={styles.divider} />

        <DetailRow label={t('wallet.purchaseDetailDate')} value={
          date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
          ' ' +
          date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        } />
        <DetailRow label={t('wallet.purchaseDetailReference')} value={purchase.id.slice(0, 7).toUpperCase()} muted />
        <DetailRow label={t('wallet.purchaseDetailCurrency')} value={purchase.currency.toUpperCase()} />
        <DetailRow
          label={t('wallet.purchaseDetailStatus')}
          value={t(`wallet.purchaseStatus.${purchase.status}` as any, { defaultValue: purchase.status })}
          status={purchase.status}
        />
      </View>
    </View>
  );
}

function DetailRow({ label, value, muted, status }: { label: string; value: string; muted?: boolean; status?: string }) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const statusStyle = status ? styles[`status_${status}` as keyof typeof styles] as any : undefined;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {status ? (
        <Text style={[styles.statusBadge, statusStyle]}>{value}</Text>
      ) : (
        <Text style={[styles.detailValue, muted && styles.detailValueMuted]}>{value}</Text>
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
    backButton: {
      marginBottom: 16,
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
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    amountValue: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 16,
    },
    statusBadge: {
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
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
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.divider,
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.divider,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.textMuted,
      flex: 1,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      textAlign: 'right',
    },
    detailValueMuted: {
      color: theme.textMuted,
      fontWeight: '400',
      fontSize: 12,
    },
  });
}
