import { useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import * as Haptics from 'expo-haptics';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { isCurrentMobileSession, withMobileAuth, type MobileSession } from '../api/client';
import { BottomSheet } from '../ui/bottom-sheet';
import { PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';
import { CYCLE_FLOW_LABELS, CycleEntryForm, type CycleEntry, type CycleInput } from '../cycle/CycleEntryForm';
import { removeEntry, saveEntry } from '../cycle/cycle-api';
import { formatDuration } from '../training/format-rest';

type ActivitySession = components['schemas']['ProgressActivitySession'];
type Workout = components['schemas']['Workout'];

const dateFormat = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric', month: 'long', weekday: 'long', year: 'numeric', timeZone: 'UTC',
});

function dateTitle(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? date : dateFormat.format(parsed);
}

function detail(workout: Workout | undefined): string | null {
  if (!workout || workout.status !== 'COMPLETED' || !workout.endedAt) return null;
  const ms = new Date(workout.endedAt).getTime() - new Date(workout.startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? formatDuration(ms) : null;
}

async function loadWorkout(session: MobileSession, id: string, signal: AbortSignal): Promise<Workout> {
  const response = await withMobileAuth((client) => client.GET('/workouts/{id}', {
    params: { path: { id } }, signal,
  }), session);
  if (!response.data || response.error) throw new Error('No se pudo cargar la sesión.');
  return response.data;
}

/**
 * Day sheet of the single calendar. It shows the completed training of the day
 * and, when the cycle layer is visible, lets the user register or edit that
 * day's cycle entry without leaving Progress.
 */
export function DaySheet({
  session, date, sessions, entry, tracking, cycleVisible, today, onClose, onHiddenCycle,
}: {
  session: MobileSession;
  date: string | null;
  sessions: readonly ActivitySession[];
  entry: CycleEntry | null;
  tracking: boolean;
  cycleVisible: boolean;
  today: string;
  onClose: () => void;
  onHiddenCycle: () => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'view' | 'new' | 'edit'>('view');
  const [expanded, setExpanded] = useState<string | null>(null);
  const details = useQueries({
    queries: sessions.map((item) => ({
      queryKey: ['workout-day', session.serverUrl, session.userId, session.version, item.id] as const,
      enabled: date !== null && isCurrentMobileSession(session),
      queryFn: ({ signal }: { signal: AbortSignal }) => loadWorkout(session, item.id, signal),
      retry: false,
      staleTime: 60_000,
    })),
  });
  const workouts = new Map(sessions.map((item, index) => [item.id, details[index]?.data]));

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['cycle'] });
    await queryClient.invalidateQueries({ queryKey: ['calendar-activity'] });
  };
  const save = useMutation({
    mutationFn: (input: CycleInput) => saveEntry(session, input),
    onSuccess: async () => {
      setMode('view');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeEntry(session, id),
    onSuccess: async () => {
      setMode('view');
      void Haptics.selectionAsync().catch(() => undefined);
      await refresh();
    },
  });
  const error = save.error ?? remove.error;
  const future = date !== null && date > today;
  const canTrack = tracking && cycleVisible;

  return (
    <BottomSheet onClose={onClose} title={date ? dateTitle(date) : 'Día'} visible={date !== null}>
      {sessions.length > 0 ? (
        <View style={styles.section}>
          <Text style={textStyles.heading}>{sessions.length === 1 ? 'Entrenamiento' : 'Entrenamientos'}</Text>
          {sessions.map((item, index) => {
            const workout = workouts.get(item.id);
            const duration = detail(workout);
            const open = expanded === item.id;
            const query = details[index];
            return (
              <View key={item.id} style={styles.card}>
                <Text style={textStyles.body}>{item.name}</Text>
                <Text style={styles.meta}>
                  {duration ? `${duration} · ` : ''}
                  {item.volumeKg.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg ·{' '}
                  {item.setCount} {item.setCount === 1 ? 'serie' : 'series'}
                </Text>
                <Pressable
                  accessibilityLabel={open ? `Ocultar detalle de ${item.name}` : `Ver sesión ${item.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => setExpanded(open ? null : item.id)}
                  style={styles.link}
                >
                  <Text style={styles.linkText}>{open ? 'Ocultar detalle' : 'Ver sesión'}</Text>
                </Pressable>
                {open ? <WorkoutDetail failed={query?.isError ?? false} loading={query?.isFetching ?? false}
                  workout={workout} /> : null}
              </View>
            );
          })}
        </View>
      ) : <Text style={textStyles.muted}>Sin entrenamiento registrado este día.</Text>}

      {canTrack ? (
        <View style={styles.section}>
          <Text style={textStyles.heading}>Ciclo</Text>
          {mode === 'new' || (mode === 'edit' && entry) ? (
            <CycleEntryForm
              busy={save.isPending}
              entry={mode === 'edit' && entry ? entry : undefined}
              initialDate={date ?? today}
              onCancel={() => { setMode('view'); save.reset(); }}
              onSave={(input) => save.mutate(input)}
              today={today}
            />
          ) : entry ? (
            <View style={styles.card}>
              <Text style={styles.meta}>Flujo: {CYCLE_FLOW_LABELS[entry.flow]}</Text>
              {entry.isPeriodStart ? <Text style={textStyles.body}>Inicio del periodo</Text> : null}
              {entry.energy !== null ? <Text style={styles.meta}>Energía: {entry.energy}/5</Text> : null}
              {entry.mood !== null ? <Text style={styles.meta}>Ánimo: {entry.mood}/5</Text> : null}
              {entry.symptoms.length > 0 ? <Text style={styles.meta}>Síntomas: {entry.symptoms.join(', ')}</Text> : null}
              {entry.notes ? <Text style={styles.meta}>{entry.notes}</Text> : null}
              <PrimaryButton disabled={save.isPending || remove.isPending} onPress={() => { save.reset(); setMode('edit'); }}>
                Editar
              </PrimaryButton>
              <PrimaryButton
                disabled={remove.isPending || save.isPending}
                onPress={() => Alert.alert(
                  'Eliminar registro',
                  `Se eliminará el registro del ${date}.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(entry.id) },
                  ],
                )}
              >
                Eliminar
              </PrimaryButton>
            </View>
          ) : future ? (
            <Text style={textStyles.muted}>No se puede registrar el ciclo en una fecha futura.</Text>
          ) : (
            <>
              <Text style={textStyles.muted}>Sin registro de ciclo este día.</Text>
              <PrimaryButton disabled={save.isPending} onPress={() => { save.reset(); setMode('new'); }}>
                Registrar ciclo
              </PrimaryButton>
            </>
          )}
          {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error.message}</Text> : null}
        </View>
      ) : tracking ? (
        <View style={styles.section}>
          <Text style={textStyles.muted}>
            La capa de ciclo está oculta. Actívala en la leyenda del calendario para ver o registrar este día.
          </Text>
          <PrimaryButton onPress={onHiddenCycle}>Mostrar capa de ciclo</PrimaryButton>
        </View>
      ) : (
        <Text style={textStyles.muted}>
          El seguimiento del ciclo es opcional y se activa desde Perfil.
        </Text>
      )}
    </BottomSheet>
  );
}

