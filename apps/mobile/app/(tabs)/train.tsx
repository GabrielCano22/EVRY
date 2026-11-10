import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_BASE_URL, isCurrentMobileSession } from '@/src/api/client';
import { useSessionStore } from '@/src/auth/session-store';
import { loadExercises, loadRoutines } from '@/src/catalog/catalog';
import { CachedThumbnail } from '@/src/catalog/CachedThumbnail';
import { mediaUrl } from '@/src/catalog/media-url';
import { mobileThumbnailCache } from '@/src/catalog/thumbnail-files';
import { muscleGroupLabel } from '@/src/catalog/muscle-labels';
import { RoutineManager } from '@/src/routines/RoutineManager';
import { useTrainingStore } from '@/src/training/training-store';
import { TrainingRecommendation } from '@/src/training/TrainingRecommendation';
import { RestTimer } from '@/src/training/RestTimer';
import { summarizeRecordedMuscles } from '@/src/training/muscle-summary';
import { BodyMuscleMap } from '@/src/progress/body-muscle-map';
import { cachedExerciseGroups } from '@/src/db/database';
import { PrimaryButton, Screen, SyncStatus, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function TrainScreen() {
  const session = useSessionStore((state) => state.session)!;
  const sex = useSessionStore((state) => state.user?.biologicalSex);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [playingGif, setPlayingGif] = useState(false);
  const exercisesQuery = useQuery({
    queryKey: ['exercises', search.trim(), page],
    queryFn: ({ signal }) => loadExercises(session, { search, page, signal }),
  });
  const exercises = exercisesQuery.data?.items ?? [];
  const routinesQuery = useQuery({ queryKey: ['routines'], queryFn: ({ signal }) => loadRoutines(session, signal) });
  function changePage(nextPage: number) {
    setPage(nextPage);
    setSelectedExerciseId(null);
    setPlayingGif(false);
  }
  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
    setSelectedExerciseId(null);
    setPlayingGif(false);
  }
  const workout = useTrainingStore((state) => state.activeWorkout);
  const workoutExerciseIds = [...new Set(workout?.sets.map((set) => set.exerciseId) ?? [])].sort();
  const cachedGroups = useQuery({
    queryKey: ['workout-muscle-groups', session.userId, session.version, workoutExerciseIds, exercisesQuery.data?.updatedAt],
    queryFn: () => cachedExerciseGroups(session, workoutExerciseIds),
    enabled: Boolean(workout && workoutExerciseIds.length),
  });
  const syncState = useTrainingStore((state) => state.syncState);
  const localSaveState = useTrainingStore((state) => state.localSaveState);
  const error = useTrainingStore((state) => state.error);
  const startWorkout = useTrainingStore((state) => state.startWorkout);
  const addSet = useTrainingStore((state) => state.addSet);
  const updateSet = useTrainingStore((state) => state.updateSet);
  const deleteSet = useTrainingStore((state) => state.deleteSet);
  const cancelWorkout = useTrainingStore((state) => state.cancelWorkout);
  const finishWorkout = useTrainingStore((state) => state.finishWorkout);

  if (!workout) {
    return (
      <Screen>
        <Text style={textStyles.title}>Entrenar</Text>
        <SyncStatus state={syncState} localSaveState={localSaveState} />
        {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
        <Text style={textStyles.muted}>No hay una sesión activa.</Text>
        <PrimaryButton onPress={() => void startWorkout()}>Iniciar sesión libre</PrimaryButton>
        {routinesQuery.isLoading ? <Text style={textStyles.muted}>Cargando rutinas…</Text> : null}
        {routinesQuery.isError ? <Text accessibilityRole="alert" style={textStyles.error}>{routinesQuery.error.message}</Text> : null}
        {routinesQuery.data?.notice ? <Text style={textStyles.muted}>{routinesQuery.data.notice}</Text> : null}
        {routinesQuery.isError || routinesQuery.data?.stale ? (
          <PrimaryButton disabled={routinesQuery.isFetching} onPress={() => void routinesQuery.refetch()}>Reintentar rutinas</PrimaryButton>
        ) : null}
        {routinesQuery.isSuccess && routinesQuery.data.items.length === 0 ? (
          <Text style={textStyles.muted}>{routinesQuery.data.source === 'cache' ? 'No hay rutinas en la copia local.' : 'No tienes rutinas guardadas.'}</Text>
        ) : null}
        {routinesQuery.isSuccess ? <RoutineManager
          session={session}
          routines={routinesQuery.data.items}
          routinesStale={routinesQuery.data.stale}
          exercises={exercises}
          onStartRoutine={(routine) => void startWorkout(routine.name, routine.id)}
          catalogSearch={search}
          catalogPage={page}
          catalogHasMore={Boolean(exercisesQuery.data?.hasMore)}
          catalogLoading={exercisesQuery.isFetching}
          catalogError={exercisesQuery.isError ? exercisesQuery.error : null}
          catalogNotice={exercisesQuery.data?.notice ?? null}
          catalogSource={exercisesQuery.data?.source ?? null}
          catalogSuccess={exercisesQuery.isSuccess}
          onSearchChange={changeSearch}
          onChangePage={changePage}
          onRetryCatalog={() => void exercisesQuery.refetch()}
        /> : null}
      </Screen>
    );
  }

  const routine = routinesQuery.data?.items.find((item) => item.id === workout.routineId);
  const routineExercises = routine?.exercises.map((item) => ({ ...item.exercise, imageUrl: null, gifUrl: null })) ?? [];
  const muscleSummary = summarizeRecordedMuscles(workout.sets, [...(cachedGroups.data ?? []), ...routineExercises, ...exercises]);
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId)
    ?? routineExercises.find((exercise) => exercise.id === selectedExerciseId)
    ?? exercises[0];
  const previewUrl = selectedExercise
    ? mediaUrl(playingGif ? (selectedExercise.gifUrl ?? selectedExercise.gifPath) : (selectedExercise.imageUrl ?? selectedExercise.imagePath), API_BASE_URL)
    : null;
  return (
    <Screen>
      <Text style={textStyles.title}>{workout.name}</Text>
      {workout.status === 'COMPLETED' ? (
        <Text accessibilityLiveRegion="polite" style={textStyles.muted}>Finalizando sesión…</Text>
      ) : <SyncStatus state={syncState} localSaveState={localSaveState} />}
      {workout.sets.length > 0 ? (
        <View style={styles.exerciseCard}>
          <Text style={textStyles.heading}>Trabajo muscular</Text>
          <Text style={textStyles.muted}>Estimación según las series útiles y el grupo principal de cada ejercicio.</Text>
          {muscleSummary.groups.map((item) => (
            <Text key={item.muscleGroup} style={textStyles.body}>{muscleGroupLabel(item.muscleGroup)} · {item.workingSets} {item.workingSets === 1 ? 'serie' : 'series'}</Text>
          ))}
          {muscleSummary.unclassifiedSets > 0 ? <Text style={textStyles.muted}>Algunas series no se muestran porque su ejercicio no está disponible en el catálogo local.</Text> : null}
          {muscleSummary.groups.length === 0 && muscleSummary.unclassifiedSets === 0 ? <Text style={textStyles.muted}>Aún no hay series útiles registradas.</Text> : null}
        </View>
      ) : null}
      {muscleSummary.groups.length > 0 ? <><Text style={textStyles.heading}>Mapa de esta sesión</Text><BodyMuscleMap distribution={muscleSummary.groups} sex={sex} /></> : null}
      {routine && routine.exercises.length > 0 ? (
        <View style={styles.exerciseCard}>
          <Text style={textStyles.heading}>Ejercicios de la rutina</Text>
          <Text style={textStyles.muted}>Selecciona un ejercicio para registrar tus series.</Text>
          {routine.exercises.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar ${item.exercise.name} de la rutina`}
              onPress={() => { setSelectedExerciseId(item.exercise.id); setPlayingGif(false); }}
              style={[styles.exerciseOption, selectedExercise?.id === item.exercise.id && styles.exerciseOptionSelected]}
            >
              <Text style={[textStyles.body, { flex: 1 }]}>{item.exercise.name}</Text>
              <Text style={textStyles.muted}>{item.targetSets} series</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {exercisesQuery.isFetching ? <Text style={textStyles.muted}>Cargando catálogo…</Text> : null}
      {exercisesQuery.isError ? <Text accessibilityRole="alert" style={textStyles.error}>{exercisesQuery.error.message}</Text> : null}
      {exercisesQuery.data?.notice ? <Text style={textStyles.muted}>{exercisesQuery.data.notice}</Text> : null}
      {exercisesQuery.isError || exercisesQuery.data?.stale ? (
        <PrimaryButton disabled={exercisesQuery.isFetching} onPress={() => void exercisesQuery.refetch()}>Reintentar catálogo</PrimaryButton>
      ) : null}
      <TextInput
        accessibilityLabel="Buscar ejercicio"
        autoCapitalize="none"
        maxLength={80}
        onChangeText={changeSearch}
        placeholder="Buscar ejercicio"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.searchInput}
        value={search}
      />
      {exercisesQuery.isSuccess && exercises.length === 0 ? (
        <Text style={textStyles.muted}>{exercisesQuery.data.source === 'cache' ? 'No hay coincidencias en la copia local. Solo incluye ejercicios consultados anteriormente.' : 'No hay ejercicios que coincidan con la búsqueda.'}</Text>
      ) : null}
      <View accessibilityRole="list" style={styles.exerciseList}>
        {exercises.map((exercise) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver ${exercise.name}`}
            key={exercise.id}
            onPress={() => {
              setSelectedExerciseId(exercise.id);
              setPlayingGif(false);
            }}
            style={[
              styles.exerciseOption,
              selectedExercise?.id === exercise.id && styles.exerciseOptionSelected,
            ]}
          >
            {exercise.imageUrl || exercise.imagePath ? <CachedThumbnail
              cache={mobileThumbnailCache}
              label={`Miniatura de ${exercise.name}`}
              owner={session}
              url={mediaUrl(exercise.imageUrl ?? exercise.imagePath, API_BASE_URL)!}
              style={styles.thumbnail}
            /> : null}
            <Text style={[textStyles.body, { flex: 1 }]}>{exercise.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text accessibilityLiveRegion="polite" style={textStyles.muted}>
        Página {page}{exercisesQuery.data ? ` · ${exercisesQuery.data.total} coincidencias${exercisesQuery.data.source === 'cache' ? ' en la copia local' : ''}` : ''}
      </Text>
      <View style={styles.row}>
        <PrimaryButton accessibilityLabel="Página anterior" disabled={page === 1 || exercisesQuery.isFetching} onPress={() => changePage(page - 1)}>Anterior</PrimaryButton>
        <PrimaryButton accessibilityLabel="Página siguiente" disabled={!exercisesQuery.data?.hasMore || page >= 10000 || exercisesQuery.isFetching} onPress={() => changePage(page + 1)}>Siguiente</PrimaryButton>
      </View>
      {selectedExercise ? (
        <View style={styles.exerciseCard}>
          <Text style={textStyles.heading}>{selectedExercise.name}</Text>
          {previewUrl ? playingGif
            ? <Image accessibilityLabel={`Demostración de ${selectedExercise.name}`} cachePolicy="none" contentFit="contain" source={{ uri: previewUrl }} style={styles.exerciseMedia} />
            : <CachedThumbnail cache={mobileThumbnailCache} label={`Demostración de ${selectedExercise.name}`} owner={session} url={previewUrl} style={styles.exerciseMedia} />
          : null}
          <Text style={textStyles.muted}>El catálogo muestra miniaturas; los GIF se reproducen solo bajo demanda.</Text>
          {selectedExercise.attribution ? <Text style={textStyles.muted}>{selectedExercise.attribution}</Text> : null}
          {workout.status === 'ACTIVE' ? <TrainingRecommendation
            key={JSON.stringify([session.serverUrl, session.userId, session.version, workout.clientId, selectedExercise.id])}
            session={session} exerciseId={selectedExercise.id} workoutId={workout.clientId}
          /> : null}
          {selectedExercise.gifUrl || selectedExercise.gifPath ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPlayingGif((value) => !value)}
            >
              <Text style={textStyles.body}>{playingGif ? 'Detener demostración' : 'Reproducir GIF'}</Text>
            </Pressable>
          ) : null}
          {workout.status === 'ACTIVE' ? <PrimaryButton
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              void addSet(selectedExercise.id);
            }}
          >
            Agregar serie
          </PrimaryButton> : null}
        </View>
      ) : null}
      {workout.sets.map((set, index) => (
        <View key={set.clientId} style={styles.setCard}>
          <Text style={textStyles.heading}>Serie {index + 1}</Text>
          <View style={styles.row}>
            <NumberField
              label="Peso kg"
              value={set.weightKg}
              maximum={2000}
              editable={workout.status === 'ACTIVE'}
              onChange={(weightKg) => void updateSet(set.clientId, { weightKg })}
            />
            <NumberField
              label="Repeticiones"
              value={set.reps}
              maximum={1000}
              integer
              editable={workout.status === 'ACTIVE'}
              onChange={(reps) => void updateSet(set.clientId, { reps })}
            />
          </View>
          <View style={styles.row}>
            <NumberField label="Duración segundos" value={set.durationS} maximum={86400} integer
              editable={workout.status === 'ACTIVE'} onChange={durationS => void updateSet(set.clientId, { durationS })} />
            <NumberField label="RPE" value={set.rpe} minimum={1} maximum={10} integer
              editable={workout.status === 'ACTIVE'} onChange={rpe => void updateSet(set.clientId, { rpe })} />
          </View>
          <Pressable accessibilityRole="checkbox" accessibilityLabel="Serie de calentamiento"
            style={{ minHeight: 44, justifyContent: 'center' }}
            accessibilityState={{ checked: set.isWarmup, disabled: workout.status !== 'ACTIVE' }}
            disabled={workout.status !== 'ACTIVE'} onPress={() => void updateSet(set.clientId, { isWarmup: !set.isWarmup })}>
            <Text style={textStyles.body}>{set.isWarmup ? '✓ ' : ''}Serie de calentamiento</Text>
          </Pressable>
          <Text style={textStyles.muted}>Técnica</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Técnica" style={{ gap: 8 }}>
            {([{ value: null, label: 'Técnica sin registrar' }, { value: true, label: 'Técnica estable' },
              { value: false, label: 'Técnica inestable' }] as const).map(option => (
              <Pressable key={option.label} accessibilityRole="radio" accessibilityLabel={option.label}
                style={{ minHeight: 44, justifyContent: 'center' }}
                accessibilityState={{ checked: set.techniqueStable === option.value, disabled: workout.status !== 'ACTIVE' }}
                disabled={workout.status !== 'ACTIVE'}
                onPress={() => void updateSet(set.clientId, { techniqueStable: option.value })}>
                <Text style={textStyles.body}>{set.techniqueStable === option.value ? '✓ ' : ''}{option.label}</Text>
              </Pressable>
            ))}
          </View>
          {workout.status === 'ACTIVE' ? <Pressable
            accessibilityRole="button"
            onPress={() => void deleteSet(set.clientId)}
          >
            <Text style={textStyles.error}>Eliminar serie</Text>
          </Pressable> : null}
        </View>
      ))}
      {workout.status === 'ACTIVE' && session ? <RestTimer
        key={JSON.stringify([session.serverUrl, session.userId, session.version, workout.clientId])}
        session={session} workoutId={workout.clientId}
      /> : null}
      {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
      <Pressable
        accessibilityLabel="Cancelar sesión"
        accessibilityRole="button"
        disabled={workout.status !== 'ACTIVE'}
        onPress={() => Alert.alert(
          'Cancelar sesión',
          'La sesión se conservará como cancelada y se sincronizará cuando haya conexión.',
          [
            { text: 'Seguir entrenando', style: 'cancel' },
            {
              text: 'Cancelar sesión',
              style: 'destructive',
              onPress: () => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
                void cancelWorkout().catch(() => undefined);
              },
            },
          ],
        )}
        style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
      >
        <Text style={textStyles.error}>{workout.status === 'CANCELLED' ? 'Cancelando sesión…' : 'Cancelar sesión'}</Text>
      </Pressable>
      <PrimaryButton
        disabled={workout.status !== 'ACTIVE' || workout.sets.length === 0}
        onPress={async () => {
          if (useTrainingStore.getState().activeWorkout !== workout || workout.status !== 'ACTIVE') return;
          try {
            await finishWorkout();
            if (isCurrentMobileSession(session)) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
            }
          } catch {
            // Storage failures are displayed by the training store; haptics are optional.
          }
        }}
      >
        Finalizar y sincronizar
      </PrimaryButton>
    </Screen>
  );
}

