import { Link, Redirect } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { RegistrationForm } from '@/src/auth/RegistrationForm';
import { useSessionStore } from '@/src/auth/session-store';
import { Screen, textStyles } from '@/src/ui/components';

export default function RegisterScreen() {
  const status = useSessionStore((state) => state.status);
  const error = useSessionStore((state) => state.error);
  const register = useSessionStore((state) => state.register);
  if (status === 'authenticated') return <Redirect href="/(tabs)" />;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <RegistrationForm busy={status === 'checking'} error={error} onSubmit={(input) => void register(input)} />
        {status !== 'checking' ? <Link href="/login" replace style={textStyles.body}>Ya tengo cuenta. Ingresar</Link> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
