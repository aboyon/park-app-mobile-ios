import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { CalendarClock, Map, Phone } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type ParkingResult = {
  parking_id: number;
  name: string;
  address: string;
};

type Product = {
  id: number;
  name: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
};

type ScheduledReservation = {
  id: number;
  start_time: string;
  end_time: string;
  status?: string;
  product?: Product;
};

type FormState = {
  parking_id: number | null;
  parking_name: string;
  start_time: Date;
  end_time: Date;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function defaultEnd(): Date {
  const d = defaultStart();
  d.setHours(d.getHours() + 2);
  return d;
}

function blankForm(): FormState {
  return { parking_id: null, parking_name: '', start_time: defaultStart(), end_time: defaultEnd() };
}

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) {
    return `${s.toLocaleDateString(undefined, { dateStyle: 'medium' })}  ${s.toLocaleTimeString(undefined, { timeStyle: 'short' })} – ${e.toLocaleTimeString(undefined, { timeStyle: 'short' })}`;
  }
  return `${formatDateTime(s)} – ${formatDateTime(e)}`;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#eff6ff', text: '#2563eb' },
  confirmed: { bg: '#f0fdf4', text: '#15803d' },
  cancelled: { bg: '#fff1f0', text: '#ff3b30' },
  expired:   { bg: '#f5f5f5', text: '#6b7280' },
};

function openInMaps(latitude: number, longitude: number, name: string) {
  const label = encodeURIComponent(name);
  const url = Platform.OS === 'ios'
    ? `maps://?q=${label}&ll=${latitude},${longitude}`
    : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
  Linking.openURL(url);
}

// ─── DateTimeField ────────────────────────────────────────────────────────────
// iOS:     compact native pill (display="compact") — tappable, expands inline
// Android: tap to open, two-step date → time dialog

