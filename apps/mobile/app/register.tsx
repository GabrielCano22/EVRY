import { Link, Redirect } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { RegistrationForm } from '@/src/auth/RegistrationForm';
import { useSessionStore } from '@/src/auth/session-store';
import { Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function RegisterScreen() {
  const status = useSessionStore((state) => state.status);
  const error = useSessionStore((state) => state.error);
  const register = useSessionStore((state) => state.register);
  const created = useSessionStore((state) => state.registrationCreated);
  if (status === 'authenticated') return <Redirect href="/(tabs)" />;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>EVRY · NUEVA CUENTA</Text>
          <Text style={styles.heroTitle}>Tu progreso empieza hoy</Text>
        </View>
        {created ? (
          <Text accessibilityRole="alert" style={textStyles.body}>
            Tu cuenta se creó, pero no pudimos cargar el perfil. Inicia sesión para continuar.
          </Text>
        ) : <RegistrationForm busy={status === 'checking'} error={error} onSubmit={(input) => void register(input)} />}
        {status !== 'checking' ? (
          <Link href="/login" replace style={styles.link}>Ya tengo cuenta. Ingresar</Link>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.background, flex: 1 },
  hero: { gap: 6, paddingTop: theme.spacing.md },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: theme.colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  link: { color: theme.colors.primary, fontSize: 14, fontWeight: '700', paddingVertical: theme.spacing.sm, textAlign: 'center' },
});
