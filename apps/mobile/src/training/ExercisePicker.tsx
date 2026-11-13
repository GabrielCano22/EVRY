import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MobileSession } from '../api/client';
import { loadExercises, type Exercise } from '../catalog/catalog';
import { ExercisePreview } from '../catalog/ExercisePreview';
import { EQUIPMENT_OPTIONS, equipmentLabel } from '../catalog/equipment-labels';
import { MUSCLE_GROUP_OPTIONS, muscleGroupLabel } from '../catalog/muscle-labels';
import { BottomSheet } from '../ui/bottom-sheet';
import { AppIcon } from '../ui/icon';
import { PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';

/** Catalog modal: the session never renders a full exercise list inline. */
export function ExercisePicker({ visible, session, onPick, onClose }: {
  visible: boolean;
  session: MobileSession;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [muscleGroup, setMuscleGroup] = useState<Exercise['muscleGroup'] | null>(null);
  const [equipment, setEquipment] = useState<Exercise['equipment'] | null>(null);
  const [preview, setPreview] = useState<Exercise | null>(null);
  const query = useQuery({
    queryKey: [
      'exercise-picker', session.userId, session.version, search.trim(), page,
      muscleGroup, equipment,
    ],
    enabled: visible,
    queryFn: ({ signal }) => loadExercises(session, {
      search,
      page,
      signal,
      ...(muscleGroup ? { muscleGroup } : {}),
      ...(equipment ? { equipment } : {}),
    }),
  });
  const changeSearch = (value: string) => { setSearch(value); setPage(1); setPreview(null); };
  const changeMuscle = (value: Exercise['muscleGroup'] | null) => {
    setMuscleGroup((current) => (current === value ? null : value));
    setPage(1);
    setPreview(null);
  };
  const changeEquipment = (value: Exercise['equipment'] | null) => {
    setEquipment((current) => (current === value ? null : value));
    setPage(1);
    setPreview(null);
  };
  const hasFilters = muscleGroup !== null || equipment !== null;

  return (
    <BottomSheet
      footer={<PrimaryButton disabled={!query.data?.hasMore || query.isFetching} onPress={() => setPage((value) => Math.min(10000, value + 1))} variant="secondary">
        Siguiente página
      </PrimaryButton>}
      onClose={onClose}
      subtitle="Busca en el catálogo y añade el ejercicio a la sesión."
      title="Agregar ejercicio"
      visible={visible}
    >
      <View style={styles.searchRow}>
        <AppIcon color={theme.colors.textDim} name="search" size={19} />
        <TextInput
          accessibilityLabel="Buscar ejercicio"
          autoCapitalize="none"
          maxLength={80}
          onChangeText={changeSearch}
          placeholder="Buscar por nombre, equipo o músculo"
          placeholderTextColor={theme.colors.textDim}
          style={styles.input}
          value={search}
        />
      </View>

      <View style={styles.filterBlock}>
        <Text style={styles.filterLabel}>Músculo</Text>
        <ScrollView horizontal contentContainerStyle={styles.chips} showsHorizontalScrollIndicator={false}>
          {MUSCLE_GROUP_OPTIONS.map((group) => {
            const selected = muscleGroup === group;
            return <Pressable
              accessibilityLabel={`Filtrar por ${muscleGroupLabel(group)}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={group}
              onPress={() => changeMuscle(group)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={selected ? styles.chipTextSelected : styles.chipText}>{muscleGroupLabel(group)}</Text>
            </Pressable>;
          })}
        </ScrollView>
      </View>

      <View style={styles.filterBlock}>
        <Text style={styles.filterLabel}>Equipo</Text>
        <ScrollView horizontal contentContainerStyle={styles.chips} showsHorizontalScrollIndicator={false}>
          {EQUIPMENT_OPTIONS.map((option) => {
            const selected = equipment === option;
            return <Pressable
              accessibilityLabel={`Filtrar por ${equipmentLabel(option)}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => changeEquipment(option)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={selected ? styles.chipTextSelected : styles.chipText}>{equipmentLabel(option)}</Text>
            </Pressable>;
          })}
        </ScrollView>
      </View>

      {hasFilters ? <View style={styles.filterSummary}>
        <Text style={textStyles.muted}>
          {[muscleGroup ? muscleGroupLabel(muscleGroup) : null, equipment ? equipmentLabel(equipment) : null].filter(Boolean).join(' · ')}
        </Text>
        <Pressable accessibilityLabel="Quitar filtros del catálogo" accessibilityRole="button" onPress={() => {
          setMuscleGroup(null);
          setEquipment(null);
          setPage(1);
          setPreview(null);
        }} style={styles.clearFilters}>
          <Text style={styles.clearFiltersText}>Quitar filtros</Text>
        </Pressable>
      </View> : null}

      {query.isFetching ? <Text style={textStyles.muted}>Buscando…</Text> : null}
      {query.isError ? <View style={styles.message}>
        <Text accessibilityRole="alert" style={textStyles.error}>{query.error.message}</Text>
        <PrimaryButton onPress={() => void query.refetch()} variant="secondary">Reintentar búsqueda</PrimaryButton>
      </View> : null}
      {query.data?.notice ? <Text style={textStyles.muted}>{query.data.notice}</Text> : null}
      {query.isSuccess && query.data.items.length === 0 ? <Text style={textStyles.muted}>
        {query.data.source === 'cache' ? 'No hay coincidencias en la copia local.' : 'No hay ejercicios que coincidan.'}
      </Text> : null}
      {query.isSuccess ? <View accessibilityRole="list" style={styles.list}>
        {query.data.items.map((exercise) => (
          <View key={exercise.id} style={styles.row}>
            <Pressable
              accessibilityLabel={`Agregar ${exercise.name}`}
              accessibilityRole="button"
              onPress={() => {
                onPick(exercise);
                setSearch('');
                setPage(1);
                setPreview(null);
              }}
              style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
            >
              <View style={styles.copy}>
                <Text style={styles.name}>{exercise.name}</Text>
                <Text style={textStyles.muted}>{muscleGroupLabel(exercise.muscleGroup)} · {equipmentLabel(exercise.equipment)}</Text>
              </View>
              <View style={styles.plus}>
                <AppIcon color={theme.colors.primary} name="add" size={18} />
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel={`Ver ${exercise.name}`}
              accessibilityRole="button"
              onPress={() => setPreview((current) => (current?.id === exercise.id ? null : exercise))}
              style={styles.previewButton}
            >
              <AppIcon color={theme.colors.textMuted} name="visibility" size={18} />
            </Pressable>
          </View>
        ))}
      </View> : null}
      {preview ? <ExercisePreview
        exercise={preview}
        key={preview.id}
        onClose={() => setPreview(null)}
        session={session}
      /> : null}
      {query.isSuccess ? <Text style={textStyles.muted}>Página {page}{query.data ? ` · ${query.data.total} coincidencias` : ''}</Text> : null}
      {page > 1 ? <PrimaryButton disabled={query.isFetching} onPress={() => setPage((value) => Math.max(1, value - 1))} variant="ghost">Página anterior</PrimaryButton> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: 14,
  },
  input: { color: theme.colors.text, flex: 1, fontSize: 15, minHeight: 48, paddingVertical: 10 },
  filterBlock: { gap: 6 },
  filterLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chips: { gap: 6, paddingVertical: 2 },
  chip: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
  },
  chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: theme.colors.onPrimary, fontSize: 12, fontWeight: '800' },
  filterSummary: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'space-between' },
  clearFilters: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 6 },
  clearFiltersText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  list: { gap: theme.spacing.sm },
  row: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 2,
    paddingRight: 6,
  },
  rowMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.gutter,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pressed: { opacity: 0.82 },
  copy: { flex: 1, gap: 2 },
  name: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  plus: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  previewButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 40 },
  message: { gap: 8 },
});
