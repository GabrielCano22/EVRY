import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import {
  continueServerWorkout,
  keepReviewAsDraft,
  loadRecoveredDrafts,
  syncReviews,
  type SyncReview,
} from '@/src/db/database';
import { useSessionStore } from '@/src/auth/session-store';
import { useTrainingStore } from '@/src/training/training-store';
import { PrimaryButton, Screen, SyncStatus, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function HomeScreen() {
  const user = useSessionStore((state) => state.user);
  const activeWorkout = useTrainingStore((state) => state.activeWorkout);
  const startWorkout = useTrainingStore((state) => state.startWorkout);
  const syncState = useTrainingStore((state) => state.syncState);
  const initializeTraining = useTrainingStore((state) => state.initialize);
  const recoverDraft = useTrainingStore((state) => state.recoverDraft);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const { data: reviews = [], refetch: refreshReviews } = useQuery({
    queryKey: ['sync-reviews', syncState],
    queryFn: syncReviews,
  });
  const { data: drafts = [], refetch: refreshDrafts } = useQuery({
    queryKey: ['recovered-drafts', syncState],
    queryFn: loadRecoveredDrafts,
  });
  useFocusEffect(useCallback(() => {
    void refreshReviews();
    void refreshDrafts();
  }, [refreshReviews, refreshDrafts]));

  async function start() {
    await startWorkout();
    router.push('/train');
  }

  async function keepDraft(review: SyncReview) {
    try {
      setResolutionError(null);
      await keepReviewAsDraft(review.workoutClientId);
      await initializeTraining();
      await refreshReviews();
      await refreshDrafts();
    } catch (error) {
      setResolutionError(error instanceof Error ? error.message : 'No se pudo conservar el borrador.');
    }
  }

  async function continueServer(review: SyncReview) {
    try {
      setResolutionError(null);
      await continueServerWorkout(review);
      await initializeTraining();
      await refreshReviews();
    } catch (error) {
      setResolutionError(error instanceof Error ? error.message : 'No se pudo recuperar la sesión.');
    }
  }

  return (
    <Screen>
      <Text style={textStyles.title}>Hola, {user?.name ?? 'atleta'}</Text>
      <Text style={textStyles.muted}>Tu entrenamiento y tus series quedan disponibles incluso sin conexión.</Text>
      <SyncStatus state={syncState} />
      {resolutionError ? <Text accessibilityRole="alert" style={textStyles.error}>{resolutionError}</Text> : null}
      {reviews.map((review) => (
        <View key={review.workoutClientId} style={{ backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 18 }}>
          <Text style={textStyles.heading}>Conflicto de sincronización</Text>
          <Text style={textStyles.body}>{review.workoutName}</Text>
          <Text style={textStyles.muted}>Hay otra versión en el servidor. EVRY no mezclará ambas automáticamente.</Text>
          {review.serverVersion ? (
            <PrimaryButton onPress={() => void continueServer(review)}>Continuar versión del servidor</PrimaryButton>
          ) : null}
          <PrimaryButton onPress={() => void keepDraft(review)}>Conservar local como borrador</PrimaryButton>
        </View>
      ))}
      {drafts.map((draft) => (
        <View key={draft.clientId} style={{ backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 18 }}>
          <Text style={textStyles.heading}>{draft.name}</Text>
          <Text style={textStyles.muted}>Borrador local recuperado · {draft.sets.length} series conservadas.</Text>
          <PrimaryButton disabled={Boolean(activeWorkout)} onPress={() => {
            void recoverDraft(draft).then(async () => {
              await refreshDrafts();
              router.push('/train');
            }).catch((error: unknown) => setResolutionError(error instanceof Error ? error.message : 'No se pudo recuperar el borrador.'));
          }}>Recuperar como nueva sesión</PrimaryButton>
        </View>
      ))}
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
