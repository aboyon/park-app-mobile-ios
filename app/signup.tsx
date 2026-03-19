import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useLocale } from '@/context/locale';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

export default function SignupScreen() {
  const { token, login } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { t } = useLocale();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Redirect href="/(tabs)" />;

  const handleSignup = async () => {
    if (password !== passwordConfirmation) {
      setError(t('signup.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/create-account`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          user: { name, email, password, password_confirmation: passwordConfirmation },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? t('signup.couldNotCreate'));
        return;
      }

      if (data.token) {
        login(data.token);
      } else {
        router.replace('/login');
      }
    } catch {
      setError(t('common.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{t('signup.title')}</Text>

      <Text style={styles.label}>{t('signup.name')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('signup.fullNamePlaceholder')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <Text style={styles.label}>{t('signup.email')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('signup.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>{t('signup.password')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('signup.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text style={styles.label}>{t('signup.confirmPassword')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('signup.confirmPasswordPlaceholder')}
        value={passwordConfirmation}
        onChangeText={setPasswordConfirmation}
        secureTextEntry
      />

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('signup.signUp')}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('signup.haveAccount')}</Text>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.footerLink}>{t('signup.login')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
      padding: 30,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 40,
      color: theme.text,
    },
    label: {
      alignSelf: 'flex-start',
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      width: '100%',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 15,
      fontSize: 16,
      color: theme.text,
    },
    button: {
      width: '100%',
      backgroundColor: theme.tint,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    error: {
      color: '#ff3b30',
      marginBottom: 10,
    },
    footer: {
      flexDirection: 'row',
      marginTop: 24,
    },
    footerText: {
      fontSize: 14,
      color: theme.textMuted,
    },
    footerLink: {
      fontSize: 14,
      color: theme.tint,
      fontWeight: '600',
    },
  });
}
