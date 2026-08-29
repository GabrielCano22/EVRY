import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useSessionStore } from '@/src/auth/session-store';
import { useTrainingStore } from '@/src/training/training-store';
import { PrimaryButton, Screen, SyncStatus, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function HomeScreen() {
  const user = useSessionStore((state) => state.user);
  const activeWorkout = useTrainingStore((state) => state.activeWorkout);
  const startWorkout = useTrainingStore((state) => state.startWorkout);
  const syncState = useTrainingStore((state) => state.syncState);

  async function start() {
    await startWorkout();
    router.push('/train');
  }

  return (
    <Screen>
      <Text style={textStyles.title}>Hola, {user?.name ?? 'atleta'}</Text>
      <Text style={textStyles.muted}>Tu entrenamiento y tus series quedan disponibles incluso sin conexión.</Text>
      <SyncStatus state={syncState} />
      <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, gap: 12, padding: 20 }}>
        <Text style={textStyles.heading}>{activeWorkout ? activeWorkout.name : '¿Lista para entrenar?'}</Text>
        <Text style={textStyles.muted}>
          {activeWorkout ? `${activeWorkout.sets.length} series guardadas localmente` : 'Inicia una sesión libre y registra tus series.'}
        </Text>
        <PrimaryButton onPress={activeWorkout ? () => router.push('/train') : start}>
          {activeWorkout ? 'Continuar sesión' : 'Iniciar sesión'}
        </PrimaryButton>
      </View>
    </Screen>
  );
}
