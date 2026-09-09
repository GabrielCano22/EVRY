import { Text, View } from 'react-native';
import type { components } from '@evry/api-client';
import { textStyles } from '../ui/components';
import { signedMetric } from './progress-view';

type Progress = components['schemas']['ExerciseProgress'];
const date = (value: string) => new Date(value).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
const metric = (value: number | null) => value === null ? 'Sin datos' : `${value} kg`;

export function ExerciseProgressDetails({ summary, comparison, points, history }: Pick<Progress, 'summary' | 'comparison' | 'points'> & { history: Progress['history']['items'] }) {
  return <View style={{ gap: 12 }}>
    <Text style={textStyles.heading}>Resumen del ejercicio</Text>
    <Text style={textStyles.body}>{summary.sessionsCount} sesiones · {summary.workingSetsCount} series · {summary.volumeKg} kg de volumen</Text>
    <Text style={textStyles.body}>{summary.bestWeight ? `Mejor peso: ${summary.bestWeight.weightKg} kg` : 'Sin récord de peso'}</Text>
    <Text style={textStyles.body}>{summary.repetitionRecord ? `Mejor serie: ${summary.repetitionRecord.reps} repeticiones` : 'Sin récord de repeticiones'}</Text>
    <Text style={textStyles.body}>{summary.estimated1RM ? `1RM estimado: ${summary.estimated1RM.valueKg} kg` : 'Sin estimación de 1RM'}</Text>
    <Text style={textStyles.muted}>{comparison ? `${signedMetric(comparison.delta.sessionsCount)} sesiones · ${signedMetric(comparison.delta.volumeKg)} kg frente al periodo anterior` : 'Sin periodo anterior comparable.'}</Text>
    <Text style={textStyles.heading}>Evolución</Text>
    {points.length === 0 ? <Text style={textStyles.muted}>Sin actividad en este periodo.</Text> : null}
    {points.map((point) => <View key={`${point.from}:${point.to}`} style={{ gap: 4 }}>
      <Text style={textStyles.body}>{date(point.from)} – {date(point.to)}</Text>
      <Text style={textStyles.body}>{point.sessionsCount} sesiones · {point.volumeKg} kg de volumen</Text>
      <Text style={textStyles.muted}>Máximo: {metric(point.maxWeightKg)} · 1RM estimado: {metric(point.estimated1RMKg)}</Text>
    </View>)}
    <Text style={textStyles.heading}>Historial</Text>
    {history.length === 0 ? <Text style={textStyles.muted}>Sin sesiones registradas en este periodo.</Text> : null}
    {history.map((workout) => <View key={workout.workoutId} style={{ gap: 4 }}>
      <Text style={textStyles.body}>{workout.workoutName} · {date(workout.endedAt)}</Text>
      {workout.sets.map((set) => <View key={set.id} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {set.weightKg !== null ? <Text style={textStyles.muted}>{set.weightKg} kg</Text> : null}
        {set.reps !== null ? <Text style={textStyles.muted}>{set.reps} repeticiones</Text> : null}
        {set.durationS !== null ? <Text style={textStyles.muted}>{set.durationS} s</Text> : null}
        {set.rpe !== null ? <Text style={textStyles.muted}>RPE {set.rpe}</Text> : null}
      </View>)}
    </View>)}
  </View>;
}
