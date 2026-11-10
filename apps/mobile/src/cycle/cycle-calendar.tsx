import { useState } from 'react';
import { calendarMonthCells, parseCivilDate, todayCivil } from '@evry/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { textStyles } from '../ui/components';
import { theme } from '../ui/theme';

type CalendarEntry = { date: string };
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function calendarMonth(year: number, month: number): (string | null)[] {
  const start = new Date(Date.UTC(year, month, 1));
  return calendarMonthCells(start.getUTCFullYear(), start.getUTCMonth() + 1);
}

export function CycleCalendar({ entries, activityDates, showCycle = true, onMonthChange }: { entries: readonly CalendarEntry[]; activityDates?: readonly string[]; showCycle?: boolean; onMonthChange?: (year: number, month: number) => void }) {
  const [current, setCurrent] = useState(() => {
    const today = parseCivilDate(todayCivil());
    return { year: today.year, month: today.month - 1 };
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
      <Text style={textStyles.muted}>{activityDates ? (showCycle ? 'Calendario de entrenamientos y ciclo' : 'Calendario de entrenamientos') : 'Calendario de registros de ciclo'}</Text>
      <View style={styles.grid}>
        {weekdays.map((day, index) => <Text key={index} style={styles.weekday}>{day}</Text>)}
        {days.map((day, index) => day ? (
          <View key={day} style={styles.cell} accessible accessibilityLabel={`${day}${marked.has(day) ? ', registro de ciclo' : ''}${workouts.has(day) ? ', entrenamiento' : ''}`}>
            <View style={[styles.day, marked.has(day) && styles.marked, workouts.has(day) && styles.workout]}>
              <Text style={[styles.dayText, marked.has(day) && styles.markedText]}>{Number(day.slice(-2))}</Text>
            </View>
          </View>
        ) : <View key={`empty-${index}`} style={styles.cell} />)}
      </View>
      <Text style={textStyles.muted}>{activityDates ? (showCycle ? 'Azul: registro de ciclo · borde verde: entrenamiento sincronizado. No representa una predicción.' : 'Borde verde: entrenamiento sincronizado.') : 'Azul: hay un registro. No representa una predicción.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 16 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  nav: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  navText: { color: theme.colors.primary, fontSize: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { color: theme.colors.textMuted, textAlign: 'center', width: '14.2857%' },
  cell: { alignItems: 'center', justifyContent: 'center', minHeight: 40, width: '14.2857%' },
  day: { alignItems: 'center', borderRadius: 18, height: 34, justifyContent: 'center', width: 34 },
  marked: { backgroundColor: theme.colors.primary },
  workout: { borderColor: theme.colors.success, borderWidth: 2 },
  markedText: { color: theme.colors.onPrimary },
  dayText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
});
