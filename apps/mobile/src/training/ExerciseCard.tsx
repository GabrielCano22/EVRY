import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DatabaseOwner } from '../db/database';
import { CachedThumbnail } from '../catalog/CachedThumbnail';
import { mobileThumbnailCache } from '../catalog/thumbnail-files';
import { muscleGroupLabel } from '../catalog/muscle-labels';
import { setTypeOfLocal, type LocalWorkoutSet } from './workout-domain';
import { SetRow, SetTableHeader } from './SetRow';
import { formatRest } from './format-rest';
import { savedAtLabel, type ExerciseTarget, type PreviousSet } from './use-exercise-insights';
import { textStyles } from '../ui/components';
import { theme } from '../ui/theme';

export interface ExerciseCardModel {
  id: string;
  name: string;
  muscleGroup: string | null;
  timed: boolean;
  thumbnailUrl: string | null;
  restSeconds: number;
  shortRestSeconds: number;
  target: ExerciseTarget | null;
  targetSavedAt: string | null;
  previous: PreviousSet[];
  sets: LocalWorkoutSet[];
}

export function ExerciseCard({ exercise, owner, editable, compact, onAddSet, onToggleSet, onChangeSet, onTypeSet, onOptionsSet, onOpenRest, onOpenExercise }: {
  exercise: ExerciseCardModel;
  owner: DatabaseOwner;
  editable: boolean;
  compact: boolean;
  onAddSet: () => void;
  onToggleSet: (set: LocalWorkoutSet) => void;
  onChangeSet: (set: LocalWorkoutSet, changes: Partial<LocalWorkoutSet>) => void;
  onTypeSet: (set: LocalWorkoutSet) => void;
  onOptionsSet: (set: LocalWorkoutSet) => void;
  onOpenRest: () => void;
  onOpenExercise: () => void;
}) {
  // Working ordinals ignore warm-ups without mutating a counter during render.
  const rows = exercise.sets.map((set, index) => {
    const warmup = setTypeOfLocal(set) === 'WARMUP';
    const workingOrdinal = exercise.sets
      .slice(0, index + 1)
      .filter((item) => setTypeOfLocal(item) !== 'WARMUP').length;
    return { set, ordinal: warmup ? 'W' : String(workingOrdinal), index: workingOrdinal - 1 };
  });
  const savedLabel = savedAtLabel(exercise.targetSavedAt);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {exercise.thumbnailUrl ? <CachedThumbnail
          cache={mobileThumbnailCache}
          label={`Miniatura de ${exercise.name}`}
          owner={owner}
          style={styles.thumbnail}
          url={exercise.thumbnailUrl}
        /> : null}
        <View style={styles.identity}>
          <Text numberOfLines={2} style={styles.name}>{exercise.name}</Text>
          <Text style={textStyles.muted}>
            {exercise.muscleGroup ? muscleGroupLabel(exercise.muscleGroup as Parameters<typeof muscleGroupLabel>[0]) : 'Sin grupo'}
            {exercise.timed ? ' · por tiempo' : ''}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Descanso de ${exercise.name}: ${formatRest(exercise.restSeconds)}, corto ${formatRest(exercise.shortRestSeconds)}`}
          accessibilityRole="button"
          onPress={onOpenRest}
          style={styles.restChip}
        >
          <Text style={styles.restText}>⏱ {formatRest(exercise.restSeconds)} · corto {formatRest(exercise.shortRestSeconds)}</Text>
        </Pressable>
        <Pressable accessibilityLabel={`Opciones de ${exercise.name}`} accessibilityRole="button" onPress={onOpenExercise} style={styles.more}>
          <Text style={styles.moreText}>⋯</Text>
        </Pressable>
      </View>

      {rows.length === 0 ? <Text style={textStyles.muted}>Aún no hay series. Añade la primera cuando estés listo.</Text> : <>
        <SetTableHeader compact={compact} timed={exercise.timed} />
        {rows.map(({ set, ordinal, index }) => (
          <SetRow
            compact={compact}
            editable={editable}
            key={set.clientId}
            onChange={(changes) => onChangeSet(set, changes)}
            onOptions={() => onOptionsSet(set)}
            onToggle={() => onToggleSet(set)}
            onTypePress={() => onTypeSet(set)}
            ordinal={ordinal}
            previous={exercise.timed ? undefined : exercise.previous[index]}
            set={set}
            target={exercise.timed ? null : exercise.target}
            timed={exercise.timed}
          />
        ))}
      </>}

      {exercise.target && savedLabel ? (
        <Text style={textStyles.muted}>Objetivo de la última consulta · {savedLabel}. Toca la celda para copiarlo.</Text>
      ) : null}

      {editable ? <Pressable accessibilityLabel="Agregar serie" accessibilityRole="button" onPress={onAddSet} style={styles.add}>
        <Text style={styles.addText}>+ Agregar serie</Text>
      </Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 8, padding: 12 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  thumbnail: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 8, height: 38, width: 38 },
  identity: { flex: 1, gap: 1 },
  name: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  restChip: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 999, justifyContent: 'center', minHeight: 44, paddingHorizontal: 10 },
  restText: { color: theme.colors.text, fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '600' },
  more: { alignItems: 'center', height: 44, justifyContent: 'center', width: 32 },
  moreText: { color: theme.colors.textMuted, fontSize: 22, fontWeight: '700' },
  add: { alignItems: 'center', borderColor: theme.colors.surfaceHigh, borderRadius: 8, borderWidth: 1, justifyContent: 'center', minHeight: 44 },
  addText: { color: theme.colors.primary, fontSize: 15, fontWeight: '700' },
});
