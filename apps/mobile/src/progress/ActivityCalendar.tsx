import { useEffect, useState } from 'react';
import { monthRange, parseCivilDate, todayCivil } from '@evry/domain';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { withMobileAuth, type MobileSession } from '../api/client';
import { loadUiPreference, saveUiPreference } from '../db/database';
import { CycleCalendar } from '../cycle/cycle-calendar';
import { loadEntries } from '../cycle/cycle-api';
import { PrimaryButton, textStyles } from '../ui/components';
import { DaySheet } from './day-sheet';

/** Local-only preference; the cycle layer is a privacy control, not account data. */
const CYCLE_LAYER_KEY = 'cycle-layer-visible';

function countRestDays(from: string, to: string, workoutDays: ReadonlySet<string>): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  let rest = 0;
  for (let time = start; time <= end; time += 86_400_000) {
    if (!workoutDays.has(new Date(time).toISOString().slice(0, 10))) rest += 1;
  }
  return rest;
}

export function ActivityCalendar({ session, trackCycle, streakDays = null }: {
  session: MobileSession;
  trackCycle: boolean;
  streakDays?: number | null;
}) {
  const [month, setMonth] = useState(() => {
    const today = parseCivilDate(todayCivil());
    return { year: today.year, month: today.month };
  });
  const [cycleLayer, setCycleLayer] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const range = monthRange(month.year, month.month);
  const today = todayCivil();
  const to = range.to < today ? range.to : today;
  const activity = useQuery({
    queryKey: ['calendar-activity', session.userId, session.version, range.from, to],
    enabled: range.from <= today,
    queryFn: async ({ signal }) => {
      const response = await withMobileAuth((client) => client.GET('/progress/activity', {
        params: { query: { from: range.from, to } }, signal,
      }), session);
      if (!response.data || response.error) throw new Error('No se pudieron cargar los entrenamientos.');
      return response.data;
    },
  });
  const cycle = useQuery({
    queryKey: ['cycle', 'calendar', session.userId, session.version, range.from, to],
    enabled: trackCycle && cycleLayer && range.from <= today,
    queryFn: ({ signal }) => loadEntries(session, { signal, range: { from: range.from, to } }),
  });

  // Read the privacy preference once per account; a missing key means visible.
  useEffect(() => {
    let alive = true;
    void loadUiPreference(session, CYCLE_LAYER_KEY).then(
      (value) => { if (alive && value !== null) setCycleLayer(value !== 'false'); },
      () => undefined,
    );
    return () => { alive = false; };
  }, [session]);

  const setLayer = (visible: boolean) => {
    setCycleLayer(visible);
    void saveUiPreference(session, CYCLE_LAYER_KEY, String(visible)).catch(() => undefined);
  };

  const workoutDates = activity.data?.days.filter((day) => day.sessions.length > 0).map((day) => day.date) ?? [];
  const restDays = activity.data && range.from <= today
    ? countRestDays(range.from, to, new Set(workoutDates))
    : null;
  const sessions = selectedDate
    ? activity.data?.days.find((day) => day.date === selectedDate)?.sessions ?? []
    : [];
  const entry = selectedDate && trackCycle
    ? cycle.data?.find((item) => item.date.slice(0, 10) === selectedDate) ?? null
    : null;

  return <View style={{ gap: 10 }}>
    <CycleCalendar
      activityDates={workoutDates}
      entries={trackCycle && cycleLayer ? cycle.data ?? [] : []}
      onActivateTracking={() => router.push('/profile')}
      onMonthChange={(year, nextMonth) => setMonth({ year, month: nextMonth })}
      onSelectDay={setSelectedDate}
      onToggleCycleLayer={setLayer}
      restDays={restDays}
      selectedDate={selectedDate}
      showCycle={trackCycle && cycleLayer}
      streakDays={streakDays}
      today={today}
      tracking={trackCycle}
    />
    {range.from > today ? <Text style={textStyles.muted}>Mes futuro: aún no hay entrenamientos completados.</Text> : null}
    {activity.isLoading && range.from <= today ? <Text style={textStyles.muted}>Cargando entrenamientos…</Text> : null}
    {activity.isError ? <View><Text accessibilityRole="alert" style={textStyles.error}>No se pudieron cargar los entrenamientos; el calendario puede estar incompleto.</Text><PrimaryButton onPress={() => void activity.refetch()}>Reintentar entrenamientos</PrimaryButton></View> : null}
    {trackCycle && cycleLayer && range.from <= today && cycle.isLoading ? <Text style={textStyles.muted}>Cargando registros de ciclo…</Text> : null}
    {trackCycle && cycleLayer && cycle.isError ? <View><Text accessibilityRole="alert" style={textStyles.error}>No se pudieron cargar los registros de ciclo; el calendario puede estar incompleto.</Text><PrimaryButton onPress={() => void cycle.refetch()}>Reintentar ciclo</PrimaryButton></View> : null}
    <Text style={textStyles.muted}>Solo se muestran entrenamientos sincronizados; los pendientes pueden no aparecer.</Text>
    <DaySheet
      cycleVisible={cycleLayer}
      date={selectedDate}
      entry={entry}
      key={selectedDate ?? 'closed'}
      onClose={() => setSelectedDate(null)}
      onHiddenCycle={() => setLayer(true)}
      session={session}
      sessions={sessions}
      today={today}
      tracking={trackCycle}
    />
  </View>;
}
