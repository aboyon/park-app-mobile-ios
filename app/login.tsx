import { Redirect, useRouter } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { API_BASE, apiHeaders } from '@/constants/config';
import { useAuth } from '@/context/auth';
import { useAppTheme, type AppTheme } from '@/hooks/use-app-theme';

export default function LoginScreen() {
  const { token, login } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Redirect href="/(tabs)" />;

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/auth`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? 'Invalid credentials');
        return;
      }

      login(data.token);
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo area */}
      <View style={styles.logoArea}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>P</Text>
        </View>
        <Text style={styles.title}>Park App</Text>
        <Text style={styles.subtitle}>Find and reserve parking spots nearby</Text>
      </View>

      {/* Input card */}
      <View style={styles.card}>
        <View style={styles.inputRow}>
          <Mail color={theme.textMuted} size={18} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputDivider} />

        <View style={styles.inputRow}>
          <Lock color={theme.textMuted} size={18} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.replace('/signup')}>
          <Text style={styles.footerLink}>Create account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.pageBackground,
      paddingHorizontal: 28,
    },
    logoArea: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoCircle: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: theme.tint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    logoText: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#fff',
    },
    title: {
      fontSize: 30,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
    },
    card: {
      width: '100%',
      backgroundColor: theme.card,
      borderRadius: 14,
      marginBottom: 16,
      overflow: 'hidden',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    inputDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.divider,
      marginLeft: 48,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
    },
    button: {
      width: '100%',
      backgroundColor: theme.tint,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    error: {
      color: '#ff3b30',
      marginBottom: 10,
      fontSize: 14,
      textAlign: 'center',
    },
    footer: {
      flexDirection: 'row',
      marginTop: 28,
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
