import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import {
  continueServerWorkout,
  keepReviewAsDraft,
  loadRecoveredDrafts,
  syncReviews,
  type SyncReview,
} from '@/src/db/database';
import { useSessionStore } from '@/src/auth/session-store';
import { useTrainingStore } from '@/src/training/training-store';
import {
  Avatar, Badge, Card, PrimaryButton, Screen, SectionHeader, SyncStatus, textStyles,
} from '@/src/ui/components';
import { AppIcon } from '@/src/ui/icon';
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

  const visibleReviews = reviewsFailed ? [] : reviews;
  const visibleDrafts = draftsFailed ? [] : drafts;
  const hasPending = visibleReviews.length > 0 || visibleDrafts.length > 0;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>HOY</Text>
          <Text accessibilityRole="header" style={styles.greeting}>Hola, {user?.name ?? 'atleta'}</Text>
          <Text style={textStyles.muted}>Tu entrenamiento y tus series quedan disponibles incluso sin conexión.</Text>
        </View>
        <Avatar name={user?.name ?? 'EVRY'} size={48} />
      </View>

      <View style={styles.statusRow}>
        <SyncStatus state={syncState} localSaveState={localSaveState} />
        {offline ? <Badge label="Modo local" tone="warning" /> : null}
      </View>

      {offline ? (
        <Card style={styles.notice} tone="warning">
          <View style={styles.noticeRow}>
            <AppIcon color={theme.colors.warning} name="cloud_off" size={18} />
            <Text accessibilityLiveRegion="polite" style={styles.noticeText}>
              Modo local: puedes entrenar sin conexión. Verificaremos la sesión al reconectar.
            </Text>
          </View>
        </Card>
      ) : null}

      {trainingError ? <Text accessibilityRole="alert" style={textStyles.error}>{trainingError}</Text> : null}
      {resolutionError ? <Text accessibilityRole="alert" style={textStyles.error}>{resolutionError}</Text> : null}

      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <AppIcon color={theme.colors.primary} name={activeWorkout ? 'bolt' : 'fitness_center'} size={24} />
          </View>
          <Text style={styles.heroEyebrow}>{activeWorkout ? 'SESIÓN EN CURSO' : 'SESIÓN LIBRE'}</Text>
        </View>
        <Text style={styles.heroTitle}>{activeWorkout ? activeWorkout.name : '¿Lista para entrenar?'}</Text>
        <Text style={textStyles.muted}>
          {activeWorkout ? `${activeWorkout.sets.length} series${localSaveState === 'saving' ? ' · guardando cambios…' : localSaveState === 'failed' ? ' · último cambio no guardado' : ' guardadas localmente'}` : 'Inicia una sesión libre y registra tus series.'}
        </Text>
        <PrimaryButton
          disabled={!trainingReady || localSaveState === 'saving'}
          icon={<AppIcon color={theme.colors.onPrimary} name={activeWorkout ? 'play_arrow' : 'add'} size={20} />}
          onPress={activeWorkout ? () => router.push('/train') : start}
        >
          {activeWorkout ? 'Continuar sesión' : 'Iniciar sesión'}
        </PrimaryButton>
      </Card>

      {hasPending ? (
        <SectionHeader
          detail="EVRY nunca mezcla versiones automáticamente."
          title="Pendientes de sincronización"
        />
      ) : null}

      {draftsFailed ? (
        <Card style={styles.problem} tone="error">
          <Text accessibilityRole="alert" style={textStyles.error}>
            {draftsError instanceof Error ? draftsError.message : 'No se pudieron leer los borradores locales. Los datos se conservan.'}
          </Text>
          <PrimaryButton onPress={() => void refreshDrafts()} variant="secondary">Reintentar borradores locales</PrimaryButton>
        </Card>
      ) : null}
      {reviewsFailed ? (
        <Card style={styles.problem} tone="error">
          <Text accessibilityRole="alert" style={textStyles.error}>
            {reviewsError instanceof Error ? reviewsError.message : 'No se pudieron leer los conflictos locales. Los datos se conservan.'}
          </Text>
          <PrimaryButton onPress={() => void refreshReviews()} variant="secondary">Reintentar conflictos locales</PrimaryButton>
        </Card>
      ) : null}

      {visibleReviews.map((review) => (
        <Card key={review.workoutClientId} style={styles.pending} tone="warning">
          <View style={styles.pendingHeader}>
            <AppIcon color={theme.colors.warning} name="warning" size={20} />
            <Text style={styles.pendingTitle}>{review.errorCode === 'LOCAL_SYNC_PAYLOAD_INVALID'
              ? 'Datos locales requieren revisión' : 'Conflicto de sincronización'}</Text>
          </View>
          <Text style={textStyles.body}>{review.workoutName}</Text>
          <Text style={textStyles.muted}>{review.errorCode === 'LOCAL_SYNC_PAYLOAD_INVALID'
            ? 'Un lote guardado contiene datos inválidos. Los datos locales se conservan; no se enviará hasta revisarlo.'
            : 'Hay otra versión en el servidor. EVRY no mezclará ambas automáticamente.'}</Text>
          {review.serverVersion ? (
            <PrimaryButton onPress={() => void continueServer(review)} variant="secondary">Continuar versión del servidor</PrimaryButton>
          ) : null}
          <PrimaryButton onPress={() => void keepDraft(review)}>Conservar local como borrador</PrimaryButton>
        </Card>
      ))}

      {visibleDrafts.map((draft) => (
        <Card key={draft.clientId} style={styles.pending}>
          <View style={styles.pendingHeader}>
            <AppIcon color={theme.colors.primary} name="history" size={20} />
            <Text style={styles.pendingTitle}>{draft.name}</Text>
          </View>
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
          }} variant="secondary">Recuperar como nueva sesión</PrimaryButton>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.md, paddingBottom: theme.spacing.xs },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  greeting: { color: theme.colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.9 },
  statusRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  notice: { padding: theme.spacing.md },
  noticeRow: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.sm },
  noticeText: { color: theme.colors.warning, flex: 1, fontSize: 13, lineHeight: 19 },
  hero: { gap: theme.spacing.md, padding: theme.spacing.lg },
  heroTop: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  heroEyebrow: { color: theme.colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.6, lineHeight: 30 },
  problem: { gap: theme.spacing.sm },
  pending: { gap: theme.spacing.sm },
  pendingHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  pendingTitle: { color: theme.colors.text, flex: 1, fontSize: 16, fontWeight: '700' },
});
