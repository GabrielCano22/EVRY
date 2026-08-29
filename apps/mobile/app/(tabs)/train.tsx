import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_BASE_URL } from '@/src/api/client';
import { loadExercises, loadRoutines } from '@/src/catalog/catalog';
import { mediaUrl } from '@/src/catalog/media-url';
import { useTrainingStore } from '@/src/training/training-store';
import { PrimaryButton, Screen, SyncStatus, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

export default function TrainScreen() {
  const [search, setSearch] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [playingGif, setPlayingGif] = useState(false);
  const { data: exercises = [], isError, isLoading, refetch } = useQuery({
    queryKey: ['exercises', search.trim()],
    queryFn: ({ signal }) => loadExercises({ search, signal }),
  });
  const routinesQuery = useQuery({ queryKey: ['routines'], queryFn: loadRoutines });
  const workout = useTrainingStore((state) => state.activeWorkout);
  const syncState = useTrainingStore((state) => state.syncState);
  const error = useTrainingStore((state) => state.error);
  const startWorkout = useTrainingStore((state) => state.startWorkout);
  const addSet = useTrainingStore((state) => state.addSet);
  const updateSet = useTrainingStore((state) => state.updateSet);
  const deleteSet = useTrainingStore((state) => state.deleteSet);
  const finishWorkout = useTrainingStore((state) => state.finishWorkout);

  if (!workout) {
    return (
      <Screen>
        <Text style={textStyles.title}>Entrenar</Text>
        <Text style={textStyles.muted}>No hay una sesión activa.</Text>
        <PrimaryButton onPress={() => void startWorkout()}>Iniciar sesión libre</PrimaryButton>
        {routinesQuery.isLoading ? <Text style={textStyles.muted}>Cargando rutinas…</Text> : null}
        {routinesQuery.data?.map((routine) => (
          <Pressable
            accessibilityRole="button"
            key={routine.id}
            onPress={() => void startWorkout(routine.name, routine.id)}
            style={styles.routineCard}
          >
            <Text style={textStyles.heading}>{routine.name}</Text>
            <Text style={textStyles.muted}>{routine.exercises.length} ejercicios · disponible sin conexión</Text>
          </Pressable>
        ))}
      </Screen>
    );
  }

  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? exercises[0];
  const previewUrl = selectedExercise
    ? mediaUrl(playingGif ? selectedExercise.gifPath : selectedExercise.imagePath, API_BASE_URL)
    : null;
  return (
    <Screen>
      <Text style={textStyles.title}>{workout.name}</Text>
      <SyncStatus state={syncState} />
      {isLoading ? <Text style={textStyles.muted}>Cargando catálogo local…</Text> : null}
      {isError && exercises.length === 0 ? (
        <Pressable onPress={() => void refetch()}><Text style={textStyles.error}>No hay catálogo en caché. Reintentar.</Text></Pressable>
      ) : null}
      <TextInput
        accessibilityLabel="Buscar ejercicio"
        autoCapitalize="none"
        onChangeText={(value) => {
          setSearch(value);
          setSelectedExerciseId(null);
          setPlayingGif(false);
        }}
        placeholder="Buscar ejercicio"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.searchInput}
        value={search}
      />
      <View accessibilityRole="list" style={styles.exerciseList}>
        {exercises.slice(0, 8).map((exercise) => (
          <Pressable
            accessibilityRole="button"
            key={exercise.id}
            onPress={() => {
              setSelectedExerciseId(exercise.id);
              setPlayingGif(false);
            }}
            style={[
              styles.exerciseOption,
              selectedExercise?.id === exercise.id && styles.exerciseOptionSelected,
            ]}
          >
            <Text style={textStyles.body}>{exercise.name}</Text>
          </Pressable>
        ))}
      </View>
      {selectedExercise ? (
        <View style={styles.exerciseCard}>
          <Text style={textStyles.heading}>{selectedExercise.name}</Text>
          {previewUrl ? (
            <Image
              accessibilityLabel={`Demostración de ${selectedExercise.name}`}
              cachePolicy="disk"
              contentFit="contain"
              source={{ uri: previewUrl }}
              style={styles.exerciseMedia}
            />
          ) : null}
          <Text style={textStyles.muted}>El catálogo muestra miniaturas; los GIF se reproducen solo bajo demanda.</Text>
          {selectedExercise.gifPath ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPlayingGif((value) => !value)}
            >
              <Text style={textStyles.body}>{playingGif ? 'Detener demostración' : 'Reproducir GIF'}</Text>
            </Pressable>
          ) : null}
          <PrimaryButton
            onPress={() => {
              void Haptics.selectionAsync();
              void addSet(selectedExercise.id);
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
          <Pressable
            accessibilityRole="button"
            onPress={() => void deleteSet(set.clientId)}
          >
            <Text style={textStyles.error}>Eliminar serie</Text>
          </Pressable>
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
  exerciseList: { gap: 8 },
  exerciseMedia: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 10, height: 220, width: '100%' },
  exerciseOption: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12 },
  exerciseOptionSelected: { borderColor: theme.colors.primary, borderWidth: 2 },
  routineCard: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 4, padding: 18 },
  searchInput: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: 8,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
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
