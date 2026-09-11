import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MobileSession } from '../api/client';
import type { Exercise } from '../catalog/catalog';
import { mediaUrl } from '../catalog/media-url';
import { PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';
import { createRoutine, deleteRoutine, updateRoutine, type CreateRoutineInput, type Routine, type UpdateRoutineInput } from './routines';

type PlanRow = { reps: string; weightKg: string };
type DraftExercise = { exercise: Exercise; targetSets: string; targetReps: string; targetWeightKg: string; notes: string; seriesPlan: PlanRow[] | null };
type RoutineDraft = { id: string | null; name: string; dayOfWeek: string; notes: string; exercises: DraftExercise[] };

export interface RoutineManagerProps {
  session: MobileSession;
  routines: Routine[];
  routinesStale: boolean;
  exercises: Exercise[];
  onStartRoutine: (routine: Routine) => void;
  catalogSearch: string;
  catalogPage: number;
  catalogHasMore: boolean;
  catalogLoading: boolean;
  catalogError: Error | null;
  catalogNotice: string | null;
  catalogSource: 'server' | 'cache' | null;
  catalogSuccess: boolean;
  onSearchChange: (value: string) => void;
  onChangePage: (page: number) => void;
  onRetryCatalog: () => void;
}

const emptyDraft = (): RoutineDraft => ({ id: null, name: '', dayOfWeek: '', notes: '', exercises: [] });

function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed.replace(',', '.')) : undefined;
}

function draftFromRoutine(routine: Routine): RoutineDraft {
  return {
    id: routine.id, name: routine.name, dayOfWeek: routine.dayOfWeek === null ? '' : String(routine.dayOfWeek), notes: routine.notes ?? '',
    exercises: routine.exercises.map((item) => ({
      exercise: { ...item.exercise, imageUrl: null, gifUrl: null }, targetSets: String(item.targetSets), targetReps: item.targetReps === null ? '' : String(item.targetReps),
      targetWeightKg: item.targetWeightKg === null ? '' : String(item.targetWeightKg), notes: item.notes ?? '',
      seriesPlan: Array.isArray(item.seriesPlan) ? item.seriesPlan.map((plan) => {
        const value = typeof plan === 'object' && plan !== null && !Array.isArray(plan) ? plan as Record<string, unknown> : {};
        return { reps: typeof value.reps === 'number' ? String(value.reps) : '', weightKg: typeof value.weightKg === 'number' ? String(value.weightKg) : '' };
      }) : null,
    })),
  };
}

function validInteger(value: number | undefined, min: number, max: number): value is number {
  return value !== undefined && Number.isFinite(value) && Number.isInteger(value) && value >= min && value <= max;
}

function validOptionalReps(value: number | undefined): boolean {
  return value === undefined || validInteger(value, 1, 100);
}

function validOptionalNumber(value: number | undefined, min: number, max: number): boolean {
  return value === undefined || Number.isFinite(value) && value >= min && value <= max;
}

