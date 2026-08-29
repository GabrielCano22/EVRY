import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSessionStore } from '@/src/auth/session-store';
import { LoadingScreen, PrimaryButton, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function LoginScreen() {
  const status = useSessionStore((state) => state.status);
  const error = useSessionStore((state) => state.error);
  const login = useSessionStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (status === 'authenticated') return <Redirect href="/(tabs)" />;
  if (status === 'checking') return <LoadingScreen />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.card}>
        <Text style={textStyles.title}>EVRY</Text>
        <Text style={textStyles.muted}>Accede a tu entrenamiento privado.</Text>
        <TextInput
          accessibilityLabel="Correo electrónico"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={email}
        />
        <TextInput
          accessibilityLabel="Contraseña"
          autoComplete="current-password"
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
        <PrimaryButton
          disabled={!email.trim() || password.length < 8}
          onPress={() => void login(email, password)}
        >
          Ingresar
        </PrimaryButton>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    gap: theme.spacing.md,
    maxWidth: 440,
    padding: theme.spacing.lg,
    width: '100%',
  },
  input: {
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: '#414755',
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
  },
});
