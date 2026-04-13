import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useMe } from '@/context/me';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';
import { tokenizeCard } from '@/services/mercadopago';
import { topupWallet } from '@/services/wallet';

export default function WalletTopupScreen() {
  const { token } = useAuth();
  const { me, refresh } = useMe();
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useLocale();
  const styles = makeStyles(theme);

  const minimumTopup = me?.wallet?.minimum_topup ?? 100;

  const [amount, setAmount]         = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiration, setExpiration] = useState('');
  const [cvv, setCvv]               = useState('');
  const [loading, setLoading]       = useState(false);

  const handleTopup = async () => {
    const amountNumber = parseFloat(amount);

    if (!amount || isNaN(amountNumber) || amountNumber < minimumTopup) {
      Alert.alert(t('wallet.invalidAmount'), t('wallet.minimumAmountError', { amount: minimumTopup }));
      return;
    }

    if (!cardNumber || !cardHolder || !expiration || !cvv) {
      Alert.alert(t('wallet.incompleteCard'), t('wallet.incompleteCardMessage'));
      return;
    }

    const [expMonth, expYear] = expiration.split('/');

    if (!expMonth || !expYear) {
      Alert.alert(t('wallet.invalidExpiration'), t('wallet.invalidExpirationMessage'));
      return;
    }

    setLoading(true);

    try {
      const { token: cardToken, payment_method_id } = await tokenizeCard({
        cardNumber:      cardNumber.replace(/\s/g, ''),
        securityCode:    cvv,
        expirationMonth: expMonth,
        expirationYear:  expYear,
        cardholderName:  cardHolder,
      });

      await topupWallet({
        token:             token!,
        amount_cents:      Math.round(amountNumber * 100),
        card_token:        cardToken,
        payment_method_id: payment_method_id,
      });

      await refresh();

      Alert.alert(
        t('wallet.successTitle'),
        t('wallet.successMessage', { amount: amountNumber.toLocaleString('es-AR') }),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(t('wallet.errorTitle'), error.message ?? t('wallet.errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>{t('wallet.amount')}</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>{t('wallet.amountLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('wallet.minimumAmount', { amount: minimumTopup })}
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <Text style={styles.sectionLabel}>{t('wallet.cardDetails')}</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>{t('wallet.cardNumber')}</Text>
        <TextInput
          style={styles.input}
          placeholder="0000 0000 0000 0000"
          placeholderTextColor={theme.textMuted}
          keyboardType="number-pad"
          maxLength={19}
          value={cardNumber}
          onChangeText={(v) => {
            const cleaned = v.replace(/\D/g, '');
            const formatted = cleaned.match(/.{1,4}/g)?.join(' ') ?? cleaned;
            setCardNumber(formatted);
          }}
        />

        <Text style={styles.fieldLabel}>{t('wallet.cardHolder')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('payments.cardHolderPlaceholder')}
          placeholderTextColor={theme.textMuted}
          autoCapitalize="characters"
          value={cardHolder}
          onChangeText={setCardHolder}
        />

        <Text style={styles.fieldLabel}>{t('wallet.expiration')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('payments.expirationPlaceholder')}
          placeholderTextColor={theme.textMuted}
          keyboardType="number-pad"
          maxLength={7}
          value={expiration}
          onChangeText={(v) => {
            const cleaned = v.replace(/\D/g, '');
            if (cleaned.length <= 2) {
              setExpiration(cleaned);
            } else {
              setExpiration(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 6)}`);
            }
          }}
        />

        <Text style={styles.fieldLabel}>{t('wallet.cvv')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('payments.cvvPlaceholder')}
          placeholderTextColor={theme.textMuted}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          value={cvv}
          onChangeText={setCvv}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleTopup}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.buttonText}>{t('wallet.topupButton')}</Text>
        }
      </TouchableOpacity>
    </ScrollView>
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
      marginTop: 24,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      gap: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      marginTop: 12,
    },
    input: {
      fontSize: 16,
      color: theme.text,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    button: {
      backgroundColor: theme.tint,
      borderRadius: 12,
      padding: 18,
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 40,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
