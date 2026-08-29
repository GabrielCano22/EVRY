import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { loadExercises } from '@/src/catalog/catalog';
import { useTrainingStore } from '@/src/training/training-store';
import { PrimaryButton, Screen, SyncStatus, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function TrainScreen() {
  const { data: exercises = [], isError, isLoading, refetch } = useQuery({
    queryKey: ['exercises'],
    queryFn: loadExercises,
  });
  const workout = useTrainingStore((state) => state.activeWorkout);
  const syncState = useTrainingStore((state) => state.syncState);
  const error = useTrainingStore((state) => state.error);
  const startWorkout = useTrainingStore((state) => state.startWorkout);
  const addSet = useTrainingStore((state) => state.addSet);
  const updateSet = useTrainingStore((state) => state.updateSet);
  const finishWorkout = useTrainingStore((state) => state.finishWorkout);

  if (!workout) {
    return (
      <Screen>
        <Text style={textStyles.title}>Entrenar</Text>
        <Text style={textStyles.muted}>No hay una sesión activa.</Text>
        <PrimaryButton onPress={() => void startWorkout()}>Iniciar sesión libre</PrimaryButton>
      </Screen>
    );
  }

  const firstExercise = exercises[0];
  return (
    <Screen>
      <Text style={textStyles.title}>{workout.name}</Text>
      <SyncStatus state={syncState} />
      {isLoading ? <Text style={textStyles.muted}>Cargando catálogo local…</Text> : null}
      {isError && exercises.length === 0 ? (
        <Pressable onPress={() => void refetch()}><Text style={textStyles.error}>No hay catálogo en caché. Reintentar.</Text></Pressable>
      ) : null}
      {firstExercise ? (
        <View style={styles.exerciseCard}>
          <Text style={textStyles.heading}>{firstExercise.name}</Text>
          <Text style={textStyles.muted}>El catálogo muestra miniaturas; los GIF se reproducen solo bajo demanda.</Text>
          <PrimaryButton
            onPress={() => {
              void Haptics.selectionAsync();
              void addSet(firstExercise.id);
            }}
          >
            Agregar serie
          </PrimaryButton>
        </View>
      ) : null}
      {workout.sets.map((set, index) => (
        <View key={set.clientId} style={styles.setCard}>
          <Text style={textStyles.heading}>Serie {index + 1}</Text>
          <View style={styles.row}>
            <NumberField
              label="Peso kg"
              value={set.weightKg}
              onChange={(weightKg) => void updateSet(set.clientId, { weightKg })}
            />
            <NumberField
              label="Repeticiones"
              value={set.reps}
              onChange={(reps) => void updateSet(set.clientId, { reps })}
            />
          </View>
        </View>
      ))}
      {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
      <PrimaryButton
        disabled={workout.sets.length === 0}
        onPress={() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          void finishWorkout();
        }}
      >
        Finalizar y sincronizar
      </PrimaryButton>
    </Screen>
  );
}

function NumberField({ label, value, onChange }: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={textStyles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        inputMode="decimal"
        onChangeText={(text) => onChange(Math.max(0, Number(text.replace(',', '.')) || 0))}
        style={styles.input}
        value={String(value ?? 0)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  exerciseCard: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 12, padding: 18 },
  setCard: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 12, padding: 18 },
  row: { flexDirection: 'row', gap: 12 },
  input: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: 8,
    color: theme.colors.text,
    fontSize: 18,
    minHeight: 48,
    paddingHorizontal: 12,
  },
});
