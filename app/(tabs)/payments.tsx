import { useFocusEffect } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';
import { tokenizeCard } from '@/services/mercadopago';
import { useMemo } from 'react';

type PaymentMethodType = 'credit_card' | 'debit';

type CreditCardDetails = {
  card_holder: string;
  last_four: string;
  expiration: string;
  payment_type_id: string;
  display_name: string;
  payment_method_id: string;
};

type DebitDetails = {
  cbu: string;
  bank_name: string;
  account_holder: string;
};

type PaymentMethod = {
  id: number;
  payment_method_render_type: PaymentMethodType;
  is_default: boolean;
  details: CreditCardDetails | DebitDetails;
};

type FormState = {
  payment_method_render_type: PaymentMethodType;
  // credit_card fields
  card_holder: string;
  card_id: string;
  expiration: string;
  payment_type_id: string;
  cvv: string;
  issuer_id: string;
  // debit fields
  cbu: string;
  bank_name: string;
  account_holder: string;
  // common
  is_default: boolean;
};

const BLANK_FORM: FormState = {
  payment_method_render_type: 'credit_card',
  card_holder: '',
  card_id: '',
  expiration: '',
  payment_type_id: '',
  cvv: '',
  issuer_id: '',
  cbu: '',
  bank_name: '',
  account_holder: '',
  is_default: false,
};

const METHOD_TYPES: { value: PaymentMethodType; label: string; icon: string }[] = [
  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
  { value: 'debit',       label: 'Debit',       icon: '🏦' },
];

function formatCardNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function methodTitle(m: PaymentMethod): string {
  if (m.payment_method_render_type === 'credit_card') {
    const d = m.details as CreditCardDetails;
    return d.last_four ? `•••• ${d.last_four}` : 'Credit Card';
  }
  const d = m.details as DebitDetails;
  return d.cbu ?? 'Debit Account';
}

function methodSubtitle(m: PaymentMethod): string {
  if (m.payment_method_render_type === 'credit_card') {
    return (m.details as CreditCardDetails).card_holder ?? '';
  }
  const account_holder = (m.details as DebitDetails).account_holder ?? '';
  const bank_name = (m.details as DebitDetails).bank_name ?? '';
  return account_holder + ' - ' + bank_name;
}

function methodIcon(m: PaymentMethod): string {
  return m.payment_method_render_type === 'credit_card' ? '💳' : '🏦';
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  master: 'Mastercard',
  visa: 'Visa',
  amex: 'American Express',
};

function formatPaymentType(id: string): string {
  return PAYMENT_TYPE_LABELS[id.toLowerCase()] ?? id;
}

