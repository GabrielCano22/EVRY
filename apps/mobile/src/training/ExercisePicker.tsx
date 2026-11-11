import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MobileSession } from '../api/client';
import { loadExercises, type Exercise } from '../catalog/catalog';
import { muscleGroupLabel } from '../catalog/muscle-labels';
import { BottomSheet } from '../ui/bottom-sheet';
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
      footer={<PrimaryButton disabled={!query.data?.hasMore || query.isFetching} onPress={() => setPage((value) => Math.min(10000, value + 1))}>
        Siguiente página
      </PrimaryButton>}
      onClose={onClose}
      title="Agregar ejercicio"
      visible={visible}
    >
      <TextInput
        accessibilityLabel="Buscar ejercicio"
        autoCapitalize="none"
        maxLength={80}
        onChangeText={changeSearch}
        placeholder="Buscar por nombre, equipo o músculo"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
        value={search}
      />
      {query.isFetching ? <Text style={textStyles.muted}>Buscando…</Text> : null}
      {query.isError ? <View style={styles.message}>
        <Text accessibilityRole="alert" style={textStyles.error}>{query.error.message}</Text>
        <PrimaryButton onPress={() => void query.refetch()}>Reintentar búsqueda</PrimaryButton>
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
            style={styles.row}
          >
            <View style={styles.copy}>
              <Text style={textStyles.body}>{exercise.name}</Text>
              <Text style={textStyles.muted}>{muscleGroupLabel(exercise.muscleGroup)}</Text>
            </View>
            <Text style={styles.plus}>+</Text>
          </Pressable>
        ))}
      </View> : null}
      {query.isSuccess ? <Text style={textStyles.muted}>Página {page}{query.data ? ` · ${query.data.total} coincidencias` : ''}</Text> : null}
      {page > 1 ? <PrimaryButton disabled={query.isFetching} onPress={() => setPage((value) => Math.max(1, value - 1))}>Página anterior</PrimaryButton> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: 10,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  list: { gap: 6 },
  row: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copy: { flex: 1 },
  plus: { color: theme.colors.primary, fontSize: 24, fontWeight: '700' },
  message: { gap: 8 },
});