function DateTimeField({
  label,
  value,
  minimumDate,
  onChange,
  styles,
}: {
  label: string;
  value: Date;
  minimumDate?: Date;
  onChange: (date: Date) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const [show, setShow] = useState(false);
  const [androidMode, setAndroidMode] = useState<'date' | 'time'>('date');
  const tempDate = useRef<Date>(value);

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.dateField}>
        <Text style={styles.dateFieldLabel}>{label}</Text>
        <DateTimePicker
          value={value}
          mode="datetime"
          display="compact"
          minimumDate={minimumDate}
          onChange={(_, selected) => { if (selected) onChange(selected); }}
        />
      </View>
    );
  }

  // Android two-step: date picker → time picker
  const handleAndroidChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShow(false);
    if (!selected) {
      setAndroidMode('date');
      return;
    }
    if (androidMode === 'date') {
      tempDate.current = selected;
      setAndroidMode('time');
      setShow(true);
    } else {
      const result = new Date(tempDate.current);
      result.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(result);
      setAndroidMode('date');
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.dateField}
        onPress={() => { setAndroidMode('date'); setShow(true); }}
        activeOpacity={0.7}
      >
        <Text style={styles.dateFieldLabel}>{label}</Text>
        <Text style={styles.dateFieldValue}>{formatDateTime(value)}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={androidMode === 'time' ? tempDate.current : value}
          mode={androidMode}
          display="default"
          minimumDate={androidMode === 'date' ? minimumDate : undefined}
          onChange={handleAndroidChange}
        />
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ScheduledScreen() {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const { t } = useLocale();

  // List state
  const [reservations, setReservations] = useState<ScheduledReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Form/Detail state
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<ScheduledReservation | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Parking display-only (not sent in payload)
  const [selectedParkingAddress, setSelectedParkingAddress] = useState('');

  // Parking search state
  const [parkingQuery, setParkingQuery] = useState('');
  const [parkingResults, setParkingResults] = useState<ParkingResult[]>([]);
  const [parkingSearching, setParkingSearching] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── API ──────────────────────────────────────────────────────────────────

  const fetchReservations = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setFetchError('');
    try {
      const res = await fetch(`${API_BASE}/api/scheduled-reservations`, {
        headers: apiHeaders(token!),
      });
      if (!res.ok) throw new Error();
      setReservations(await res.json());
    } catch {
      setFetchError(t('scheduled.couldNotLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchReservations(); }, [token]));

  // Parking search (debounced)
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (parkingQuery.trim().length <= 4) { setParkingResults([]); return; }

    searchDebounce.current = setTimeout(async () => {
      setParkingSearching(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/find-parking?q=${encodeURIComponent(parkingQuery.trim())}`,
          { headers: apiHeaders(token!) },
        );
        if (res.ok) setParkingResults(await res.json());
      } catch {} finally {
        setParkingSearching(false);
      }
    }, 400);

    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [parkingQuery, token]);

  // ── Navigation helpers ───────────────────────────────────────────────────

  const openCreate = () => {
    setForm(blankForm());
    setSelectedParkingAddress('');
    setParkingQuery('');
    setParkingResults([]);
    setSaveError('');
    setEditing(null);
    setIsCreating(true);
  };

  const openEdit = (r: ScheduledReservation) => {
    setForm({
      parking_id: r.product?.id ?? null,
      parking_name: r.product?.name ?? '',
      start_time: new Date(r.start_time),
      end_time: new Date(r.end_time),
    });
    setSelectedParkingAddress(r.product?.address ?? '');
    setParkingQuery('');
    setParkingResults([]);
    setSaveError('');
    setIsCreating(false);
    setEditing(r);
  };

  const closeForm = () => { setIsCreating(false); setEditing(null); };

  const selectParking = (p: ParkingResult) => {
    setSelectedParkingAddress(p.address);
    setForm(prev => ({ ...prev, parking_id: p.parking_id, parking_name: p.name }));
    setParkingQuery('');
    setParkingResults([]);
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.parking_id) { setSaveError(t('scheduled.parkingRequired')); return; }
    if (form.start_time <= new Date()) { setSaveError(t('scheduled.startInPast')); return; }
    if (form.end_time <= form.start_time) { setSaveError(t('scheduled.endAfterStart')); return; }

    setSaving(true);
    setSaveError('');
    try {
      const isEdit = editing !== null;
      const url = isEdit
        ? `${API_BASE}/api/scheduled-reservations/${editing.id}`
        : `${API_BASE}/api/scheduled-reservations`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: apiHeaders(token!),
        body: JSON.stringify({
          scheduled_reservation: {
            scheduleable_id: form.parking_id,
            scheduleable_type: 'Parking',
            start_time: form.start_time.toISOString(),
            end_time: form.end_time.toISOString(),
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.message ?? t('scheduled.couldNotSave'));
        return;
      }
      closeForm();
      fetchReservations();
    } catch {
      setSaveError(t('common.connectionError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert(
      t('scheduled.deleteTitle'),
      t('scheduled.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await fetch(`${API_BASE}/api/scheduled-reservations/${editing.id}`, {
                method: 'DELETE',
                headers: apiHeaders(token!),
              });
              closeForm();
              fetchReservations();
            } catch {} finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  // ── Form view ────────────────────────────────────────────────────────────

  if (isCreating || editing !== null) {
    const parkingSelected = form.parking_id !== null;

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
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>
            {editing ? t('scheduled.editTitle') : t('scheduled.createTitle')}
          </Text>

          {/* Parking section */}
          <Text style={styles.sectionHeader}>{t('scheduled.sectionParking')}</Text>
          <View style={styles.groupCard}>
            {parkingSelected ? (
              <View style={styles.selectedParking}>
                <View style={styles.selectedParkingInfo}>
                  <Text style={styles.selectedParkingName}>{form.parking_name}</Text>
                  {selectedParkingAddress !== '' && (
                    <Text style={styles.selectedParkingHint}>{selectedParkingAddress}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.changeParkingButton}
                  onPress={() => setForm(prev => ({ ...prev, parking_id: null, parking_name: '' }))}
                >
                  <Text style={styles.changeParkingText}>{t('scheduled.changeParking')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    value={parkingQuery}
                    onChangeText={setParkingQuery}
                    placeholder={t('scheduled.searchParkingPlaceholder')}
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                  {parkingSearching && (
                    <ActivityIndicator size="small" color={theme.tint} style={styles.searchSpinner} />
                  )}
                </View>
                {parkingResults.length > 0 && (
                  <View>
                    {parkingResults.map((p, index) => (
                      <View key={p.parking_id}>
                        {index > 0 && <View style={styles.groupDivider} />}
                        <TouchableOpacity
                          style={styles.searchResultRow}
                          onPress={() => selectParking(p)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultName}>{p.name}</Text>
                            <Text style={styles.searchResultAddress}>{p.address}</Text>
                          </View>
                          <Text style={styles.searchResultChevron}>›</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {parkingQuery.trim().length > 4 && !parkingSearching && parkingResults.length === 0 && (
                  <View style={styles.searchEmptyRow}>
                    <Text style={styles.searchEmptyText}>{t('scheduled.noResults')}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Schedule section */}
          <Text style={styles.sectionHeader}>{t('scheduled.sectionSchedule')}</Text>
          <View style={styles.groupCard}>
            <DateTimeField
              label={t('scheduled.startTime')}
              value={form.start_time}
              minimumDate={new Date()}
              onChange={(date) => {
                const end = new Date(date.getTime() + 2 * 60 * 60 * 1000);
                setForm(prev => ({ ...prev, start_time: date, end_time: end }));
              }}
              styles={styles}
            />
            <View style={styles.groupDivider} />
            <DateTimeField
              label={t('scheduled.endTime')}
              value={form.end_time}
              minimumDate={form.start_time}
              onChange={(date) => setForm(prev => ({ ...prev, end_time: date }))}
              styles={styles}
            />
          </View>

          {saveError !== '' && <Text style={styles.errorText}>{saveError}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, (saving || deleting) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={saving || deleting}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {editing ? t('scheduled.saveChanges') : t('scheduled.create')}
              </Text>
            )}
          </TouchableOpacity>

          {editing && (
            <TouchableOpacity
              style={[styles.deleteButton, (saving || deleting) && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={saving || deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#ff3b30" />
              ) : (
                <Text style={styles.deleteButtonText}>{t('scheduled.delete')}</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────

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
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchReservations()}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.outer}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchReservations({ refresh: true })} />
      }
    >
      <View style={styles.listHeader}>
        <Text style={styles.heading}>{t('scheduled.title')}</Text>
        {reservations.length > 0 && (
          <TouchableOpacity style={styles.addButton} onPress={openCreate}>
            <CalendarClock color="#fff" size={16} />
            <Text style={styles.addButtonText}>{t('scheduled.add')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {reservations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CalendarClock color={theme.textMuted} size={48} />
          <Text style={styles.emptyText}>{t('scheduled.empty')}</Text>
          <TouchableOpacity style={styles.emptyAddButton} onPress={openCreate}>
            <Text style={styles.emptyAddText}>{t('scheduled.addFirst')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.sectionHeader}>{t('scheduled.sectionLabel')}</Text>
          <View style={styles.groupCard}>
            {reservations.map((item, index) => {
              const status = item.status ?? 'pending';
              const colors = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
              return (
                <View key={item.id}>
                  {index > 0 && <View style={styles.groupDivider} />}
                  <TouchableOpacity
                    style={styles.listRow}
                    onPress={() => openEdit(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.listRowInfo}>
                      <Text style={styles.listRowName} numberOfLines={1}>
                        {item.product?.name ?? '—'}
                      </Text>
                      <Text style={styles.listRowAddress} numberOfLines={1}>{item.product?.address}</Text>
                      <Text style={styles.listRowRange}>
                        {formatDateRange(item.start_time, item.end_time)}
                      </Text>
                      <View style={styles.listRowActions}>
                        {item.product?.phone && (
                          <TouchableOpacity
                            style={styles.listRowActionBtn}
                            onPress={() => Linking.openURL(`tel:${item.product!.phone}`)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Phone color={theme.tint} size={13} />
                            <Text style={styles.listRowActionText}>{item.product.phone}</Text>
                          </TouchableOpacity>
                        )}
                        {item.product && (
                          <TouchableOpacity
                            style={styles.listRowActionBtn}
                            onPress={() => openInMaps(item.product!.latitude, item.product!.longitude, item.product!.name)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Map color={theme.tint} size={13} />
                            <Text style={styles.listRowActionText}>{t('common.openMaps')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <View style={styles.listRowRight}>
                      {item.status && (
                        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: colors.text }]}>
                            {t(`reservations.status.${status}`, { defaultValue: status })}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.listRowChevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    outer: { flex: 1, backgroundColor: theme.pageBackground },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.pageBackground },

    // Both views share the same horizontal padding
    listContent: { paddingTop: 60, paddingHorizontal: 12, paddingBottom: 40 },
    formContent: { paddingTop: 60, paddingHorizontal: 12, paddingBottom: 40 },

    // ── List ──
    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    heading: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.tint,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

    emptyContainer: {
      alignItems: 'center',
      marginTop: 60,
      gap: 12,
    },
    emptyText: { fontSize: 15, color: theme.textMuted, marginTop: 4 },
    emptyAddButton: {
      backgroundColor: theme.tint,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 4,
    },
    emptyAddText: { color: '#fff', fontWeight: '600', fontSize: 15 },

    sectionHeader: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.6,
      marginBottom: 10,
      marginTop: 10,
    },
    groupCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
      marginBottom: 8,
    },
    groupDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.divider,
      marginLeft: 16,
    },

    // ── List rows ──
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    listRowInfo: { flex: 1 },
    listRowName: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 2 },
    listRowAddress: { fontSize: 12, color: theme.textMuted, marginBottom: 4 },
    listRowRange: { fontSize: 13, color: theme.textSecondary, marginBottom: 6 },
    listRowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
    listRowActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    listRowActionText: { fontSize: 12, color: theme.tint, fontWeight: '500' },
    listRowRight: { alignItems: 'flex-end', gap: 4 },
    listRowChevron: { fontSize: 20, color: theme.border, lineHeight: 22 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    statusBadgeText: { fontSize: 11, fontWeight: '600' },

    // ── Form ──
    backButton: { marginBottom: 12 },
    backText: { fontSize: 16, color: theme.tint },

    // ── Parking search ──
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
    },
    searchSpinner: { marginLeft: 8 },
    searchResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    searchResultInfo: { flex: 1 },
    searchResultName: { fontSize: 14, fontWeight: '600', color: theme.text },
    searchResultAddress: { fontSize: 12, color: theme.textMuted, marginTop: 1 },
    searchResultChevron: { fontSize: 18, color: theme.border },
    searchEmptyRow: { paddingHorizontal: 16, paddingVertical: 12 },
    searchEmptyText: { fontSize: 14, color: theme.textMuted },

    // ── Selected parking ──
    selectedParking: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    selectedParkingInfo: { flex: 1 },
    selectedParkingName: { fontSize: 15, fontWeight: '600', color: theme.text },
    selectedParkingHint: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    changeParkingButton: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.tint,
    },
    changeParkingText: { fontSize: 12, color: theme.tint, fontWeight: '600' },

    // ── Date/time fields ──
    dateField: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dateFieldLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    dateFieldValue: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },

    // ── Buttons ──
    submitButton: {
      backgroundColor: theme.tint,
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 24,
    },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    deleteButton: {
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor: '#ff3b30',
    },
    deleteButtonText: { color: '#ff3b30', fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.5 },
    errorText: {
      color: '#ff3b30',
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: theme.tint,
      borderRadius: 8,
      marginTop: 8,
    },
    retryText: { color: '#fff', fontWeight: '600' },
  });
}
