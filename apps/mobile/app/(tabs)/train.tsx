import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  SET_TYPE_LABELS, isSecondarySetType, restSecondsForExercise, restSecondsForSetType,
  setTypeOf, type SetType,
} from '@evry/domain';
import { API_BASE_URL, isCurrentMobileSession } from '@/src/api/client';
import { useSessionStore } from '@/src/auth/session-store';
import { loadExercises, loadRoutines, type Exercise } from '@/src/catalog/catalog';
import { mediaUrl } from '@/src/catalog/media-url';
import { muscleGroupLabel } from '@/src/catalog/muscle-labels';
import { RoutineManager } from '@/src/routines/RoutineManager';
import { useTrainingStore } from '@/src/training/training-store';
import { useRestPreferencesStore } from '@/src/training/rest-preferences-store';
import { useExerciseInsights } from '@/src/training/use-exercise-insights';
import { ExerciseCard, type ExerciseCardModel } from '@/src/training/ExerciseCard';
import { ExercisePicker } from '@/src/training/ExercisePicker';
import { RestTimer, type RestStartRequest } from '@/src/training/RestTimer';
import { SetTypeSheet } from '@/src/training/SetTypeSheet';
import { SetOptionsSheet } from '@/src/training/SetOptionsSheet';
import { RestSecondsSheet } from '@/src/training/RestSecondsSheet';
import { summarizeRecordedMuscles } from '@/src/training/muscle-summary';
import { formatDuration } from '@/src/training/format-rest';
import { BodyMuscleMap } from '@/src/progress/body-muscle-map';
import { cachedExerciseSummaries } from '@/src/db/database';
import { BottomSheet } from '@/src/ui/bottom-sheet';
import { PrimaryButton, Screen, SyncStatus, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';
import type { LocalWorkoutSet } from '@/src/training/workout-domain';

type ExerciseInfo = {
  id: string;
  name: string;
  muscleGroup: Exercise['muscleGroup'] | null;
  category: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  targetWeightKg?: number | null;
  targetReps?: number | null;
};

export default function TrainScreen() {
  const session = useSessionStore((state) => state.session)!;
  const sex = useSessionStore((state) => state.user?.biologicalSex);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const workout = useTrainingStore((state) => state.activeWorkout);
  const syncState = useTrainingStore((state) => state.syncState);
  const localSaveState = useTrainingStore((state) => state.localSaveState);
  const error = useTrainingStore((state) => state.error);
  const startWorkout = useTrainingStore((state) => state.startWorkout);
  const addSet = useTrainingStore((state) => state.addSet);
  const updateSet = useTrainingStore((state) => state.updateSet);
  const setSetCompleted = useTrainingStore((state) => state.setSetCompleted);
  const changeSetType = useTrainingStore((state) => state.changeSetType);
  const deleteSet = useTrainingStore((state) => state.deleteSet);
  const renameWorkout = useTrainingStore((state) => state.renameWorkout);
  const cancelWorkout = useTrainingStore((state) => state.cancelWorkout);
  const finishWorkout = useTrainingStore((state) => state.finishWorkout);

  const exercisesQuery = useQuery({
    enabled: !workout,
    queryKey: ['exercises', session.userId, session.version, search.trim(), page],
    queryFn: ({ signal }) => loadExercises(session, { search, page, signal }),
  });
  const exercises = useMemo(() => exercisesQuery.data?.items ?? [], [exercisesQuery.data]);
  const routinesQuery = useQuery({
    queryKey: ['routines', session.userId, session.version],
    queryFn: ({ signal }) => loadRoutines(session, signal),
  });

  const restPreferences = useRestPreferencesStore((state) => state.preferences);
  const loadRestPreferences = useRestPreferencesStore((state) => state.load);
  const setRestForExercise = useRestPreferencesStore((state) => state.setExercise);
  const resetRestForExercise = useRestPreferencesStore((state) => state.resetExercise);
  const adjustRestForExercise = useRestPreferencesStore((state) => state.adjustExercise);
  const restSaving = useRestPreferencesStore((state) => state.saving);
  const restError = useRestPreferencesStore((state) => state.error);
  useEffect(() => { void loadRestPreferences(session); }, [session, loadRestPreferences]);

  const [pickedExercises, setPickedExercises] = useState<Record<string, Exercise>>({});
  const [pickerVisible, setPickerVisible] = useState(false);
  const [typeSet, setTypeSet] = useState<LocalWorkoutSet | null>(null);
  const [optionsSet, setOptionsSet] = useState<{ set: LocalWorkoutSet; ordinal: string } | null>(null);
  const [restExerciseId, setRestExerciseId] = useState<string | null>(null);
  const [exerciseOptionsId, setExerciseOptionsId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [restRequest, setRestRequest] = useState<RestStartRequest | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [now, setNow] = useState(Date.now);
  const restSequence = useRef(0);

  useEffect(() => {
    if (!workout || workout.status !== 'ACTIVE') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [workout]);

  const routine = routinesQuery.data?.items.find((item) => item.id === workout?.routineId);
  const setExerciseIds = [...new Set(workout?.sets.map((set) => set.exerciseId) ?? [])];
  const routineExerciseIds = routine?.exercises.map((item) => item.exerciseId) ?? [];
  // A routine defines the order; without one, the order is the first appearance
  // of each exercise in the session. Every id must be listed exactly once.
  const primaryExerciseIds = routineExerciseIds.length > 0 ? routineExerciseIds : setExerciseIds;
  const exerciseIds = [
    ...primaryExerciseIds,
    ...setExerciseIds.filter((id) => !primaryExerciseIds.includes(id)),
    ...Object.keys(pickedExercises).filter((id) => !primaryExerciseIds.includes(id) && !setExerciseIds.includes(id)),
  ];
  const summariesQuery = useQuery({
    enabled: Boolean(workout) && setExerciseIds.length > 0,
    queryKey: ['workout-exercises', session.userId, session.version, setExerciseIds],
    queryFn: () => cachedExerciseSummaries(session, setExerciseIds),
  });
  const insights = useExerciseInsights(session, workout ? exerciseIds : []);
  const exerciseKey = exerciseIds.join('|');
  const info = useMemo(() => {
    const map = new Map<string, ExerciseInfo>();
    for (const summary of summariesQuery.data ?? []) {
      map.set(summary.id, {
        id: summary.id,
        name: summary.name,
        muscleGroup: summary.muscleGroup as Exercise['muscleGroup'] | null,
        category: summary.category,
        imageUrl: summary.imageUrl,
        imagePath: summary.imagePath,
      });
    }
    for (const item of routine?.exercises ?? []) {
      map.set(item.exerciseId, {
        ...(map.get(item.exerciseId) ?? {}),
        id: item.exerciseId,
        name: item.exercise.name,
        muscleGroup: item.exercise.muscleGroup,
        category: item.exercise.category,
        imageUrl: null,
        imagePath: item.exercise.imagePath,
        targetWeightKg: item.targetWeightKg,
        targetReps: item.targetReps,
      });
    }
    for (const exercise of exercises) {
      map.set(exercise.id, {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        category: exercise.category,
        imageUrl: exercise.imageUrl,
        imagePath: exercise.imagePath,
      });
    }
    for (const exercise of Object.values(pickedExercises)) {
      map.set(exercise.id, {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        category: exercise.category,
        imageUrl: exercise.imageUrl,
        imagePath: exercise.imagePath,
      });
    }
    for (const id of exerciseKey ? exerciseKey.split('|') : []) {
      if (!map.has(id)) map.set(id, { id, name: 'Ejercicio sin catálogo', muscleGroup: null, category: null, imageUrl: null, imagePath: null });
    }
    return map;
  }, [summariesQuery.data, routine, exercises, pickedExercises, exerciseKey]);

  if (!workout) {
    function changePage(nextPage: number) { setPage(nextPage); }
    function changeSearch(value: string) { setSearch(value); setPage(1); }
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
          catalogError={exercisesQuery.isError ? exercisesQuery.error : null}
          catalogHasMore={Boolean(exercisesQuery.data?.hasMore)}
          catalogLoading={exercisesQuery.isFetching}
          catalogNotice={exercisesQuery.data?.notice ?? null}
          catalogPage={page}
          catalogSearch={search}
          catalogSource={exercisesQuery.data?.source ?? null}
          catalogSuccess={exercisesQuery.isSuccess}
          exercises={exercises}
          onChangePage={changePage}
          onRetryCatalog={() => void exercisesQuery.refetch()}
          onSearchChange={changeSearch}
          onStartRoutine={(value) => void startWorkout(value.name, value.id)}
          routines={routinesQuery.data.items}
          routinesStale={routinesQuery.data.stale}
          session={session}
        /> : null}
      </Screen>
    );
  }

  const active = workout.status === 'ACTIVE';
  const elapsedMs = Math.max(0, (workout.endedAt ? new Date(workout.endedAt).getTime() : now) - new Date(workout.startedAt).getTime());
  const completedSets = workout.sets.filter((set) => set.completedAt !== null
    && setTypeOf(set) !== 'WARMUP' && ((set.reps ?? 0) > 0 || (set.durationS ?? 0) > 0));
  const volumeKg = completedSets.reduce((total, set) => total + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
  const pendingSets = workout.sets.filter((set) => set.completedAt === null
    && ((set.reps ?? 0) > 0 || (set.durationS ?? 0) > 0)).length;
  const muscleSummary = summarizeRecordedMuscles(
    workout.sets,
    [...info.values()].filter((item): item is ExerciseInfo & { muscleGroup: Exercise['muscleGroup'] } => item.muscleGroup !== null)
      .map((item) => ({ id: item.id, muscleGroup: item.muscleGroup })),
  );
  const version = (set: LocalWorkoutSet) => {
    const sets = workout.sets.filter((item) => item.exerciseId === set.exerciseId).sort((a, b) => a.order - b.order);
    let working = 0;
    for (const item of sets) {
      if (setTypeOf(item) !== 'WARMUP') working += 1;
      if (item.clientId === set.clientId) return setTypeOf(item) === 'WARMUP' ? 'W' : String(working);
    }
    return '1';
  };

  function baseRest(exerciseId: string): number {
    return restSecondsForExercise(restPreferences, exerciseId);
  }

  async function toggleSet(set: LocalWorkoutSet) {
    const completing = set.completedAt === null;
    if (completing) void Haptics.selectionAsync().catch(() => undefined);
    await setSetCompleted(set.clientId, completing);
    if (!completing) return;
    const type = setTypeOf(set);
    const seconds = restSecondsForSetType(baseRest(set.exerciseId), type);
    restSequence.current += 1;
    setRestRequest({
      key: `${set.clientId}:${restSequence.current}`,
      seconds,
      label: isSecondarySetType(type) ? `${SET_TYPE_LABELS[type]} · descanso corto` : null,
      exerciseId: set.exerciseId,
    });
  }

  async function addExerciseSet(exerciseId: string) {
    const targets = info.get(exerciseId);
    await addSet(exerciseId, {
      weightKg: targets?.targetWeightKg ?? undefined,
      reps: targets?.targetReps ?? undefined,
    });
    void Haptics.selectionAsync().catch(() => undefined);
  }

  async function addFromPicker(exercise: Exercise) {
    setPickedExercises((current) => ({ ...current, [exercise.id]: exercise }));
    setPickerVisible(false);
    await addSet(exercise.id);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  async function removeExercise(exerciseId: string) {
    const sets = workout!.sets.filter((set) => set.exerciseId === exerciseId);
    for (const set of sets) await deleteSet(set.clientId);
    setExerciseOptionsId(null);
  }

  function confirmFinish() {
    if (!active) return;
    if (completedSets.length === 0) {
      Alert.alert('Marca una serie', 'Necesitas al menos una serie completada con repeticiones o duración para terminar la sesión.');
      return;
    }
    const finish = async () => {
      try {
        await finishWorkout();
        if (isCurrentMobileSession(session)) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        }
      } catch {
        // The training store keeps the session and publishes the storage error.
      }
    };
    if (pendingSets > 0) {
      Alert.alert(
        'Terminar sesión',
        `Hay ${pendingSets} ${pendingSets === 1 ? 'serie sin completar' : 'series sin completar'}. ¿Terminar de todos modos?`,
        [{ text: 'Seguir entrenando', style: 'cancel' }, { text: 'Terminar', style: 'destructive', onPress: () => void finish() }],
      );
      return;
    }
    void finish();
  }

  function confirmCancel() {
    Alert.alert(
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
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Cambiar nombre de la sesión"
          accessibilityRole="button"
          disabled={!active}
          onPress={() => { setNameDraft(workout.name); setRenaming(true); }}
          style={styles.headerIdentity}
        >
          <Text numberOfLines={1} style={styles.headerTitle}>{workout.name}</Text>
          <Text style={styles.headerMeta}>{formatDuration(elapsedMs)}{workout.status === 'COMPLETED' ? ' · finalizando…' : ''}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Terminar"
          accessibilityRole="button"
          accessibilityState={{ disabled: !active }}
          disabled={!active}
          onPress={confirmFinish}
          style={[styles.finish, !active && styles.disabled]}
        >
          <Text style={styles.finishText}>{workout.status === 'COMPLETED' ? 'Finalizando…' : 'Terminar'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.metrics}>
          <Metric label="Duración" value={formatDuration(elapsedMs)} />
          <Metric label="Volumen" value={`${volumeKg.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg`} />
          <Metric label="Series" value={String(completedSets.length)} />
        </View>

        {active ? <SyncStatus localSaveState={localSaveState} state={syncState} /> : null}

        {muscleSummary.groups.length > 0 || muscleSummary.unclassifiedSets > 0 ? <View style={styles.muscleCard}>
          <View style={styles.muscleHeader}>
            <Text style={textStyles.heading}>Trabajo muscular</Text>
            <Pressable accessibilityLabel="Ver mapa muscular de la sesión" accessibilityRole="button" onPress={() => setShowMap((value) => !value)} style={styles.mapToggle}>
              <Text style={styles.link}>{showMap ? 'Ocultar mapa' : 'Ver mapa'}</Text>
            </Pressable>
          </View>
          <Text style={textStyles.muted}>Estimación en vivo por series no-calentamiento registradas.</Text>
          {muscleSummary.groups.map((item) => (
            <Text key={item.muscleGroup} style={textStyles.body}>
              {muscleGroupLabel(item.muscleGroup)} · {item.workingSets} {item.workingSets === 1 ? 'serie' : 'series'}
            </Text>
          ))}
          {muscleSummary.unclassifiedSets > 0 ? <Text style={textStyles.muted}>Algunas series no se clasifican porque su ejercicio no está en la copia local del catálogo.</Text> : null}
          {showMap && muscleSummary.groups.length > 0 ? <BodyMuscleMap distribution={muscleSummary.groups} sex={sex} /> : null}
        </View> : null}

        {exerciseIds.map((exerciseId) => {
          const data = info.get(exerciseId)!;
          const sets = workout.sets.filter((set) => set.exerciseId === exerciseId).sort((a, b) => a.order - b.order);
          const rest = baseRest(exerciseId);
          const insight = insights[exerciseId];
          const model: ExerciseCardModel = {
            id: exerciseId,
            name: data.name,
            muscleGroup: data.muscleGroup ?? null,
            timed: data.category?.toUpperCase() === 'CARDIO' || data.muscleGroup === 'CARDIO',
            thumbnailUrl: mediaUrl(data.imageUrl ?? data.imagePath, API_BASE_URL),
            restSeconds: rest,
            shortRestSeconds: restSecondsForSetType(rest, 'WARMUP'),
            target: insight?.target ?? (data.targetWeightKg !== null || data.targetReps !== null ? {
              weightKg: data.targetWeightKg ?? null, reps: data.targetReps ?? null, action: 'HOLD',
            } : null),
            targetSavedAt: insight?.targetSavedAt ?? null,
            previous: insight?.previous ?? [],
            sets,
          };
          return <ExerciseCard
            compact={false}
            editable={active}
            exercise={model}
            key={exerciseId}
            onAddSet={() => void addExerciseSet(exerciseId)}
            onChangeSet={(set, changes) => void updateSet(set.clientId, changes)}
            onOpenExercise={() => setExerciseOptionsId(exerciseId)}
            onOpenRest={() => setRestExerciseId(exerciseId)}
            onOptionsSet={(set) => setOptionsSet({ set, ordinal: version(set) })}
            onToggleSet={(set) => void toggleSet(set)}
            onTypeSet={(set) => setTypeSet(set)}
            owner={session}
          />;
        })}

        {active ? <Pressable accessibilityLabel="Agregar ejercicio" accessibilityRole="button" onPress={() => setPickerVisible(true)} style={styles.addExercise}>
          <Text style={styles.addExerciseText}>+ Agregar ejercicio</Text>
        </Pressable> : null}

        {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}

        {active ? <Pressable accessibilityLabel="Cancelar sesión" accessibilityRole="button" onPress={confirmCancel} style={styles.cancel}>
          <Text style={textStyles.error}>Cancelar sesión</Text>
        </Pressable> : null}
        <View style={{ height: 96 }} />
      </ScrollView>

      {active ? <RestTimer
        key={JSON.stringify([session.serverUrl, session.userId, session.version, workout.clientId])}
        onAdjustExercise={(exerciseId, delta) => { void adjustRestForExercise(exerciseId, delta).catch(() => undefined); }}
        session={session}
        startRequest={restRequest}
        workoutId={workout.clientId}
      /> : null}

      <SetTypeSheet
        current={typeSet ? setTypeOf(typeSet) : 'NORMAL'}
        onClose={() => setTypeSet(null)}
        onSelect={(type: SetType) => {
          const target = typeSet;
          setTypeSet(null);
          if (target) void changeSetType(target.clientId, type).catch(() => undefined);
        }}
        visible={typeSet !== null}
      />

      <SetOptionsSheet
        onClose={() => setOptionsSet(null)}
        onDelete={() => {
          const target = optionsSet;
          setOptionsSet(null);
          if (target) void deleteSet(target.set.clientId).catch(() => undefined);
        }}
        onUpdate={(changes) => {
          const target = optionsSet;
          if (!target) return;
          setOptionsSet({ ...target, set: { ...target.set, ...changes } });
          void updateSet(target.set.clientId, changes).catch(() => undefined);
        }}
        ordinal={optionsSet?.ordinal ?? '1'}
        set={optionsSet?.set ?? null}
        visible={optionsSet !== null}
      />

      <RestSecondsSheet
        // Remount per exercise so the selector starts from that exercise's own
        // value instead of whatever the previous sheet left in its local draft.
        key={restExerciseId ?? 'closed'}
        defaultSeconds={restPreferences.defaultRestSeconds}
        error={restError}
        hasOverride={Boolean(restExerciseId && restPreferences.restSecondsByExerciseId[restExerciseId] !== undefined)}
        onClose={() => setRestExerciseId(null)}
        onSave={(seconds) => {
          const id = restExerciseId;
          setRestExerciseId(null);
          if (!id) return;
          void (seconds === null ? resetRestForExercise(id) : setRestForExercise(id, seconds)).catch(() => undefined);
        }}
        saving={restSaving}
        seconds={restExerciseId ? baseRest(restExerciseId) : restPreferences.defaultRestSeconds}
        title={restExerciseId ? `Descanso · ${info.get(restExerciseId)?.name ?? 'ejercicio'}` : 'Descanso'}
        visible={restExerciseId !== null}
      />

      <BottomSheet onClose={() => setExerciseOptionsId(null)} title={info.get(exerciseOptionsId ?? '')?.name ?? 'Ejercicio'} visible={exerciseOptionsId !== null}>
        <PrimaryButton onPress={() => { const id = exerciseOptionsId; setExerciseOptionsId(null); if (id) void addExerciseSet(id); }}>
          Agregar serie
        </PrimaryButton>
        <PrimaryButton
          disabled={!workout.sets.some((set) => set.exerciseId === exerciseOptionsId)}
          onPress={() => {
            const id = exerciseOptionsId;
            if (!id) return;
            Alert.alert('Eliminar ejercicio', 'Se quitarán sus series de esta sesión. Las series ya sincronizadas se eliminarán al reconectar.', [
              { text: 'Conservar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive', onPress: () => void removeExercise(id) },
            ]);
          }}
        >
          Eliminar de la sesión
        </PrimaryButton>
      </BottomSheet>

      <ExercisePicker
        onClose={() => setPickerVisible(false)}
        onPick={(exercise) => void addFromPicker(exercise)}
        session={session}
        visible={pickerVisible}
      />

      <BottomSheet
        footer={<PrimaryButton disabled={!active || nameDraft.trim().length === 0} onPress={() => {
          const value = nameDraft;
          setRenaming(false);
          void renameWorkout(value).catch(() => undefined);
        }}>Guardar nombre</PrimaryButton>}
        onClose={() => setRenaming(false)}
        title="Nombre de la sesión"
        visible={renaming}
      >
        <TextInput
          accessibilityLabel="Nombre de la sesión"
          maxLength={120}
          onChangeText={setNameDraft}
          placeholder="Nombre de la sesión"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.nameInput}
          value={nameDraft}
        />
      </BottomSheet>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: theme.colors.surfaceHigh,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  headerIdentity: { flex: 1, justifyContent: 'center', minHeight: 48 },
  headerTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  headerMeta: { color: theme.colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
  finish: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 92,
    paddingHorizontal: 14,
  },
  finishText: { color: theme.colors.onPrimary, fontSize: 15, fontWeight: '800' },
  content: { gap: theme.spacing.md, padding: theme.spacing.md },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { backgroundColor: theme.colors.surface, borderRadius: 10, flex: 1, gap: 2, padding: 10 },
  metricLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  metricValue: { color: theme.colors.text, fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '800' },
  muscleCard: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 6, padding: 12 },
  muscleHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  mapToggle: { justifyContent: 'center', minHeight: 44 },
  link: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  addExercise: {
    alignItems: 'center',
    borderColor: theme.colors.primary,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  addExerciseText: { color: theme.colors.primary, fontSize: 16, fontWeight: '700' },
  cancel: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  disabled: { opacity: 0.45 },
  nameInput: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: 10,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
});
