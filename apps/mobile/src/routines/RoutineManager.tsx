import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { MobileSession } from '../api/client';
import type { Exercise } from '../catalog/catalog';
import { ExercisePreview } from '../catalog/ExercisePreview';
import { AppIcon } from '../ui/icon';
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
    {success ? <Text accessibilityLiveRegion="polite" style={styles.success}>{success}</Text> : null}
    {!draft ? <PrimaryButton disabled={mutationsDisabled} icon={<AppIcon color={theme.colors.onPrimary} name="add" size={19} />} onPress={() => { setError(null); setSuccess(null); setDraft(emptyDraft()); }}>Crear rutina</PrimaryButton> : null}
    {routines.map((routine) => <View key={routine.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <AppIcon color={theme.colors.primary} name="playlist_play" size={20} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{routine.name}</Text>
          <Text style={textStyles.muted}>{routine.exercises.length} ejercicios · disponible sin conexión</Text>
        </View>
      </View>
      {routine.exercises.length ? <Text numberOfLines={2} style={styles.exerciseList}>{routine.exercises.map((item) => item.exercise.name).join(' · ')}</Text> : null}
      <PrimaryButton accessibilityLabel={`Iniciar ${routine.name}`} icon={<AppIcon color={theme.colors.onPrimary} name="play_arrow" size={19} />} onPress={() => onStartRoutine(routine)}>Empezar rutina</PrimaryButton>
      <View style={styles.row}>
        <PrimaryButton compact disabled={mutationsDisabled} accessibilityLabel={`Editar ${routine.name}`} onPress={() => { setError(null); setSuccess(null); setDraft(draftFromRoutine(routine)); }} variant="secondary">Editar</PrimaryButton>
        <PrimaryButton compact disabled={mutationsDisabled || settledDeleteIds.has(routine.id)} accessibilityLabel={`Eliminar ${routine.name}`} onPress={() => setDeleteCandidate(routine)} variant="danger">Eliminar</PrimaryButton>
      </View>
    </View>)}
    {deleteCandidate ? <View style={styles.confirmation}>
      <Text style={textStyles.body}>¿Eliminar la rutina {deleteCandidate.name}?</Text>
      <View style={styles.row}>
        <PrimaryButton compact disabled={pending} accessibilityLabel="Cancelar eliminación" onPress={() => setDeleteCandidate(null)} variant="secondary">Cancelar</PrimaryButton>
        <PrimaryButton compact disabled={mutationsDisabled} accessibilityLabel="Confirmar eliminación" onPress={() => void confirmDelete()} variant="danger">Eliminar definitivamente</PrimaryButton>
      </View>
    </View> : null}
    {draft ? <RoutineEditor session={session} draft={draft} exercises={exercises} pending={pending} disabled={mutationsDisabled} preview={preview} catalogSearch={catalogSearch} catalogPage={catalogPage} catalogHasMore={catalogHasMore} catalogLoading={catalogLoading} catalogError={catalogError} catalogNotice={catalogNotice} catalogSource={catalogSource} catalogSuccess={catalogSuccess} onSearchChange={(value) => { setPreview(null); onSearchChange(value); }} onChangePage={(page) => { setPreview(null); onChangePage(page); }} onRetryCatalog={onRetryCatalog} onChange={updateDraft} onUpdateExercise={updateExercise} onUpdateTargetSets={updateTargetSets} onSetPlan={setPlan} onMove={moveExercise} onRemove={(index) => updateDraft({ exercises: draft.exercises.filter((_, itemIndex) => itemIndex !== index) })} onPreview={setPreview} onAdd={addExercise} onCancel={() => { setDraft(null); setError(null); }} onSave={() => void save()} /> : null}
  </View>;
}

