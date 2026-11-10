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
import { adoptWorkoutWithRefresh, isCurrentMobileSession } from '@/src/api/client';

export default function HomeScreen() {
  const user = useSessionStore((state) => state.user);
  const session = useSessionStore((state) => state.session)!;
  const offline = useSessionStore((state) => state.offline);
  const activeWorkout = useTrainingStore((state) => state.activeWorkout);
  const trainingReady = useTrainingStore((state) => state.ready);
  const startWorkout = useTrainingStore((state) => state.startWorkout);
  const syncState = useTrainingStore((state) => state.syncState);
  const localSaveState = useTrainingStore((state) => state.localSaveState);
  const trainingError = useTrainingStore((state) => state.error);
  const initializeTraining = useTrainingStore((state) => state.initialize);
  const recoverDraft = useTrainingStore((state) => state.recoverDraft);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const { data: reviews = [], refetch: refreshReviews, isError: reviewsFailed, error: reviewsError } = useQuery({
    queryKey: ['sync-reviews', syncState],
    queryFn: () => syncReviews(session),
  });
  const { data: drafts = [], refetch: refreshDrafts, isError: draftsFailed, error: draftsError } = useQuery({
    queryKey: ['recovered-drafts', syncState],
    queryFn: () => loadRecoveredDrafts(session),
  });
  useFocusEffect(useCallback(() => {
    void refreshReviews();
    void refreshDrafts();
  }, [refreshReviews, refreshDrafts]));

  function hasSavedActiveWorkout() {
    const training = useTrainingStore.getState();
    return useSessionStore.getState().session === session && isCurrentMobileSession(session)
      && training.session === session && training.ready && training.localSaveState === 'saved'
      && training.activeWorkout?.status === 'ACTIVE';
  }

  async function start() {
    try {
      await startWorkout();
      if (hasSavedActiveWorkout()) router.push('/train');
    } catch (error) {
      if (useSessionStore.getState().session === session && isCurrentMobileSession(session)) {
        setResolutionError(error instanceof Error ? error.message : 'No se pudo iniciar la sesión.');
      }
    }
  }

  async function keepDraft(review: SyncReview) {
    try {
      setResolutionError(null);
      await keepReviewAsDraft(session, review.workoutClientId);
      await initializeTraining(session);
      await refreshReviews();
      await refreshDrafts();
    } catch (error) {
      setResolutionError(error instanceof Error ? error.message : 'No se pudo conservar el borrador.');
    }
  }

  async function continueServer(review: SyncReview) {
    try {
      setResolutionError(null);
      await continueServerWorkout(session, review, (server) => adoptWorkoutWithRefresh(server.id, session));
      await initializeTraining(session);
      await refreshReviews();
    } catch (error) {
      setResolutionError(error instanceof Error ? error.message : 'No se pudo recuperar la sesión.');
    }
  }

  return (
    <Screen>
      <Text style={textStyles.title}>Hola, {user?.name ?? 'atleta'}</Text>
      <Text style={textStyles.muted}>Tu entrenamiento y tus series quedan disponibles incluso sin conexión.</Text>
      {offline ? <Text accessibilityLiveRegion="polite" style={textStyles.muted}>Modo local: puedes entrenar sin conexión. Verificaremos la sesión al reconectar.</Text> : null}
      <SyncStatus state={syncState} localSaveState={localSaveState} />
      {trainingError ? <Text accessibilityRole="alert" style={textStyles.error}>{trainingError}</Text> : null}
      {resolutionError ? <Text accessibilityRole="alert" style={textStyles.error}>{resolutionError}</Text> : null}
      {draftsFailed ? (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="alert" style={textStyles.error}>
            {draftsError instanceof Error ? draftsError.message : 'No se pudieron leer los borradores locales. Los datos se conservan.'}
          </Text>
          <PrimaryButton onPress={() => void refreshDrafts()}>Reintentar borradores locales</PrimaryButton>
        </View>
      ) : null}
      {reviewsFailed ? (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="alert" style={textStyles.error}>
            {reviewsError instanceof Error ? reviewsError.message : 'No se pudieron leer los conflictos locales. Los datos se conservan.'}
          </Text>
          <PrimaryButton onPress={() => void refreshReviews()}>Reintentar conflictos locales</PrimaryButton>
        </View>
      ) : null}
      {(reviewsFailed ? [] : reviews).map((review) => (
        <View key={review.workoutClientId} style={{ backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 18 }}>
          <Text style={textStyles.heading}>{review.errorCode === 'LOCAL_SYNC_PAYLOAD_INVALID'
            ? 'Datos locales requieren revisión' : 'Conflicto de sincronización'}</Text>
          <Text style={textStyles.body}>{review.workoutName}</Text>
          <Text style={textStyles.muted}>{review.errorCode === 'LOCAL_SYNC_PAYLOAD_INVALID'
            ? 'Un lote guardado contiene datos inválidos. Los datos locales se conservan; no se enviará hasta revisarlo.'
            : 'Hay otra versión en el servidor. EVRY no mezclará ambas automáticamente.'}</Text>
          {review.serverVersion ? (
            <PrimaryButton onPress={() => void continueServer(review)}>Continuar versión del servidor</PrimaryButton>
          ) : null}
          <PrimaryButton onPress={() => void keepDraft(review)}>Conservar local como borrador</PrimaryButton>
        </View>
      ))}
      {(draftsFailed ? [] : drafts).map((draft) => (
        <View key={draft.clientId} style={{ backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 18 }}>
          <Text style={textStyles.heading}>{draft.name}</Text>
          <Text style={textStyles.muted}>Borrador local recuperado · {draft.sets.length} series conservadas.</Text>
          <PrimaryButton disabled={Boolean(activeWorkout)} onPress={() => {
            void recoverDraft(draft).then(async () => {
              if (!hasSavedActiveWorkout()) return;
              await refreshDrafts();
              if (hasSavedActiveWorkout()) router.push('/train');
            }).catch((error: unknown) => {
              if (useSessionStore.getState().session === session && isCurrentMobileSession(session)) {
                setResolutionError(error instanceof Error ? error.message : 'No se pudo recuperar el borrador.');
              }
            });
          }}>Recuperar como nueva sesión</PrimaryButton>
        </View>
      ))}
      <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, gap: 12, padding: 20 }}>
        <Text style={textStyles.heading}>{activeWorkout ? activeWorkout.name : '¿Lista para entrenar?'}</Text>
        <Text style={textStyles.muted}>
          {activeWorkout ? `${activeWorkout.sets.length} series${localSaveState === 'saving' ? ' · guardando cambios…' : localSaveState === 'failed' ? ' · último cambio no guardado' : ' guardadas localmente'}` : 'Inicia una sesión libre y registra tus series.'}
        </Text>
        <PrimaryButton disabled={!trainingReady || localSaveState === 'saving'} onPress={activeWorkout ? () => router.push('/train') : start}>
          {activeWorkout ? 'Continuar sesión' : 'Iniciar sesión'}
        </PrimaryButton>
      </View>
    </Screen>
  );
}
