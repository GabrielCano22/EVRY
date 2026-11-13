import { useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import * as Haptics from 'expo-haptics';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { isCurrentMobileSession, withMobileAuth, type MobileSession } from '../api/client';
import { BottomSheet } from '../ui/bottom-sheet';
import { AppIcon } from '../ui/icon';
import { Card, EmptyState, PrimaryButton, SectionHeader, textStyles } from '../ui/components';
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
    <BottomSheet
      onClose={onClose}
      subtitle={sessions.length > 0 ? 'Entrenamiento y ciclo registrados en este día.' : 'El día seleccionado en el calendario.'}
      title={date ? dateTitle(date) : 'Día'}
      visible={date !== null}
    >
      <View style={styles.section}>
        <SectionHeader
          detail={sessions.length > 0 ? `${sessions.length} ${sessions.length === 1 ? 'sesión' : 'sesiones'}` : undefined}
          title={sessions.length === 1 ? 'Entrenamiento' : 'Entrenamientos'}
        />
        {sessions.length > 0 ? sessions.map((item, index) => {
          const workout = workouts.get(item.id);
          const duration = detail(workout);
          const open = expanded === item.id;
          const query = details[index];
          return (
            <Card key={item.id} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <View style={styles.workoutIcon}>
                  <AppIcon color={theme.colors.primary} name="fitness_center" size={20} />
                </View>
                <View style={styles.workoutCopy}>
                  <Text style={styles.workoutName}>{item.name}</Text>
                  <Text style={styles.workoutMeta}>
                    {item.volumeKg.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg ·{' '}
                    {item.setCount} {item.setCount === 1 ? 'serie' : 'series'}
                  </Text>
                </View>
                {duration ? <Text style={styles.duration}>{duration}</Text> : null}
              </View>

              <Pressable
                accessibilityLabel={open ? `Ocultar detalle de ${item.name}` : `Ver sesión ${item.name}`}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setExpanded(open ? null : item.id)}
                style={styles.link}
              >
                <Text style={styles.linkText}>{open ? 'Ocultar detalle' : 'Ver sesión'}</Text>
                <AppIcon color={theme.colors.primary} name={open ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={18} />
              </Pressable>

              {open ? <WorkoutDetail
                failed={query?.isError ?? false}
                loading={query?.isFetching ?? false}
                workout={workout}
              /> : null}
            </Card>
          );
        }) : (
          <EmptyState
            description="Cuando completes una sesión aparecerá aquí, con su detalle serie por serie."
            icon="history"
            title="Sin entrenamiento registrado este día."
          />
        )}
      </View>

      {canTrack ? (
        <View style={styles.section}>
          <SectionHeader detail="Privado y opcional." title="Ciclo" />
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
            <Card style={styles.cycleCard}>
              <View style={styles.cycleHeader}>
                <View style={styles.cycleIcon}>
                  <AppIcon color={theme.colors.cycle} name="water_drop" size={20} />
                </View>
                <View style={styles.cycleCopy}>
                  <Text style={styles.cycleTitle}>Registro de ciclo</Text>
                  <Text style={textStyles.muted}>{entry.isPeriodStart ? 'Primer día de sangrado' : 'Seguimiento del día'}</Text>
                </View>
                {entry.isPeriodStart ? <View style={styles.periodBadge}><Text style={styles.periodBadgeText}>Periodo</Text></View> : null}
              </View>
              {entry.isPeriodStart ? <Text style={textStyles.body}>Inicio del periodo</Text> : null}
              <Text style={styles.meta}>Flujo: {CYCLE_FLOW_LABELS[entry.flow]}</Text>
              {entry.energy !== null ? <Text style={styles.meta}>Energía: {entry.energy}/5</Text> : null}
              {entry.mood !== null ? <Text style={styles.meta}>Ánimo: {entry.mood}/5</Text> : null}
              {entry.symptoms.length > 0 ? <Text style={styles.meta}>Síntomas: {entry.symptoms.join(', ')}</Text> : null}
              {entry.notes ? <Text style={styles.meta}>{entry.notes}</Text> : null}
              <View style={styles.actions}>
                <PrimaryButton
                  compact
                  disabled={save.isPending || remove.isPending}
                  onPress={() => { save.reset(); setMode('edit'); }}
                  variant="secondary"
                >
                  Editar
                </PrimaryButton>
                <PrimaryButton
                  compact
                  disabled={remove.isPending || save.isPending}
                  onPress={() => Alert.alert(
                    'Eliminar registro',
                    `Se eliminará el registro del ${date}.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(entry.id) },
                    ],
                  )}
                  variant="danger"
                >
                  Eliminar
                </PrimaryButton>
              </View>
            </Card>
          ) : future ? (
            <Card style={styles.notice} tone="warning">
              <View style={styles.noticeRow}>
                <AppIcon color={theme.colors.warning} name="warning" size={18} />
                <Text style={styles.noticeText}>No se puede registrar el ciclo en una fecha futura.</Text>
              </View>
            </Card>
          ) : (
            <Card style={styles.emptyCycle}>
              <Text style={textStyles.muted}>Sin registro de ciclo este día.</Text>
              <PrimaryButton disabled={save.isPending} onPress={() => { save.reset(); setMode('new'); }}>
                Registrar ciclo
              </PrimaryButton>
            </Card>
          )}
          {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error.message}</Text> : null}
        </View>
      ) : tracking ? (
        <Card style={styles.notice} tone="cycle">
          <Text style={styles.noticeText}>
            La capa de ciclo está oculta. Actívala en la leyenda del calendario para ver o registrar este día.
          </Text>
          <PrimaryButton onPress={onHiddenCycle} variant="secondary">Mostrar capa de ciclo</PrimaryButton>
        </Card>
      ) : (
        <Card style={styles.notice}>
          <View style={styles.noticeRow}>
            <AppIcon color={theme.colors.textMuted} name="info" size={18} />
            <Text style={textStyles.muted}>
              El seguimiento del ciclo es opcional y se activa desde Perfil.
            </Text>
          </View>
        </Card>
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
          <View style={styles.detailGroupHeader}>
            <View style={styles.detailDot} />
            <Text style={styles.detailName}>{group.name}</Text>
            <Text style={styles.detailCount}>{group.sets.length} {group.sets.length === 1 ? 'serie' : 'series'}</Text>
          </View>
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
  section: { gap: theme.spacing.sm },
  workoutCard: { gap: theme.spacing.sm },
  workoutHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.gutter },
  workoutIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  workoutCopy: { flex: 1, gap: 1 },
  workoutName: { color: theme.colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  workoutMeta: { color: theme.colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
  duration: {
    color: theme.colors.primary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  link: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    minHeight: 40,
  },
  linkText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  cycleCard: { gap: theme.spacing.sm },
  cycleHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.gutter },
  cycleIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.cycleSoft,
    borderRadius: theme.radii.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cycleCopy: { flex: 1, gap: 1 },
  cycleTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  periodBadge: {
    backgroundColor: theme.colors.cycleSoft,
    borderRadius: theme.radii.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  periodBadgeText: { color: theme.colors.cycle, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  meta: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  emptyCycle: { gap: theme.spacing.sm },
  notice: { gap: theme.spacing.sm, padding: theme.spacing.md },
  noticeRow: { alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.sm },
  noticeText: { color: theme.colors.textMuted, flex: 1, fontSize: 13, lineHeight: 19 },
  detail: { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: theme.spacing.sm, paddingTop: theme.spacing.sm },
  detailGroup: { gap: 2 },
  detailGroupHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  detailDot: { backgroundColor: theme.colors.primary, borderRadius: 99, height: 6, width: 6 },
  detailName: { color: theme.colors.text, flex: 1, fontSize: 14, fontWeight: '700' },
  detailCount: { color: theme.colors.textDim, fontSize: 11 },
  detailSet: { color: theme.colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
});