export default function PaymentsScreen() {
  const { token } = useAuth();
  const theme = useAppTheme();
  // const styles = makeStyles(theme);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);

  const fetchMethods = useCallback(
    async ({ refresh = false } = {}) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setFetchError('');
      try {
        const response = await fetch(`${API_BASE}/api/payment-methods`, {
          headers: apiHeaders(token!),
        });
        if (!response.ok) throw new Error();
        setMethods(await response.json());
      } catch {
        setFetchError('Could not load payment methods');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(useCallback(() => { fetchMethods(); }, [token]));

  const validate = (): string | null => {
    if (form.payment_method_render_type === 'credit_card') {
      if (!form.card_id.trim()) return 'Card number is required';
      if (!form.card_holder.trim()) return 'Cardholder name is required';
      if (!form.expiration.trim()) return 'Expiration is required';
    } else {
      if (!form.cbu.trim()) return 'CBU is required';
      if (!form.bank_name.trim()) return 'Bank name is required';
      if (!form.account_holder.trim()) return 'Account holder is required';
    }
    return null;
  };

  const handleAdd = async () => {
    const error = validate();
    if (error) { setSaveError(error); return; }
    setSaving(true);
    setSaveError('');
    try {
      let payload: Record<string, unknown>;

      if (form.payment_method_render_type === 'credit_card') {
        const [expMonth, expYear] = form.expiration.split('/');
        const { token: mpToken, payment_method_id } = await tokenizeCard({
          cardNumber: form.card_id.replace(/\s/g, ''),
          securityCode: form.cvv,
          expirationMonth: expMonth?.trim() ?? '',
          expirationYear: expYear?.trim() ?? '',
          cardholderName: form.card_holder,
        });
        payload = {
          payment_method_render_type: 'credit_card',
          token: mpToken,
          is_default: form.is_default
        };
      } else {
        payload = {
          payment_method_render_type: 'debit',
          debit_cbu: form.cbu,
          debit_bank_name: form.bank_name,
          debit_account_holder: form.account_holder,
          is_default: form.is_default,
        };
      }

      const response = await fetch(`${API_BASE}/api/payment-methods`, {
        method: 'POST',
        headers: apiHeaders(token!),
        body: JSON.stringify({ payment_method: payload }),
      });
      if (!response.ok) {
        const data = await response.json();
        setSaveError(data.message ?? 'Could not add payment method');
        return;
      }
      setIsAdding(false);
      setForm(BLANK_FORM);
      fetchMethods();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Connection error');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (method: PaymentMethod) => {
    if (method.is_default) return;
    setSettingDefaultId(method.id);
    try {
      await fetch(`${API_BASE}/api/payment-methods/${method.id}/set-default`, {
        method: 'PATCH',
        headers: apiHeaders(token!),
        body: JSON.stringify({ payment_method: { is_default: true } }),
      });
      fetchMethods();
    } catch {} finally {
      setSettingDefaultId(null);
    }
  };

  const handleDelete = (method: PaymentMethod) => {
    Alert.alert(
      'Remove payment method',
      `Remove ${methodTitle(method)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(method.id);
            try {
              await fetch(`${API_BASE}/api/payment-methods/${method.id}`, {
                method: 'DELETE',
                headers: apiHeaders(token!),
              });
              fetchMethods();
            } catch {} finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const closeForm = () => { setIsAdding(false); setForm(BLANK_FORM); setSaveError(''); };
  const isCreditCard = form.payment_method_render_type === 'credit_card';

  if (isAdding) {
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
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>TYPE</Text>
          <View style={styles.groupCard}>
            {METHOD_TYPES.map(({ value, label, icon }, index) => (
              <View key={value}>
                {index > 0 && <View style={styles.groupDivider} />}
                <TouchableOpacity
                  style={styles.typeRow}
                  onPress={() => setForm({ ...BLANK_FORM, payment_method_render_type: value })}
                >
                  <Text style={styles.typeIcon}>{icon}</Text>
                  <Text style={styles.typeLabel}>{label}</Text>
                  {form.payment_method_render_type === value && (
                    <Text style={styles.typeCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {isCreditCard ? (
            <>
              <Text style={styles.sectionHeader}>CARD DETAILS</Text>
              <View style={styles.groupCard}>
                <View style={styles.stackedField}>
                  <Text style={styles.stackedLabel}>Card number</Text>
                  <TextInput
                    style={styles.stackedInput}
                    value={form.card_id}
                    onChangeText={(v) => setForm({ ...form, card_id: formatCardNumber(v) })}
                    placeholder="0000 0000 0000 0000"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                </View>
                <View style={styles.groupDivider} />
                <View style={styles.stackedField}>
                  <Text style={styles.stackedLabel}>Cardholder name</Text>
                  <TextInput
                    style={styles.stackedInput}
                    value={form.card_holder}
                    onChangeText={(v) => setForm({ ...form, card_holder: v })}
                    placeholder="Name on card"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.groupDivider} />
                <View style={styles.stackedField}>
                  <Text style={styles.stackedLabel}>Expiration</Text>
                  <TextInput
                    style={styles.stackedInput}
                    value={form.expiration}
                    onChangeText={(v) => setForm({ ...form, expiration: v })}
                    placeholder="MM/YYYY"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={7}
                  />
                </View>
                <View style={styles.groupDivider} />
                <View style={styles.stackedField}>
                  <Text style={styles.stackedLabel}>CVV</Text>
                  <TextInput
                    style={styles.stackedInput}
                    value={form.cvv}
                    onChangeText={(v) => setForm({ ...form, cvv: v })}
                    placeholder="e.g. 123"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionHeader}>ACCOUNT DETAILS</Text>
              <View style={styles.groupCard}>
              <View style={styles.stackedField}>
                <View pointerEvents="none">
                  <Text style={styles.stackedLabel}>CBU</Text>
                </View>
                <TextInput
                  style={styles.stackedInput}
                  value={form.cbu}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, cbu: v.replace(/\D/g, '') }))}
                  placeholder="22-digit CBU"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  maxLength={22}
                />
              </View>
              <View style={styles.groupDivider} />
              <View style={styles.stackedField}>
                <View pointerEvents="none">
                  <Text style={styles.stackedLabel}>Bank name</Text>
                </View>
                <TextInput
                  style={styles.stackedInput}
                  value={form.bank_name}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, bank_name: v }))}
                  placeholder="e.g. Banco Galicia"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.groupDivider} />
              <View style={styles.stackedField}>
                <View pointerEvents="none">
                  <Text style={styles.stackedLabel}>Account holder</Text>
                </View>
                <TextInput
                  key="account_holder_input"
                  style={styles.stackedInput}
                  value={form.account_holder}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, account_holder: v }))}
                  placeholder="Full name"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="words"
                />
              </View>
            </View>
            </>
          )}

          <TextInput style={{ height: 0, opacity: 0 }} />

          <Text style={styles.sectionHeader}>OPTIONS</Text>
          <View style={styles.groupCard}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Set as default</Text>
              <Switch
                value={form.is_default}
                onValueChange={(v) => setForm({ ...form, is_default: v })}
                trackColor={{ false: theme.border, true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {saveError !== '' && <Text style={styles.errorText}>{saveError}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleAdd}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Payment Method</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  if (fetchError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{fetchError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchMethods()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Payment Methods</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => { setForm(BLANK_FORM); setSaveError(''); setIsAdding(true); }}
      >
        <Text style={styles.addButtonText}>+ Add Payment Method</Text>
      </TouchableOpacity>

      {methods.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No payment methods yet</Text>
        </View>
      ) : (
        <FlatList
          data={methods}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchMethods({ refresh: true })} />
          }
          renderItem={({ item }) => {
            const ccDetails = item.payment_method_render_type === 'credit_card'
              ? (item.details as CreditCardDetails)
              : null;
            return (
            <View style={[styles.card, item.is_default && styles.cardDefault]}>
              <View style={styles.cardMain}>
                <Text style={styles.cardIcon}>{methodIcon(item)}</Text>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardNumber}>{item.display_name}</Text>
                    {item.is_default && (
                      <Star size={16} color="#f59e0b" fill="#f59e0b" />
                    )}
                  </View>
                  <Text style={styles.cardMeta}>{methodSubtitle(item)}</Text>
                  {ccDetails?.payment_type_id ? (
                    <Text style={styles.cardNetwork}>{formatPaymentType(ccDetails.payment_type_id)}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.cardActions}>
                {!item.is_default && (
                  <TouchableOpacity
                    style={styles.setDefaultButton}
                    onPress={() => handleSetDefault(item)}
                    disabled={settingDefaultId === item.id}
                  >
                    {settingDefaultId === item.id ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Text style={styles.setDefaultText}>Set default</Text>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#ff3b30" />
                  ) : (
                    <Text style={styles.deleteText}>Remove</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            );
          }}
        />
      )}
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    outer: { flex: 1, backgroundColor: theme.pageBackground },
    container: { flex: 1, backgroundColor: theme.pageBackground, paddingTop: 60 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.pageBackground },
    header: { paddingHorizontal: 20, marginBottom: 12 },
    heading: { fontSize: 24, fontWeight: 'bold', color: theme.text },
    addButton: {
      backgroundColor: '#007AFF', marginHorizontal: 20, marginBottom: 20,
      paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    },
    addButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    list: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1.5,
      borderColor: 'transparent',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    cardDefault: {
      borderColor: '#f59e0b',
    },
    cardMain: { flexDirection: 'row', alignItems: 'center' },
    cardIcon: { fontSize: 28, marginRight: 14 },
    cardInfo: { flex: 1 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardNumber: { fontSize: 15, fontWeight: '700', color: theme.text, letterSpacing: 0.5 },
    cardMeta: { fontSize: 13, color: theme.textMuted, marginTop: 3 },
    cardNetwork: { fontSize: 12, color: theme.textMuted, marginTop: 2, fontStyle: 'italic' },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.divider,
    },
    setDefaultButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#007AFF' },
    setDefaultText: { color: '#007AFF', fontSize: 13, fontWeight: '600' },
    deleteButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#ff3b30' },
    deleteText: { color: '#ff3b30', fontSize: 13, fontWeight: '600' },
    emptyText: { fontSize: 16, color: theme.textMuted, marginBottom: 16 },
    formContent: { paddingTop: 60, paddingBottom: 40 },
    backButton: { marginBottom: 12, paddingHorizontal: 20 },
    backText: { fontSize: 16, color: '#007AFF' },
    sectionHeader: {
      fontSize: 12, fontWeight: '600', color: theme.textMuted,
      letterSpacing: 0.6, marginTop: 24, marginBottom: 8, paddingHorizontal: 20,
    },
    groupCard: {
      backgroundColor: theme.card, borderRadius: 12, marginHorizontal: 20,
      // overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    groupDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.divider, marginLeft: 16 },
    typeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
    typeIcon: { fontSize: 20, marginRight: 12 },
    typeLabel: { fontSize: 15, color: theme.text, flex: 1 },
    typeCheck: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
    fieldRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14, minHeight: 52,
    },
    fieldLabel: { fontSize: 15, color: theme.text, flex: 1 },
    stackedField: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
    stackedLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted, marginBottom: 6 },
    stackedInput: { fontSize: 16, color: theme.text },
    errorText: { color: '#ff3b30', fontSize: 14, textAlign: 'center', marginVertical: 8, paddingHorizontal: 20 },
    submitButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20, marginHorizontal: 20 },
    submitButtonDisabled: { opacity: 0.5 },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    retryButton: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#007AFF', borderRadius: 8, marginTop: 8 },
    retryText: { color: '#fff', fontWeight: '600' },
  });
}