function NumberField({ label, value, editable, onChange, minimum = 0, maximum, integer = false }: {
  label: string;
  value: number | null;
  editable: boolean;
  onChange: (value: number | null) => void;
  minimum?: number;
  maximum: number;
  integer?: boolean;
}) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    setDraft(String(value ?? ''));
    setError(null);
  }

  function change(text: string) {
    setDraft(text);
    const normalized = text.trim().replace(',', '.');
    const parsed = normalized === '' ? null : Number(normalized);
    if (parsed !== null && (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)
      || !Number.isFinite(parsed) || parsed < minimum || parsed > maximum
      || (integer && !Number.isInteger(parsed)))) {
      setError(`${label}: usa ${integer ? 'un entero' : 'un número'} entre ${minimum} y ${maximum}, o deja el campo vacío.`);
      return;
    }
    setError(null);
    onChange(parsed);
  }
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={textStyles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        inputMode={integer ? 'numeric' : 'decimal'}
        maxLength={12}
        accessibilityHint={error ?? undefined}
        onChangeText={change}
        style={styles.input}
        value={draft}
      />
      {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  exerciseCard: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 12, padding: 18 },
  exerciseList: { gap: 8 },
  exerciseMedia: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 10, height: 220, width: '100%' },
  exerciseOption: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbnail: { width: 48, height: 48, borderRadius: 6, backgroundColor: theme.colors.surfaceHigh },
  exerciseOptionSelected: { borderColor: theme.colors.primary, borderWidth: 2 },
  searchInput: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: 8,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  setCard: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 12, padding: 18 },
  row: { flexDirection: 'row', gap: 12 },
  input: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: 8,
    color: theme.colors.text,
    fontSize: 18,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: theme.colors.error,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelButtonPressed: { opacity: 0.75 },
});
