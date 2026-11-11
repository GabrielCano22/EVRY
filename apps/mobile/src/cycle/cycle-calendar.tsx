import { useState } from 'react';
import { calendarMonthCells, parseCivilDate, todayCivil, type CivilDate } from '@evry/domain';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { textStyles } from '../ui/components';
import { theme } from '../ui/theme';

type CalendarEntry = { date: string };
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function calendarMonth(year: number, month: number): (string | null)[] {
  const start = new Date(Date.UTC(year, month, 1));
  return calendarMonthCells(start.getUTCFullYear(), start.getUTCMonth() + 1);
}

const dayFormat = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric', month: 'long', timeZone: 'UTC',
});

function dayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? day : dayFormat.format(date);
}

/**
 * One calendar for training and cycle. Filled circles mean a training day, a
 * ring means a cycle entry, and the ring never competes with the fill, so a
 * day can honestly show both.
 */
export function CycleCalendar({
  entries,
  activityDates,
  showCycle = true,
  tracking = true,
  onToggleCycleLayer,
  onActivateTracking,
  onSelectDay,
  selectedDate = null,
  today = todayCivil(),
  streakDays = null,
  restDays = null,
  onMonthChange,
}: {
  entries: readonly CalendarEntry[];
  activityDates?: readonly string[];
  /** Cycle layer visibility. Turning it off keeps the calendar working. */
  showCycle?: boolean;
  /** Whether the account follows the cycle at all. */
  tracking?: boolean;
  onToggleCycleLayer?: (visible: boolean) => void;
  onActivateTracking?: () => void;
  onSelectDay?: (date: string) => void;
  selectedDate?: string | null;
  today?: CivilDate;
  streakDays?: number | null;
  restDays?: number | null;
  onMonthChange?: (year: number, month: number) => void;
}) {
  const [current, setCurrent] = useState(() => {
    const parsed = parseCivilDate(today);
    return { year: parsed.year, month: parsed.month - 1 };
  });
  const days = calendarMonth(current.year, current.month);
  const marked = new Set(showCycle ? entries.map((entry) => entry.date.slice(0, 10)) : []);
  const workouts = new Set(activityDates ?? []);
  const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(current.year, current.month, 1)));
  function move(amount: number) {
    const next = new Date(Date.UTC(current.year, current.month + amount, 1));
    setCurrent({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
    onMonthChange?.(next.getUTCFullYear(), next.getUTCMonth() + 1);
  }
  const summary = [
    streakDays === null ? null : streakDays > 0 ? `Racha de ${streakDays} ${streakDays === 1 ? 'día' : 'días'}` : 'Sin racha activa',
    restDays === null ? null : `${restDays} ${restDays === 1 ? 'día de descanso' : 'días de descanso'} este mes`,
  ].filter(Boolean).join(' · ');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => move(-1)} style={styles.nav}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" style={textStyles.heading}>{monthName}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => move(1)} style={styles.nav}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>
      {summary ? <Text accessibilityLabel={summary} style={styles.summary}>{summary}</Text> : null}
      <Text style={textStyles.muted}>{tracking && showCycle ? 'Calendario de entrenamientos y ciclo' : 'Calendario de entrenamientos'}</Text>
      <View style={styles.grid}>
        {weekdays.map((day, index) => <Text key={index} style={styles.weekday}>{day}</Text>)}
        {days.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.cell} />;
          const isWorkout = workouts.has(day);
          const isCycle = marked.has(day);
          const isToday = day === today;
          const future = day > today;
          const selected = day === selectedDate;
          const states = [
            isWorkout ? 'entrenamiento' : null,
            isCycle ? 'registro de ciclo' : null,
            isToday ? 'hoy' : null,
            future ? 'fecha futura' : null,
          ].filter(Boolean).join(', ');
          return (
            <Pressable
              accessibilityLabel={`${dayLabel(day)}${states ? `, ${states}` : ''}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: onSelectDay === undefined, selected }}
              disabled={onSelectDay === undefined}
              key={day}
              onPress={() => onSelectDay?.(day)}
              style={styles.cell}
            >
              <View style={[
                styles.day,
                isWorkout && styles.workout,
                isCycle && styles.cycle,
                selected && styles.selected,
              ]}>
                <Text style={[
                  styles.dayText,
                  isWorkout && styles.workoutText,
                  future && styles.futureText,
                ]}>{Number(day.slice(-2))}</Text>
                {isToday ? <View style={[styles.todayDot, isWorkout && styles.todayDotOnFill]} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendWorkout]} />
          <Text style={styles.legendText}>Entreno</Text>
        </View>
        {tracking ? <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendCycle]} />
          <Text style={styles.legendText}>Ciclo</Text>
        </View> : null}
        <View style={styles.legendItem}>
          <View style={styles.legendToday} />
          <Text style={styles.legendText}>Hoy</Text>
        </View>
        {tracking ? (
          <View style={styles.legendSwitch}>
            <Text style={styles.legendText}>{showCycle ? 'Ocultar ciclo' : 'Mostrar ciclo'}</Text>
            <Switch
              accessibilityLabel="Ocultar capa de ciclo"
              onValueChange={(visible) => onToggleCycleLayer?.(visible)}
              value={showCycle}
            />
          </View>
        ) : (
          <Pressable
            accessibilityLabel="Activar seguimiento del ciclo"
            accessibilityRole="button"
            onPress={onActivateTracking}
            style={styles.activate}
          >
            <Text style={styles.legendText}>Activar seguimiento</Text>
          </Pressable>
        )}
      </View>
      <Text style={textStyles.muted}>
        {tracking && showCycle
          ? 'Relleno: entrenamiento · anillo: registro de ciclo · punto: hoy. No representa una predicción.'
          : 'Relleno: entrenamiento · punto: hoy.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 16 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  nav: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  navText: { color: theme.colors.primary, fontSize: 30 },
  summary: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { color: theme.colors.textMuted, textAlign: 'center', width: '14.2857%' },
  cell: { alignItems: 'center', justifyContent: 'center', minHeight: 44, width: '14.2857%' },
  day: { alignItems: 'center', borderRadius: 18, height: 34, justifyContent: 'center', width: 34 },
  workout: { backgroundColor: theme.colors.primary },
  cycle: { borderColor: theme.colors.cycle, borderWidth: 2 },
  selected: { borderColor: theme.colors.text, borderWidth: 2 },
  workoutText: { color: theme.colors.onPrimary },
  futureText: { opacity: 0.35 },
  dayText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  todayDot: { backgroundColor: theme.colors.text, borderRadius: 2, bottom: 3, height: 4, position: 'absolute', width: 4 },
  todayDotOnFill: { backgroundColor: theme.colors.onPrimary },
  legend: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  legendDot: { borderRadius: 6, height: 12, width: 12 },
  legendWorkout: { backgroundColor: theme.colors.primary },
  legendCycle: { borderColor: theme.colors.cycle, borderWidth: 2 },
  legendToday: { backgroundColor: theme.colors.text, borderRadius: 2, height: 4, width: 4 },
  legendText: { color: theme.colors.textMuted, fontSize: 12 },
  legendSwitch: { alignItems: 'center', flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  activate: { justifyContent: 'center', marginLeft: 'auto', minHeight: 44 },
});
