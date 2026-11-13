import { useState } from 'react';
import { calendarMonthCells, parseCivilDate, todayCivil, type CivilDate } from '@evry/domain';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { IconButton } from '../ui/components';
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
        <IconButton label="Mes anterior" name="chevron_left" onPress={() => move(-1)} />
        <Text accessibilityRole="header" style={styles.month}>{monthName}</Text>
        <IconButton label="Mes siguiente" name="chevron_right" onPress={() => move(1)} />
      </View>
      {summary ? <Text accessibilityLabel={summary} style={styles.summary}>{summary}</Text> : null}
      <Text style={styles.caption}>{tracking && showCycle ? 'Calendario de entrenamientos y ciclo' : 'Calendario de entrenamientos'}</Text>
      <View style={styles.weekdays}>
        {weekdays.map((day, index) => <Text key={index} style={styles.weekday}>{day}</Text>)}
      </View>
      <View style={styles.grid}>
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
              thumbColor={showCycle ? theme.colors.text : theme.colors.textDim}
              trackColor={{ false: theme.colors.surfaceHighest, true: theme.colors.cycle }}
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
            <Text style={styles.activateText}>Activar seguimiento</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.footnote}>
        {tracking && showCycle
          ? 'Relleno: entrenamiento · anillo: registro de ciclo · punto: hoy. No representa una predicción.'
          : 'Relleno: entrenamiento · punto: hoy.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  month: { color: theme.colors.text, fontSize: 17, fontWeight: '700', textTransform: 'capitalize' },
  summary: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  caption: { color: theme.colors.textMuted, fontSize: 12 },
  weekdays: { flexDirection: 'row', marginTop: 2 },
  weekday: { color: theme.colors.textDim, fontSize: 11, fontWeight: '700', textAlign: 'center', width: '14.2857%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center', minHeight: 42, width: '14.2857%' },
  day: { alignItems: 'center', borderRadius: 15, height: 32, justifyContent: 'center', width: 32 },
  workout: { backgroundColor: theme.colors.primary },
  cycle: { borderColor: theme.colors.cycle, borderWidth: 2 },
  selected: { borderColor: theme.colors.text, borderWidth: 2 },
  workoutText: { color: theme.colors.onPrimary, fontWeight: '800' },
  futureText: { opacity: 0.3 },
  dayText: { color: theme.colors.text, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  todayDot: { backgroundColor: theme.colors.text, borderRadius: 2, bottom: 3, height: 4, position: 'absolute', width: 4 },
  todayDotOnFill: { backgroundColor: theme.colors.onPrimary },
  legend: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 2 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  legendDot: { borderRadius: 6, height: 11, width: 11 },
  legendWorkout: { backgroundColor: theme.colors.primary },
  legendCycle: { borderColor: theme.colors.cycle, borderWidth: 2 },
  legendToday: { backgroundColor: theme.colors.text, borderRadius: 2, height: 4, width: 4 },
  legendText: { color: theme.colors.textMuted, fontSize: 11 },
  legendSwitch: { alignItems: 'center', flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  activate: {
    alignItems: 'center',
    backgroundColor: theme.colors.cycleSoft,
    borderRadius: theme.radii.full,
    justifyContent: 'center',
    marginLeft: 'auto',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  activateText: { color: theme.colors.cycle, fontSize: 12, fontWeight: '700' },
  footnote: { color: theme.colors.textDim, fontSize: 10, lineHeight: 15 },
});
