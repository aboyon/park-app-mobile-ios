import { useRouter } from 'expo-router';
import { History, Wallet } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useLocale } from '@/context/locale';
import { useMe } from '@/context/me';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

export default function WalletScreen() {
  const { me, loading } = useMe();
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useLocale();
  const styles = makeStyles(theme);

  if (loading || !me) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  const balance = me.wallet?.balance ?? 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>{t('wallet.availableBalance')}</Text>

      <View style={styles.balanceCard}>
        <Wallet color={theme.tint} size={32} style={styles.walletIcon} />
        <Text style={styles.balanceAmount}>
          ${balance.toLocaleString('es-AR', { minimumFractionDigits: 0 })} ARS
        </Text>
        <Text style={styles.balanceSubtitle}>{t('wallet.walletName')}</Text>
      </View>

      <Text style={styles.sectionLabel}>{t('wallet.actions')}</Text>

      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/(tabs)/profile/wallet/topup')}
          activeOpacity={0.7}
        >
          <Wallet color={theme.tint} size={20} />
          <Text style={styles.menuRowLabel}>{t('wallet.topup')}</Text>
          <Text style={styles.menuRowChevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.menuRowDivider} />
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/(tabs)/profile/wallet/purchases')}
          activeOpacity={0.7}
        >
          <History color={theme.tint} size={20} />
          <Text style={styles.menuRowLabel}>{t('wallet.purchases')}</Text>
          <Text style={styles.menuRowChevron}>›</Text>
        </TouchableOpacity>
      </View>
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
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.pageBackground,
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
      marginTop: 24,
      marginBottom: 8,
      marginLeft: 4,
    },
    balanceCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    walletIcon: {
      marginBottom: 12,
    },
    balanceAmount: {
      fontSize: 36,
      fontWeight: '700',
      color: theme.text,
    },
    balanceSubtitle: {
      fontSize: 14,
      color: theme.textMuted,
      marginTop: 4,
    },
    menuCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    menuRowLabel: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
    },
    menuRowChevron: {
      fontSize: 20,
      color: theme.border,
      lineHeight: 22,
    },
    menuRowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.divider,
      marginLeft: 48,
    },
  });
}