function routineInput(draft: RoutineDraft): { body: CreateRoutineInput; error: string | null } {
  const name = draft.name.trim();
  if (name.length < 1 || name.length > 120) return { body: {} as CreateRoutineInput, error: 'El nombre debe tener entre 1 y 120 caracteres.' };
  if (draft.notes.length > 2000) return { body: {} as CreateRoutineInput, error: 'Las notas de la rutina no pueden superar 2000 caracteres.' };
  if (draft.exercises.length > 100) return { body: {} as CreateRoutineInput, error: 'Una rutina admite como máximo 100 ejercicios.' };
  const dayOfWeek = numberOrUndefined(draft.dayOfWeek);
  if (draft.dayOfWeek.trim() && !Number.isInteger(dayOfWeek)) return { body: {} as CreateRoutineInput, error: 'El día de la semana debe ser un número entero.' };
  const exercises: CreateRoutineInput['exercises'] = [];
  for (const [order, item] of draft.exercises.entries()) {
    const targetSets = numberOrUndefined(item.targetSets);
    const targetReps = numberOrUndefined(item.targetReps);
    const targetWeightKg = numberOrUndefined(item.targetWeightKg);
    if (!validInteger(targetSets, 1, 20)) return { body: {} as CreateRoutineInput, error: `Las series de ${item.exercise.name} deben estar entre 1 y 20.` };
    const validTargetSets = targetSets!;
    if (!validOptionalReps(targetReps)) return { body: {} as CreateRoutineInput, error: `Las repeticiones de ${item.exercise.name} deben ser números enteros entre 1 y 100.` };
    if (!validOptionalNumber(targetWeightKg, 0, 500)) return { body: {} as CreateRoutineInput, error: `El peso de ${item.exercise.name} debe estar entre 0 y 500 kg.` };
    if (item.notes.length > 2000) return { body: {} as CreateRoutineInput, error: `Las notas de ${item.exercise.name} no pueden superar 2000 caracteres.` };
    const seriesPlan = item.seriesPlan?.map((plan) => ({ reps: numberOrUndefined(plan.reps), weightKg: numberOrUndefined(plan.weightKg) }));
    if (seriesPlan && seriesPlan.length !== validTargetSets) return { body: {} as CreateRoutineInput, error: `El plan de ${item.exercise.name} debe tener una fila por serie.` };
    if (seriesPlan?.some((plan) => !validOptionalReps(plan.reps))) return { body: {} as CreateRoutineInput, error: `Las repeticiones del plan de ${item.exercise.name} deben ser números enteros entre 1 y 100.` };
    if (seriesPlan?.some((plan) => !validOptionalNumber(plan.weightKg, 0, 500))) return { body: {} as CreateRoutineInput, error: `Revisa el peso del plan por serie de ${item.exercise.name}: entre 0 y 500 kg.` };
    exercises.push({ exerciseId: item.exercise.id, order, targetSets: validTargetSets, ...(targetReps === undefined ? {} : { targetReps }), ...(targetWeightKg === undefined ? {} : { targetWeightKg }), ...(item.notes.trim() ? { notes: item.notes } : {}), ...(seriesPlan ? { seriesPlan } : {}) });
  }
  return { body: { name, ...(dayOfWeek === undefined ? {} : { dayOfWeek }), ...(draft.notes.trim() ? { notes: draft.notes } : {}), exercises }, error: null };
}

