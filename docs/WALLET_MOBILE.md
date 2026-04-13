# Wallet — Mobile Implementation (React Native / Expo)

## Overview

The wallet feature allows drivers to top up their Parke balance using a fresh card entry each time. The balance is part of the existing `GET /api/me` response via `me.wallet`. No new global state is needed — the existing `MeProvider` and its `refresh()` function handle balance updates after a top-up.

---

## Types

Add to your existing `MeData` type:

```typescript
// types/me.ts (or wherever MeData is defined)
export type Wallet = {
  balance_cents:       number;
  balance:             number;
  minimum_topup_cents: number;
  minimum_topup:       number;
};

// Add to MeData:
export type MeData = {
  // ... existing fields
  wallet: Wallet | null;
};
```

---

## Service: `services/wallet.ts`

```typescript
import { API_BASE_URL } from '@/constants/config';
import { apiHeaders } from '@/constants/config';

export type TopupResult = {
  success:       boolean;
  balance_cents: number;
  balance:       number;
  purchase: {
    id:           string;
    amount_cents: number;
    amount:       number;
    currency:     string;
    status:       string;
    created_at:   string;
  };
};

export async function topupWallet(params: {
  token:             string;
  amount_cents:      number;
  card_token:        string;
  payment_method_id: string;
}): Promise<TopupResult> {
  const response = await fetch(`${API_BASE_URL}/api/wallet/topup`, {
    method:  'POST',
    headers: apiHeaders(params.token),
    body:    JSON.stringify({
      amount_cents:      params.amount_cents,
      card_token:        params.card_token,
      payment_method_id: params.payment_method_id,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Error al recargar la billetera');
  }

  return data as TopupResult;
}
```

---

## Screen 1: Wallet Index — `app/(tabs)/profile/wallet/index.tsx`

Shows current balance and a button to navigate to the top-up screen.

```tsx
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useMe } from '@/context/me';

export default function WalletScreen() {
  const { me, loading } = useMe();
  const router = useRouter();

  if (loading || !me) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const wallet = me.wallet;
  const balance = wallet?.balance ?? 0;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>SALDO DISPONIBLE</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceAmount}>
          ${balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
        </Text>
        <Text style={styles.balanceSubtitle}>Billetera Parke</Text>
      </View>

      <Text style={styles.sectionLabel}>ACCIONES</Text>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => router.push('/(tabs)/profile/wallet/topup')}
      >
        <Text style={styles.actionButtonText}>Recargar saldo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF3F8',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E9BAE',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1A2B4A',
  },
  balanceSubtitle: {
    fontSize: 14,
    color: '#8E9BAE',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#2196A6',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
```

---

## Screen 2: Top-up — `app/(tabs)/profile/wallet/topup.tsx`

Card form + amount input. Reuses the same card form pattern from the existing payments screen. Tokenizes client-side via MP, then POSTs to Rails.

