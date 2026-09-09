import { Link, Redirect } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text } from 'react-native';
import { RegistrationForm } from '@/src/auth/RegistrationForm';
import { useSessionStore } from '@/src/auth/session-store';
import { Screen, textStyles } from '@/src/ui/components';

export default function RegisterScreen() {
  const status = useSessionStore((state) => state.status);
  const error = useSessionStore((state) => state.error);
  const register = useSessionStore((state) => state.register);
  const created = useSessionStore((state) => state.registrationCreated);
  if (status === 'authenticated') return <Redirect href="/(tabs)" />;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        {created ? (
          <Text accessibilityRole="alert" style={textStyles.body}>
            Tu cuenta se creó, pero no pudimos cargar el perfil. Inicia sesión para continuar.
          </Text>
        ) : <RegistrationForm busy={status === 'checking'} error={error} onSubmit={(input) => void register(input)} />}
        {status !== 'checking' ? <Link href="/login" replace style={textStyles.body}>Ya tengo cuenta. Ingresar</Link> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