function WorkoutDetail({ workout, loading, failed }: { workout: Workout | undefined; loading: boolean; failed: boolean }) {
  if (loading && !workout) return <Text style={textStyles.muted}>Cargando detalle…</Text>;
  if (!workout) return <Text style={textStyles.muted}>
    {failed ? 'Sin conexión: no se pudo cargar el detalle de la sesión.' : 'Detalle no disponible.'}
  </Text>;
  const groups = new Map<string, { name: string; sets: Workout['sets'] }>();
  for (const set of workout.sets) {
    if (set.completedAt === null || set.setType === 'WARMUP') continue;
    const group = groups.get(set.exerciseId) ?? { name: set.exercise.name, sets: [] };
    group.sets.push(set);
    groups.set(set.exerciseId, group);
  }
  if (groups.size === 0) return <Text style={textStyles.muted}>No hay series de trabajo completadas.</Text>;
  return (
    <View style={styles.detail}>
      {[...groups.values()].map((group, index) => (
        <View key={`${group.name}-${index}`} style={styles.detailGroup}>
          <Text style={styles.detailName}>{group.name}</Text>
          {group.sets.map((set) => (
            <Text key={set.id} style={styles.detailSet}>
              {set.weightKg !== null && set.reps !== null
                ? `${set.weightKg} kg × ${set.reps}`
                : set.durationS !== null ? `${set.durationS} s` : 'Serie sin datos'}
              {set.rpe !== null ? ` · RPE ${set.rpe}` : ''}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  card: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 10, gap: 6, padding: 12 },
  meta: { color: theme.colors.textMuted, fontSize: 14 },
  link: { justifyContent: 'center', minHeight: 44 },
  linkText: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  detail: { borderTopColor: theme.colors.surface, borderTopWidth: 1, gap: 8, paddingTop: 8 },
  detailGroup: { gap: 2 },
  detailName: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  detailSet: { color: theme.colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
});
