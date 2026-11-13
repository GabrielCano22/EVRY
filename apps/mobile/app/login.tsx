import { Link, Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSessionStore } from '@/src/auth/session-store';
import { AppIcon } from '@/src/ui/icon';
import { LoadingScreen, PrimaryButton, textStyles, Wordmark } from '@/src/ui/components';
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Wordmark size={40} />
          <Text style={styles.tagline}>Entrenamiento, ciclo y readiness.{'\n'}Todo en un solo lugar.</Text>
        </View>

        <View style={styles.email}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Inicia sesión</Text>
            <Text style={textStyles.muted}>Accede a tu entrenamiento privado.</Text>
            <Field icon="mail" label="Correo electrónico">
              <TextInput
                accessibilityLabel="Correo electrónico"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                placeholderTextColor={theme.colors.textDim}
                style={styles.input}
                value={email}
              />
            </Field>
            <Field icon="lock" label="Contraseña">
              <TextInput
                accessibilityLabel="Contraseña"
                autoComplete="current-password"
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={theme.colors.textDim}
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </Field>
            {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
            <PrimaryButton
              disabled={!email.trim() || password.length < 8}
              icon={<AppIcon color={theme.colors.onPrimary} name="login" size={19} />}
              onPress={() => void login(email, password)}
            >
              Ingresar
            </PrimaryButton>
          </View>

          <View style={styles.registerRow}>
            <Text style={textStyles.muted}>¿Primera vez en EVRY?</Text>
            <Link href="/register" style={styles.registerLink}>Crear una cuenta</Link>
          </View>
        </View>

        <Text style={styles.footnote}>Tus datos de entrenamiento se guardan en este dispositivo y se sincronizan cuando hay conexión.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, label, children }: { icon: Parameters<typeof AppIcon>[0]['name']; label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <AppIcon color={theme.colors.textDim} name={icon} size={18} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.background, flex: 1 },
  content: {
    flexGrow: 1,
    gap: theme.spacing.lg,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  hero: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xs },
  tagline: { color: theme.colors.textMuted, fontSize: 16, lineHeight: 23 },
  email: { gap: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardTitle: { color: theme.colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  field: { gap: 7 },
  fieldLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  inputRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: 14,
  },
  input: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 16,
    minHeight: 52,
    paddingVertical: 12,
  },
  registerRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  registerLink: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  footnote: { color: theme.colors.textDim, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
