import { useState } from 'react';
import { monthRange, parseCivilDate, todayCivil } from '@evry/domain';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { withMobileAuth, type MobileSession } from '../api/client';
import { CycleCalendar } from '../cycle/cycle-calendar';
import { PrimaryButton, textStyles } from '../ui/components';

export function ActivityCalendar({ session, trackCycle }: { session: MobileSession; trackCycle: boolean }) {
  const [month, setMonth] = useState(() => {
    const today = parseCivilDate(todayCivil());
    return { year: today.year, month: today.month };
  });
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
    enabled: trackCycle && range.from <= today,
    queryFn: async ({ signal }) => {
      const response = await withMobileAuth((client) => client.GET('/cycle/entries', { params: { query: { from: range.from, to } }, signal }), session);
      if (!response.data || response.error) throw new Error('No se pudieron cargar los registros de ciclo.');
      return response.data;
    },
  });
  return <View style={{ gap: 10 }}>
    <CycleCalendar entries={trackCycle ? cycle.data ?? [] : []} showCycle={trackCycle}
      activityDates={activity.data?.days.filter((day) => day.sessions.length > 0).map((day) => day.date) ?? []}
      onMonthChange={(year, nextMonth) => setMonth({ year, month: nextMonth })} />
    {range.from > today ? <Text style={textStyles.muted}>Mes futuro: aún no hay entrenamientos completados.</Text> : null}
    {activity.isLoading && range.from <= today ? <Text style={textStyles.muted}>Cargando entrenamientos…</Text> : null}
    {activity.isError ? <View><Text accessibilityRole="alert" style={textStyles.error}>No se pudieron cargar los entrenamientos; el calendario puede estar incompleto.</Text><PrimaryButton onPress={() => void activity.refetch()}>Reintentar entrenamientos</PrimaryButton></View> : null}
    {trackCycle && range.from <= today && cycle.isLoading ? <Text style={textStyles.muted}>Cargando registros de ciclo…</Text> : null}
    {trackCycle && cycle.isError ? <View><Text accessibilityRole="alert" style={textStyles.error}>No se pudieron cargar los registros de ciclo; el calendario puede estar incompleto.</Text><PrimaryButton onPress={() => void cycle.refetch()}>Reintentar ciclo</PrimaryButton></View> : null}
    <Text style={textStyles.muted}>Solo se muestran entrenamientos sincronizados; los pendientes pueden no aparecer.</Text>
  </View>;
}