```tsx
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { useMe } from '@/context/me';
import { tokenizeCard } from '@/services/mercadopago';
import { topupWallet } from '@/services/wallet';

export default function WalletTopupScreen() {
  const { token } = useAuth();
  const { me, refresh } = useMe();
  const router = useRouter();

  const minimumTopup = me?.wallet?.minimum_topup ?? 100;

  const [amount, setAmount]               = useState('');
  const [cardNumber, setCardNumber]       = useState('');
  const [cardHolder, setCardHolder]       = useState('');
  const [expiration, setExpiration]       = useState('');
  const [cvv, setCvv]                     = useState('');
  const [loading, setLoading]             = useState(false);

  const handleTopup = async () => {
    const amountNumber = parseFloat(amount);

    if (!amount || isNaN(amountNumber) || amountNumber < minimumTopup) {
      Alert.alert('Monto inválido', `El monto mínimo de recarga es $${minimumTopup} ARS`);
      return;
    }

    if (!cardNumber || !cardHolder || !expiration || !cvv) {
      Alert.alert('Datos incompletos', 'Por favor completá todos los datos de la tarjeta');
      return;
    }

    const [expMonth, expYear] = expiration.split('/');

    if (!expMonth || !expYear) {
      Alert.alert('Vencimiento inválido', 'Ingresá el vencimiento en formato MM/AAAA');
      return;
    }

    setLoading(true);

    try {
      // Step 1 — tokenize card client-side via MP
      const { token: cardToken, payment_method_id } = await tokenizeCard({
        cardNumber:      cardNumber.replace(/\s/g, ''),
        securityCode:    cvv,
        expirationMonth: expMonth,
        expirationYear:  expYear,
        cardholderName:  cardHolder,
      });

      // Step 2 — charge via Rails
      await topupWallet({
        token:             token!,
        amount_cents:      Math.round(amountNumber * 100),
        card_token:        cardToken,
        payment_method_id: payment_method_id,
      });

      // Step 3 — refresh profile to update balance
      await refresh();

      Alert.alert(
        '¡Recarga exitosa!',
        `Se acreditaron $${amountNumber.toLocaleString('es-AR')} ARS a tu billetera Parke`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'No se pudo procesar la recarga');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      <Text style={styles.sectionLabel}>MONTO A RECARGAR</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Monto (ARS)</Text>
        <TextInput
          style={styles.input}
          placeholder={`Mínimo $${minimumTopup}`}
          placeholderTextColor="#B0BAC9"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <Text style={styles.sectionLabel}>DATOS DE LA TARJETA</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Número de tarjeta</Text>
        <TextInput
          style={styles.input}
          placeholder="0000 0000 0000 0000"
          placeholderTextColor="#B0BAC9"
          keyboardType="number-pad"
          maxLength={19}
          value={cardNumber}
          onChangeText={(v) => {
            const cleaned = v.replace(/\D/g, '');
            const formatted = cleaned.match(/.{1,4}/g)?.join(' ') ?? cleaned;
            setCardNumber(formatted);
          }}
        />

        <Text style={styles.fieldLabel}>Nombre del titular</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre en la tarjeta"
          placeholderTextColor="#B0BAC9"
          autoCapitalize="characters"
          value={cardHolder}
          onChangeText={setCardHolder}
        />

        <Text style={styles.fieldLabel}>Vencimiento</Text>
        <TextInput
          style={styles.input}
          placeholder="MM/AAAA"
          placeholderTextColor="#B0BAC9"
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

        <Text style={styles.fieldLabel}>CVV</Text>
        <TextInput
          style={styles.input}
          placeholder="ej. 123"
          placeholderTextColor="#B0BAC9"
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
          : <Text style={styles.buttonText}>Recargar billetera</Text>
        }
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF3F8',
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E9BAE',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E9BAE',
    marginTop: 12,
  },
  input: {
    fontSize: 16,
    color: '#1A2B4A',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F8',
  },
  button: {
    backgroundColor: '#2196A6',
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
```

---

## Profile Screen — Add "Billetera" menu item

Add this item to the existing menu list in `app/(tabs)/profile/index.tsx`, alongside Preferencias, Historial, etc:

```tsx
// Add this import if not already present
import { useMe } from '@/context/me';

// Inside the component, read wallet balance
const { me } = useMe();
const balance = me?.wallet?.balance ?? 0;

// Add this menu item in the list
{
  icon: '💳',  // or whichever icon fits your design system
  label: 'Billetera',
  subtitle: `$${balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS`,
  onPress: () => router.push('/(tabs)/profile/wallet'),
}
```

---

## MeData type update

Make sure `refresh` is exposed from `useMe()`. Based on the `MeProvider` code, `refresh` is already defined with `useCallback` — just confirm it's in the context value return:

```typescript
// In MeContext value:
value={{ me, loading, error, refresh, notificationAlert }}
```

---

## Notes

- The card is never stored — tokenization happens client-side via MP `public_key`, token is single-use
- `minimum_topup` comes from the API (`me.wallet.minimum_topup`) — never hardcoded in the app
- `refresh()` is called after a successful top-up to update the balance in `MeProvider` state
- Card number auto-formats with spaces every 4 digits
- Expiration auto-inserts `/` after MM
- The top-up screen is intentionally stateless — no wallet state needed beyond what's in `me`