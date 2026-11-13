import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MobileSession } from '../api/client';
import { loadExercises, type Exercise } from '../catalog/catalog';
import { muscleGroupLabel } from '../catalog/muscle-labels';
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
  const query = useQuery({
    queryKey: ['exercise-picker', session.userId, session.version, search.trim(), page],
    enabled: visible,
    queryFn: ({ signal }) => loadExercises(session, { search, page, signal }),
  });
  const changeSearch = (value: string) => { setSearch(value); setPage(1); };
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
          <Pressable
            accessibilityLabel={`Agregar ${exercise.name}`}
            accessibilityRole="button"
            key={exercise.id}
            onPress={() => { onPick(exercise); setSearch(''); setPage(1); }}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.copy}>
              <Text style={styles.name}>{exercise.name}</Text>
              <Text style={textStyles.muted}>{muscleGroupLabel(exercise.muscleGroup)}</Text>
            </View>
            <View style={styles.plus}>
              <AppIcon color={theme.colors.primary} name="add" size={18} />
            </View>
          </Pressable>
        ))}
      </View> : null}
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
  list: { gap: theme.spacing.sm },
  row: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
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
  message: { gap: 8 },
});
