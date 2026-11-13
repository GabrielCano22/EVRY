import { useQuery } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import { StyleSheet, Text, View } from 'react-native';
import { withMobileAuth, type MobileSession } from '../api/client';
import { cachedExerciseGroups, loadPendingCompletedWorkouts } from '../db/database';
import { useReadinessDay } from '../profile/use-readiness-day';
import { useTrainingStore } from '../training/training-store';
import { AppIcon } from '../ui/icon';
import { Card, PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';
import { BodyMuscleMap } from './body-muscle-map';
import { currentWeekRange, weeklyMuscleSummary } from './weekly-muscles';

type Sex = components['schemas']['User']['biologicalSex'];
type Workout = components['schemas']['Workout'];

export function WeeklyMuscleMap({ session, sex }: { session: MobileSession; sex: Sex | undefined }) {
  const { day } = useReadinessDay();
  const range = currentWeekRange(day);
  const active = useTrainingStore((state) => state.activeWorkout);
  const pending = useQuery({
    queryKey: ['weekly-pending-workouts', session.userId, session.version],
    queryFn: () => loadPendingCompletedWorkouts(session),
    refetchOnMount: 'always',
    refetchInterval: 30_000,
  });
  const exerciseIds = [...new Set([
    ...(active?.sets.map((set) => set.exerciseId) ?? []),
    ...(pending.data?.flatMap((workout) => workout.sets.map((set) => set.exerciseId)) ?? []),
  ])].sort();
  const cached = useQuery({
    queryKey: ['weekly-muscle-catalog', session.userId, session.version, exerciseIds],
    queryFn: () => cachedExerciseGroups(session, exerciseIds),
    enabled: exerciseIds.length > 0,
  });
  const workouts = useQuery({
    queryKey: ['weekly-muscle-workouts', session.userId, session.version, range.from, range.to,
      pending.data?.map((workout) => `${workout.clientId}:${workout.revision}`).sort()],
    enabled: pending.isSuccess || pending.isError,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
    queryFn: async ({ signal }) => {
      const activity = await withMobileAuth((client) => client.GET('/progress/activity', { params: { query: range }, signal }), session);
      if (!activity.data || activity.error) throw new Error('No se pudo cargar la actividad semanal.');
      const ids = [...new Set(activity.data.days.flatMap((entry) => entry.sessions.map((item) => item.id)))];
      const result: Workout[] = [];
      // Bound concurrent requests and fail the whole snapshot rather than inventing a zero for missing workouts.
      for (let offset = 0; offset < ids.length; offset += 8) {
        const batch = await Promise.all(ids.slice(offset, offset + 8).map(async (id) => {
          const response = await withMobileAuth((client) => client.GET('/workouts/{id}', { params: { path: { id } }, signal }), session);
          if (!response.data || response.error) throw new Error('No se pudo cargar una sesión de esta semana.');
          return response.data;
        }));
        result.push(...batch);
      }
      return result;
    },
  });
  const alreadyIncluded = active && (pending.data?.some((workout) => workout.clientId === active.clientId)
    || workouts.data?.some((workout) => workout.clientId === active.clientId));
  const summary = weeklyMuscleSummary(workouts.data ?? [], alreadyIncluded ? [] : active?.sets ?? [], cached.data ?? [], range, pending.data ?? []);
  return <Card style={styles.card}>
    <View style={styles.header}>
      <View style={styles.icon}>
        <AppIcon color={theme.colors.primary} name="accessibility_new" size={20} />
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>Esta semana · desde el lunes</Text>
        <Text style={textStyles.muted}>Series de trabajo por grupo principal.</Text>
      </View>
    </View>
    {workouts.isLoading ? <Text style={textStyles.muted}>Cargando trabajo muscular de la semana…</Text> : null}
    {workouts.isError ? <View style={styles.error}>
      <Text accessibilityRole="alert" style={textStyles.error}>No se pudo cargar todo el historial semanal; el mapa puede estar incompleto.</Text>
      <PrimaryButton compact onPress={() => void workouts.refetch()} variant="secondary">Reintentar mapa semanal</PrimaryButton>
    </View> : null}
    {(workouts.data || active || pending.data?.length) ? <BodyMuscleMap distribution={summary.groups} sex={sex} /> : null}
    {summary.unclassifiedSets > 0 || cached.isError ? <Text style={textStyles.muted}>Algunas series no se pueden clasificar con el catálogo local.</Text> : null}
    {pending.isError ? <Text accessibilityRole="alert" style={textStyles.error}>No se pudieron leer las sesiones locales pendientes; el mapa puede estar incompleto.</Text> : null}
    <Text style={styles.footnote}>Incluye sesiones sincronizadas, la sesión activa y sesiones locales pendientes; los conflictos por revisar no se incluyen.</Text>
  </Card>;
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  header: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.gutter },
  icon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: { flex: 1, gap: 1 },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  error: { gap: theme.spacing.sm },
  footnote: { color: theme.colors.textDim, fontSize: 11, lineHeight: 16 },
});
