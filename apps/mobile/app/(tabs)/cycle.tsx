import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { CycleEntryForm, type CycleEntry, type CycleInput } from '@/src/cycle/CycleEntryForm';
import { withMobileAuth, type MobileSession } from '@/src/api/client';
import { useSessionStore } from '@/src/auth/session-store';
import { PrimaryButton, Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

async function loadEntries(session: MobileSession, signal: AbortSignal) {
  const response = await withMobileAuth((client) => client.GET('/cycle/entries', { signal }), session);
  if (!response.data || response.error) throw new Error('No se pudo cargar el ciclo.');
  return response.data;
}

async function saveEntry(session: MobileSession, body: CycleInput) {
  const request = { body };
  const response = await withMobileAuth((client) => client.POST('/cycle/entries', request), session);
  if (!response.data || response.error) throw new Error(response.error?.message ?? 'No se pudo guardar el registro.');
  return response.data;
}

async function removeEntry(session: MobileSession, id: string) {
  const response = await withMobileAuth((client) => client.DELETE('/cycle/entries/{id}', { params: { path: { id } } }), session);
  if (response.error) throw new Error('No se pudo eliminar el registro.');
}

export default function CycleScreen() {
  const session = useSessionStore((state) => state.session);
  const trackCycle = useSessionStore((state) => state.user?.trackCycle ?? false);
  if (!trackCycle || !session) return (
    <Screen>
      <Text style={textStyles.title}>Ciclo</Text>
      <Text style={textStyles.muted}>El seguimiento es opcional. Puedes activarlo desde Perfil, sin depender del sexo registrado.</Text>
    </Screen>
  );
  return <EnabledCycleScreen key={`${session.userId}:${session.version}`} session={session} />;
}

function EnabledCycleScreen({ session }: { session: MobileSession }) {
  const [editing, setEditing] = useState<CycleEntry | 'new' | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['cycle'], queryFn: ({ signal }) => loadEntries(session, signal) });
  const addMutation = useMutation({
    mutationFn: (input: CycleInput) => saveEntry(session, input),
    onSuccess: async () => {
      setEditing(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: ['cycle'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeEntry(session, id),
    onSuccess: async () => {
      await Haptics.selectionAsync();
      await queryClient.invalidateQueries({ queryKey: ['cycle'] });
    },
  });

  const error = addMutation.error ?? deleteMutation.error;
  return (
    <Screen>
      <Text style={textStyles.title}>Ciclo</Text>
      <Text style={textStyles.muted}>Contexto opcional y estimado; nunca modifica automáticamente tu carga.</Text>
      {editing ? <CycleEntryForm key={editing === 'new' ? 'new' : editing.id}
        entry={editing === 'new' ? undefined : editing} busy={addMutation.isPending}
        onSave={(input) => {
          const other = query.data?.find((entry) => entry.date.slice(0, 10) === input.date
            && (editing === 'new' || entry.id !== editing.id));
          if (other) {
            Alert.alert('Ya existe un registro', 'Edita el registro de esa fecha para conservar sus datos.');
            return;
          }
          addMutation.mutate(input);
        }} onCancel={() => { setEditing(null); addMutation.reset(); }} />
        : <PrimaryButton onPress={() => { addMutation.reset(); setEditing('new'); }}>Nuevo registro</PrimaryButton>}
      {addMutation.isSuccess ? <Text accessibilityLiveRegion="polite" style={textStyles.body}>Registro guardado.</Text> : null}

      {query.isLoading ? <Text style={textStyles.muted}>Cargando registros…</Text> : null}
      {query.isError ? (
        <View style={styles.card}>
          <Text accessibilityRole="alert" style={textStyles.error}>No pudimos cargar los registros.</Text>
          <PrimaryButton onPress={() => void query.refetch()}>Reintentar</PrimaryButton>
        </View>
      ) : null}
      {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error.message}</Text> : null}
      {query.data?.length === 0 ? <Text style={textStyles.muted}>Aún no hay registros. Puedes empezar con el día de hoy.</Text> : null}
      {query.data?.map((entry) => (
        <View key={entry.id} style={styles.card}>
          <Text style={textStyles.body}>{entry.date.slice(0, 10)}</Text>
          <Text style={textStyles.muted}>Flujo: {entry.flow ?? 'NONE'}</Text>
          <PrimaryButton disabled={addMutation.isPending || deleteMutation.isPending}
            onPress={() => { addMutation.reset(); setEditing(entry); }}>Editar</PrimaryButton>
          <PrimaryButton
            disabled={deleteMutation.isPending || editing !== null}
            onPress={() => Alert.alert(
              'Eliminar registro',
              `Se eliminará el registro del ${entry.date.slice(0, 10)}.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(entry.id) },
              ],
            )}
          >
            Eliminar
          </PrimaryButton>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 16 },
});