function RoutineEditor({ session, draft, exercises, pending, disabled, preview, catalogSearch, catalogPage, catalogHasMore, catalogLoading, catalogError, catalogNotice, catalogSource, catalogSuccess, onSearchChange, onChangePage, onRetryCatalog, onChange, onUpdateExercise, onUpdateTargetSets, onSetPlan, onMove, onRemove, onPreview, onAdd, onCancel, onSave }: {
  session: MobileSession;
  draft: RoutineDraft; exercises: Exercise[]; pending: boolean; disabled: boolean; preview: Exercise | null; catalogSearch: string; catalogPage: number; catalogHasMore: boolean; catalogLoading: boolean; catalogError: Error | null; catalogNotice: string | null; catalogSource: 'server' | 'cache' | null; catalogSuccess: boolean; onSearchChange: (value: string) => void; onChangePage: (page: number) => void; onRetryCatalog: () => void; onChange: (next: Partial<RoutineDraft>) => void; onUpdateExercise: (index: number, next: Partial<DraftExercise>) => void; onUpdateTargetSets: (index: number, targetSets: string) => void; onSetPlan: (index: number, enabled: boolean) => void; onMove: (index: number, direction: -1 | 1) => void; onRemove: (index: number) => void; onPreview: (exercise: Exercise) => void; onAdd: (exercise: Exercise) => void; onCancel: () => void; onSave: () => void;
}) {
  return <View style={styles.editor}>
    <Text style={styles.editorTitle}>{draft.id ? 'Editar rutina' : 'Nueva rutina'}</Text>
    <Text style={styles.sectionLabel}>DATOS</Text>
    <TextInput accessibilityLabel="Nombre de rutina" editable={!disabled} maxLength={120} onChangeText={(name) => onChange({ name })} placeholder="Nombre" placeholderTextColor={theme.colors.textDim} style={styles.input} value={draft.name} />
    <TextInput accessibilityLabel="Día de la semana" editable={!disabled} inputMode="numeric" onChangeText={(dayOfWeek) => onChange({ dayOfWeek })} placeholder="Día de la semana (opcional)" placeholderTextColor={theme.colors.textDim} style={styles.input} value={draft.dayOfWeek} />
    <TextInput accessibilityLabel="Notas de rutina" editable={!disabled} maxLength={2000} multiline onChangeText={(notes) => onChange({ notes })} placeholder="Notas (opcional)" placeholderTextColor={theme.colors.textDim} style={[styles.input, styles.multiline]} value={draft.notes} />

    <Text style={styles.sectionLabel}>CATÁLOGO</Text>
    <View style={styles.searchRow}>
      <AppIcon color={theme.colors.textDim} name="search" size={18} />
      <TextInput accessibilityLabel="Buscar ejercicio para rutina" autoCapitalize="none" maxLength={80} onChangeText={onSearchChange} placeholder="Buscar ejercicio" placeholderTextColor={theme.colors.textDim} style={styles.searchInput} value={catalogSearch} />
    </View>
    {catalogLoading ? <Text style={textStyles.muted}>Cargando catálogo…</Text> : null}
    {catalogError ? <View style={styles.message}><Text accessibilityRole="alert" style={textStyles.error}>{catalogError.message}</Text><PrimaryButton compact disabled={catalogLoading} accessibilityLabel="Reintentar catálogo" onPress={onRetryCatalog} variant="secondary">Reintentar catálogo</PrimaryButton></View> : null}
    {catalogNotice ? <Text style={textStyles.muted}>{catalogNotice}</Text> : null}
    {catalogSuccess && exercises.length === 0 ? <Text style={textStyles.muted}>{catalogSource === 'cache' ? 'No hay coincidencias en la copia local.' : 'No hay ejercicios que coincidan con la búsqueda.'}</Text> : null}
    {catalogSuccess && !catalogError ? <View style={styles.catalogList}>{exercises.map((exercise) => <View key={exercise.id} style={styles.catalogRow}>
      <Text numberOfLines={1} style={styles.catalogName}>{exercise.name}</Text>
      <PrimaryButton compact disabled={disabled} accessibilityLabel={`Ver ${exercise.name}`} onPress={() => onPreview(exercise)} variant="ghost">Ver</PrimaryButton>
      <PrimaryButton compact disabled={disabled} accessibilityLabel={`Agregar ${exercise.name}`} onPress={() => onAdd(exercise)} variant="secondary">Agregar</PrimaryButton>
    </View>)}</View> : null}
    {preview ? <ExercisePreview key={preview.id} exercise={preview} session={session} /> : null}
    <View style={styles.row}>
      <PrimaryButton compact disabled={disabled || catalogLoading || catalogPage === 1} accessibilityLabel="Página anterior del catálogo" onPress={() => onChangePage(catalogPage - 1)} variant="secondary">Anterior</PrimaryButton>
      <Text style={styles.page}>Página {catalogPage}</Text>
      <PrimaryButton compact disabled={disabled || catalogLoading || !catalogHasMore} accessibilityLabel="Página siguiente del catálogo" onPress={() => onChangePage(catalogPage + 1)} variant="secondary">Siguiente</PrimaryButton>
    </View>

    <Text style={styles.sectionLabel}>EJERCICIOS DE LA RUTINA</Text>
    {draft.exercises.length === 0 ? <Text style={textStyles.muted}>Añade ejercicios desde el catálogo.</Text> : null}
    {draft.exercises.map((item, index) => <View key={item.exercise.id} style={styles.card}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>
          <Text style={styles.orderText}>{index + 1}. </Text>{item.exercise.name}
        </Text>
      </View>
      <View style={styles.row}>
        <PrimaryButton compact disabled={disabled || index === 0} accessibilityLabel={`Subir ${item.exercise.name}`} onPress={() => onMove(index, -1)} variant="secondary">Subir</PrimaryButton>
        <PrimaryButton compact disabled={disabled || index === draft.exercises.length - 1} accessibilityLabel={`Bajar ${item.exercise.name}`} onPress={() => onMove(index, 1)} variant="secondary">Bajar</PrimaryButton>
        <PrimaryButton compact disabled={disabled} accessibilityLabel={`Quitar ${item.exercise.name}`} onPress={() => onRemove(index)} variant="danger">Quitar</PrimaryButton>
      </View>
      <View style={styles.inlineFields}>
        <TextInput accessibilityLabel={`Series de ${item.exercise.name}`} editable={!disabled} inputMode="numeric" onChangeText={(targetSets) => onUpdateTargetSets(index, targetSets)} placeholder="Series" placeholderTextColor={theme.colors.textDim} style={[styles.input, styles.inlineInput]} value={item.targetSets} />
        <TextInput accessibilityLabel={`Repeticiones de ${item.exercise.name}`} editable={!disabled} inputMode="numeric" onChangeText={(targetReps) => onUpdateExercise(index, { targetReps })} placeholder="Repeticiones (opcional)" placeholderTextColor={theme.colors.textDim} style={[styles.input, styles.inlineInput]} value={item.targetReps} />
      </View>
      <TextInput accessibilityLabel={`Peso kg de ${item.exercise.name}`} editable={!disabled} inputMode="decimal" onChangeText={(targetWeightKg) => onUpdateExercise(index, { targetWeightKg })} placeholder="Peso kg (opcional)" placeholderTextColor={theme.colors.textDim} style={styles.input} value={item.targetWeightKg} />
      <TextInput accessibilityLabel={`Notas de ${item.exercise.name}`} editable={!disabled} maxLength={2000} multiline onChangeText={(notes) => onUpdateExercise(index, { notes })} placeholder="Notas del ejercicio (opcional)" placeholderTextColor={theme.colors.textDim} style={[styles.input, styles.multiline]} value={item.notes} />
      {item.seriesPlan
        ? <PrimaryButton compact disabled={disabled} accessibilityLabel={`Quitar plan por serie de ${item.exercise.name}`} onPress={() => onSetPlan(index, false)} variant="ghost">Quitar plan por serie</PrimaryButton>
        : <PrimaryButton compact disabled={disabled} accessibilityLabel={`Configurar plan por serie de ${item.exercise.name}`} onPress={() => onSetPlan(index, true)} variant="secondary">Configurar plan por serie</PrimaryButton>}
      {item.seriesPlan?.map((plan, planIndex) => <View key={planIndex} style={styles.row}>
        <TextInput accessibilityLabel={`Repeticiones plan ${planIndex + 1} de ${item.exercise.name}`} editable={!disabled} inputMode="numeric" onChangeText={(reps) => onUpdateExercise(index, { seriesPlan: item.seriesPlan?.map((value, valueIndex) => valueIndex === planIndex ? { ...value, reps } : value) ?? null })} placeholder={`Reps serie ${planIndex + 1}`} placeholderTextColor={theme.colors.textDim} style={[styles.input, { flex: 1 }]} value={plan.reps} />
        <TextInput accessibilityLabel={`Peso plan ${planIndex + 1} de ${item.exercise.name}`} editable={!disabled} inputMode="decimal" onChangeText={(weightKg) => onUpdateExercise(index, { seriesPlan: item.seriesPlan?.map((value, valueIndex) => valueIndex === planIndex ? { ...value, weightKg } : value) ?? null })} placeholder={`Peso serie ${planIndex + 1}`} placeholderTextColor={theme.colors.textDim} style={[styles.input, { flex: 1 }]} value={plan.weightKg} />
      </View>)}
    </View>)}

    <View style={styles.row}>
      <PrimaryButton compact disabled={pending} accessibilityLabel="Cancelar edición" onPress={onCancel} variant="secondary">Cancelar</PrimaryButton>
      <PrimaryButton compact disabled={disabled} accessibilityLabel={draft.id ? 'Guardar cambios' : 'Guardar rutina'} onPress={onSave}>{draft.id ? 'Guardar cambios' : 'Guardar rutina'}</PrimaryButton>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  exerciseMedia: { borderRadius: theme.radii.lg, height: 220, width: '100%' },
  container: { gap: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.gutter },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardCopy: { flex: 1, gap: 2 },
  cardTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  exerciseList: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  catalogList: { gap: 6 },
  catalogRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  catalogName: { color: theme.colors.text, flex: 1, fontSize: 14 },
  confirmation: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: theme.colors.error + '55',
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  editor: {
    backgroundColor: theme.colors.backgroundElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  editorTitle: { color: theme.colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  sectionLabel: { color: theme.colors.textDim, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: theme.colors.text,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  inlineFields: { flexDirection: 'row', gap: 6 },
  inlineInput: { flex: 1 },
  searchRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: { color: theme.colors.text, flex: 1, fontSize: 15, minHeight: 46, paddingVertical: 10 },
  message: { gap: 8 },
  exerciseHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  orderText: { color: theme.colors.primary, fontSize: 15, fontWeight: '800' },
  exerciseName: { color: theme.colors.text, flex: 1, fontSize: 15, fontWeight: '700' },
  page: { color: theme.colors.textDim, flex: 1, fontSize: 12, textAlign: 'center' },
  success: { color: theme.colors.success, fontSize: 13, fontWeight: '600' },
  preview: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
});