export function RoutineManager({ session, routines, routinesStale, exercises, onStartRoutine, catalogSearch, catalogPage, catalogHasMore, catalogLoading, catalogError, catalogNotice, catalogSource, catalogSuccess, onSearchChange, onChangePage, onRetryCatalog }: RoutineManagerProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [preview, setPreview] = useState<Exercise | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Routine | null>(null);
  const [settledDeleteIds, setSettledDeleteIds] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const mutationsDisabled = routinesStale || pending;
  const updateDraft = (next: Partial<RoutineDraft>) => setDraft((current) => current ? { ...current, ...next } : current);
  const updateExercise = (index: number, next: Partial<DraftExercise>) => setDraft((current) => current ? { ...current, exercises: current.exercises.map((item, itemIndex) => itemIndex === index ? { ...item, ...next } : item) } : current);
  const addExercise = (exercise: Exercise) => {
    if (!draft || mutationsDisabled) return;
    if (draft.exercises.some((item) => item.exercise.id === exercise.id)) { setError(`${exercise.name} ya está en la rutina.`); return; }
    setError(null);
    updateDraft({ exercises: [...draft.exercises, { exercise, targetSets: '3', targetReps: '', targetWeightKg: '', notes: '', seriesPlan: null }] });
  };
  const moveExercise = (index: number, direction: -1 | 1) => {
    if (!draft || index + direction < 0 || index + direction >= draft.exercises.length) return;
    const next = [...draft.exercises]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; updateDraft({ exercises: next });
  };
  const setPlan = (index: number, enabled: boolean) => {
    const item = draft?.exercises[index]; if (!item) return;
    if (!enabled) { updateExercise(index, { seriesPlan: null }); return; }
    const count = numberOrUndefined(item.targetSets);
    if (!validInteger(count, 1, 20)) { setError(`Las series de ${item.exercise.name} deben estar entre 1 y 20.`); return; }
    updateExercise(index, { seriesPlan: Array.from({ length: count }, () => ({ reps: '', weightKg: '' })) });
  };
  const updateTargetSets = (index: number, targetSets: string) => {
    const item = draft?.exercises[index]; if (!item) return;
    const count = numberOrUndefined(targetSets);
    const plan = item.seriesPlan && validInteger(count, 1, 20)
      ? Array.from({ length: count }, (_, planIndex) => item.seriesPlan?.[planIndex] ?? { reps: '', weightKg: '' })
      : item.seriesPlan;
    updateExercise(index, { targetSets, seriesPlan: plan });
  };
  const save = async () => {
    if (!draft || mutationsDisabled) return;
    const result = routineInput(draft); if (result.error) { setError(result.error); return; }
    setError(null); setPending(true);
    try {
      if (draft.id) {
        const body: UpdateRoutineInput = { ...result.body, dayOfWeek: result.body.dayOfWeek ?? null, notes: result.body.notes ?? '' };
        await updateRoutine(session, draft.id, body); setSuccess('Rutina actualizada correctamente.');
      } else { await createRoutine(session, result.body); setSuccess('Rutina creada correctamente.'); }
      setDraft(null);
      setPending(false);
      void queryClient.invalidateQueries({ queryKey: ['routines'] }).catch(() => undefined);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar la rutina. Reintenta.'); }
    finally { setPending(false); }
  };
  const confirmDelete = async () => {
    if (!deleteCandidate || mutationsDisabled || settledDeleteIds.has(deleteCandidate.id)) return;
    const routineId = deleteCandidate.id;
    setError(null); setPending(true);
    try {
      await deleteRoutine(session, routineId);
      setSettledDeleteIds((current) => new Set(current).add(routineId));
      setSuccess('Rutina eliminada correctamente.'); setDeleteCandidate(null);
      setPending(false);
      void queryClient.invalidateQueries({ queryKey: ['routines'] }).catch(() => undefined);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo eliminar la rutina. Reintenta.'); }
    finally { setPending(false); }
  };
  return <View style={styles.container}>
    <Text style={textStyles.heading}>Rutinas</Text>
    {routinesStale ? <Text accessibilityRole="alert" style={textStyles.error}>Conéctate para administrar rutinas. La copia local puede estar desactualizada.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
    {success ? <Text accessibilityLiveRegion="polite" style={textStyles.body}>{success}</Text> : null}
    {!draft ? <PrimaryButton disabled={mutationsDisabled} onPress={() => { setError(null); setSuccess(null); setDraft(emptyDraft()); }}>Crear rutina</PrimaryButton> : null}
    {routines.map((routine) => <View key={routine.id} style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Iniciar ${routine.name}`} onPress={() => onStartRoutine(routine)}><Text style={textStyles.heading}>{routine.name}</Text><Text style={textStyles.muted}>{routine.exercises.length} ejercicios · disponible sin conexión</Text></Pressable>
      <View style={styles.row}><PrimaryButton disabled={mutationsDisabled} accessibilityLabel={`Editar ${routine.name}`} onPress={() => { setError(null); setSuccess(null); setDraft(draftFromRoutine(routine)); }}>Editar</PrimaryButton><PrimaryButton disabled={mutationsDisabled || settledDeleteIds.has(routine.id)} accessibilityLabel={`Eliminar ${routine.name}`} onPress={() => setDeleteCandidate(routine)}>Eliminar</PrimaryButton></View>
    </View>)}
    {deleteCandidate ? <View style={styles.confirmation}><Text style={textStyles.body}>¿Eliminar la rutina {deleteCandidate.name}?</Text><View style={styles.row}><PrimaryButton disabled={pending} accessibilityLabel="Cancelar eliminación" onPress={() => setDeleteCandidate(null)}>Cancelar</PrimaryButton><PrimaryButton disabled={mutationsDisabled} accessibilityLabel="Confirmar eliminación" onPress={() => void confirmDelete()}>Eliminar definitivamente</PrimaryButton></View></View> : null}
    {draft ? <RoutineEditor serverUrl={session.serverUrl} draft={draft} exercises={exercises} pending={pending} disabled={mutationsDisabled} preview={preview} catalogSearch={catalogSearch} catalogPage={catalogPage} catalogHasMore={catalogHasMore} catalogLoading={catalogLoading} catalogError={catalogError} catalogNotice={catalogNotice} catalogSource={catalogSource} catalogSuccess={catalogSuccess} onSearchChange={(value) => { setPreview(null); onSearchChange(value); }} onChangePage={(page) => { setPreview(null); onChangePage(page); }} onRetryCatalog={onRetryCatalog} onChange={updateDraft} onUpdateExercise={updateExercise} onUpdateTargetSets={updateTargetSets} onSetPlan={setPlan} onMove={moveExercise} onRemove={(index) => updateDraft({ exercises: draft.exercises.filter((_, itemIndex) => itemIndex !== index) })} onPreview={setPreview} onAdd={addExercise} onCancel={() => { setDraft(null); setError(null); }} onSave={() => void save()} /> : null}
  </View>;
}

function ExercisePreview({ exercise, serverUrl }: { exercise: Exercise; serverUrl: string }) {
  const [playingGif, setPlayingGif] = useState(false);
  const image = mediaUrl(exercise.imageUrl ?? exercise.imagePath, serverUrl);
  const gif = mediaUrl(exercise.gifUrl ?? exercise.gifPath, serverUrl);
  const source = playingGif ? gif : image;
  return <View accessibilityLabel={`Vista previa de ${exercise.name}`} style={styles.preview}>
    <Text style={textStyles.heading}>{exercise.name}</Text>
    <Text style={textStyles.body}>Equipo: {exercise.equipmentLabel ?? exercise.equipment}</Text>
    <Text style={textStyles.body}>Músculo: {exercise.target ?? exercise.muscleGroup}</Text>
    {exercise.description ? <Text style={textStyles.body}>{exercise.description}</Text> : null}
    {source ? <Image accessibilityLabel={`Demostración de ${exercise.name}`} cachePolicy="disk" contentFit="contain" source={{ uri: source }} style={styles.exerciseMedia} /> : null}
    {exercise.attribution ? <Text style={textStyles.muted}>{exercise.attribution}</Text> : null}
    {gif ? <PrimaryButton onPress={() => setPlayingGif((value) => !value)}>{playingGif ? 'Detener demostración' : 'Reproducir GIF'}</PrimaryButton> : null}
  </View>;
}

function RoutineEditor({ serverUrl, draft, exercises, pending, disabled, preview, catalogSearch, catalogPage, catalogHasMore, catalogLoading, catalogError, catalogNotice, catalogSource, catalogSuccess, onSearchChange, onChangePage, onRetryCatalog, onChange, onUpdateExercise, onUpdateTargetSets, onSetPlan, onMove, onRemove, onPreview, onAdd, onCancel, onSave }: {
  serverUrl: string;
  draft: RoutineDraft; exercises: Exercise[]; pending: boolean; disabled: boolean; preview: Exercise | null; catalogSearch: string; catalogPage: number; catalogHasMore: boolean; catalogLoading: boolean; catalogError: Error | null; catalogNotice: string | null; catalogSource: 'server' | 'cache' | null; catalogSuccess: boolean; onSearchChange: (value: string) => void; onChangePage: (page: number) => void; onRetryCatalog: () => void; onChange: (next: Partial<RoutineDraft>) => void; onUpdateExercise: (index: number, next: Partial<DraftExercise>) => void; onUpdateTargetSets: (index: number, targetSets: string) => void; onSetPlan: (index: number, enabled: boolean) => void; onMove: (index: number, direction: -1 | 1) => void; onRemove: (index: number) => void; onPreview: (exercise: Exercise) => void; onAdd: (exercise: Exercise) => void; onCancel: () => void; onSave: () => void;
}) {
  return <View style={styles.editor}>
    <Text style={textStyles.heading}>{draft.id ? 'Editar rutina' : 'Nueva rutina'}</Text>
    <TextInput accessibilityLabel="Nombre de rutina" editable={!disabled} maxLength={120} onChangeText={(name) => onChange({ name })} placeholder="Nombre" placeholderTextColor={theme.colors.textMuted} style={styles.input} value={draft.name} />
    <TextInput accessibilityLabel="Día de la semana" editable={!disabled} inputMode="numeric" onChangeText={(dayOfWeek) => onChange({ dayOfWeek })} placeholder="Día de la semana (opcional)" placeholderTextColor={theme.colors.textMuted} style={styles.input} value={draft.dayOfWeek} />
    <TextInput accessibilityLabel="Notas de rutina" editable={!disabled} maxLength={2000} multiline onChangeText={(notes) => onChange({ notes })} placeholder="Notas (opcional)" placeholderTextColor={theme.colors.textMuted} style={styles.input} value={draft.notes} />
    <Text style={textStyles.heading}>Catálogo</Text>
    <TextInput accessibilityLabel="Buscar ejercicio para rutina" autoCapitalize="none" maxLength={80} onChangeText={onSearchChange} placeholder="Buscar ejercicio" placeholderTextColor={theme.colors.textMuted} style={styles.input} value={catalogSearch} />
    {catalogLoading ? <Text style={textStyles.muted}>Cargando catálogo…</Text> : null}
    {catalogError ? <><Text accessibilityRole="alert" style={textStyles.error}>{catalogError.message}</Text><PrimaryButton disabled={catalogLoading} accessibilityLabel="Reintentar catálogo" onPress={onRetryCatalog}>Reintentar catálogo</PrimaryButton></> : null}
    {catalogNotice ? <Text style={textStyles.muted}>{catalogNotice}</Text> : null}
    {catalogSuccess && exercises.length === 0 ? <Text style={textStyles.muted}>{catalogSource === 'cache' ? 'No hay coincidencias en la copia local.' : 'No hay ejercicios que coincidan con la búsqueda.'}</Text> : null}
    {catalogSuccess && !catalogError ? exercises.map((exercise) => <View key={exercise.id} style={styles.catalogRow}><Text style={[textStyles.body, { flex: 1 }]}>{exercise.name}</Text><PrimaryButton disabled={disabled} accessibilityLabel={`Ver ${exercise.name}`} onPress={() => onPreview(exercise)}>Ver</PrimaryButton><PrimaryButton disabled={disabled} accessibilityLabel={`Agregar ${exercise.name}`} onPress={() => onAdd(exercise)}>Agregar</PrimaryButton></View>) : null}
    {preview ? <ExercisePreview key={preview.id} exercise={preview} serverUrl={serverUrl} /> : null}
    <View style={styles.row}><PrimaryButton disabled={disabled || catalogLoading || catalogPage === 1} accessibilityLabel="Página anterior del catálogo" onPress={() => onChangePage(catalogPage - 1)}>Anterior</PrimaryButton><PrimaryButton disabled={disabled || catalogLoading || !catalogHasMore} accessibilityLabel="Página siguiente del catálogo" onPress={() => onChangePage(catalogPage + 1)}>Siguiente</PrimaryButton></View>
    <Text style={textStyles.heading}>Ejercicios de la rutina</Text>
    {draft.exercises.map((item, index) => <View key={item.exercise.id} style={styles.card}>
      <Text style={textStyles.body}>{index + 1}. {item.exercise.name}</Text><View style={styles.row}><PrimaryButton disabled={disabled || index === 0} accessibilityLabel={`Subir ${item.exercise.name}`} onPress={() => onMove(index, -1)}>Subir</PrimaryButton><PrimaryButton disabled={disabled || index === draft.exercises.length - 1} accessibilityLabel={`Bajar ${item.exercise.name}`} onPress={() => onMove(index, 1)}>Bajar</PrimaryButton><PrimaryButton disabled={disabled} accessibilityLabel={`Quitar ${item.exercise.name}`} onPress={() => onRemove(index)}>Quitar</PrimaryButton></View>
      <TextInput accessibilityLabel={`Series de ${item.exercise.name}`} editable={!disabled} inputMode="numeric" onChangeText={(targetSets) => onUpdateTargetSets(index, targetSets)} placeholder="Series" placeholderTextColor={theme.colors.textMuted} style={styles.input} value={item.targetSets} />
      <TextInput accessibilityLabel={`Repeticiones de ${item.exercise.name}`} editable={!disabled} inputMode="numeric" onChangeText={(targetReps) => onUpdateExercise(index, { targetReps })} placeholder="Repeticiones (opcional)" placeholderTextColor={theme.colors.textMuted} style={styles.input} value={item.targetReps} />
      <TextInput accessibilityLabel={`Peso kg de ${item.exercise.name}`} editable={!disabled} inputMode="decimal" onChangeText={(targetWeightKg) => onUpdateExercise(index, { targetWeightKg })} placeholder="Peso kg (opcional)" placeholderTextColor={theme.colors.textMuted} style={styles.input} value={item.targetWeightKg} />
      <TextInput accessibilityLabel={`Notas de ${item.exercise.name}`} editable={!disabled} maxLength={2000} multiline onChangeText={(notes) => onUpdateExercise(index, { notes })} placeholder="Notas del ejercicio (opcional)" placeholderTextColor={theme.colors.textMuted} style={styles.input} value={item.notes} />
      {item.seriesPlan ? <PrimaryButton disabled={disabled} accessibilityLabel={`Quitar plan por serie de ${item.exercise.name}`} onPress={() => onSetPlan(index, false)}>Quitar plan por serie</PrimaryButton> : <PrimaryButton disabled={disabled} accessibilityLabel={`Configurar plan por serie de ${item.exercise.name}`} onPress={() => onSetPlan(index, true)}>Configurar plan por serie</PrimaryButton>}
      {item.seriesPlan?.map((plan, planIndex) => <View key={planIndex} style={styles.row}><TextInput accessibilityLabel={`Repeticiones plan ${planIndex + 1} de ${item.exercise.name}`} editable={!disabled} inputMode="numeric" onChangeText={(reps) => onUpdateExercise(index, { seriesPlan: item.seriesPlan?.map((value, valueIndex) => valueIndex === planIndex ? { ...value, reps } : value) ?? null })} placeholder={`Reps serie ${planIndex + 1}`} placeholderTextColor={theme.colors.textMuted} style={[styles.input, { flex: 1 }]} value={plan.reps} /><TextInput accessibilityLabel={`Peso plan ${planIndex + 1} de ${item.exercise.name}`} editable={!disabled} inputMode="decimal" onChangeText={(weightKg) => onUpdateExercise(index, { seriesPlan: item.seriesPlan?.map((value, valueIndex) => valueIndex === planIndex ? { ...value, weightKg } : value) ?? null })} placeholder={`Peso serie ${planIndex + 1}`} placeholderTextColor={theme.colors.textMuted} style={[styles.input, { flex: 1 }]} value={plan.weightKg} /></View>)}
    </View>)}
    <View style={styles.row}><PrimaryButton disabled={pending} accessibilityLabel="Cancelar edición" onPress={onCancel}>Cancelar</PrimaryButton><PrimaryButton disabled={disabled} accessibilityLabel={draft.id ? 'Guardar cambios' : 'Guardar rutina'} onPress={onSave}>{draft.id ? 'Guardar cambios' : 'Guardar rutina'}</PrimaryButton></View>
  </View>;
}

const styles = StyleSheet.create({
  exerciseMedia: { width: '100%', height: 220 },
  container: { gap: 12 }, card: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 14 }, catalogRow: { alignItems: 'center', flexDirection: 'row', gap: 8 }, confirmation: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 12, gap: 10, padding: 14 }, editor: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 12, gap: 10, padding: 14 }, input: { backgroundColor: theme.colors.surface, borderRadius: 8, color: theme.colors.text, minHeight: 46, paddingHorizontal: 12 }, preview: { backgroundColor: theme.colors.surface, borderRadius: 8, padding: 12 }, row: { flexDirection: 'row', gap: 8 },
});
