import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { todayCivil } from '@evry/domain';
import { withMobileAuth, type MobileSession } from '@/src/api/client';
import { useSessionStore } from '@/src/auth/session-store';
import { PrimaryButton, Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

async function loadEntries(session: MobileSession) {
  const response = await withMobileAuth((client) => client.GET('/cycle/entries'), session);
  if (!response.data || response.error) throw new Error('No se pudo cargar el ciclo.');
  return response.data;
}

async function addToday(session: MobileSession) {
  const request = { body: { date: todayCivil(), flow: 'NONE' as const, symptoms: [] } };
  const response = await withMobileAuth((client) => client.POST('/cycle/entries', request), session);
  if (!response.data || response.error) throw new Error('No se pudo guardar el registro de hoy.');
  return response.data;
}

async function removeEntry(session: MobileSession, id: string) {
  const response = await withMobileAuth((client) => client.DELETE('/cycle/entries/{id}', { params: { path: { id } } }), session);
  if (response.error) throw new Error('No se pudo eliminar el registro.');
}

export default function CycleScreen() {
  const session = useSessionStore((state) => state.session)!;
  const trackCycle = useSessionStore((state) => state.user?.trackCycle ?? false);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['cycle'], queryFn: () => loadEntries(session), enabled: trackCycle });
  const addMutation = useMutation({
    mutationFn: () => addToday(session),
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  if (!trackCycle) {
    return (
      <Screen>
        <Text style={textStyles.title}>Ciclo</Text>
        <Text style={textStyles.muted}>El seguimiento es opcional. Puedes activarlo desde Perfil, sin depender del sexo registrado.</Text>
      </Screen>
    );
  }

  const error = addMutation.error ?? deleteMutation.error;
  return (
    <Screen>
      <Text style={textStyles.title}>Ciclo</Text>
      <Text style={textStyles.muted}>Contexto opcional y estimado; nunca modifica automáticamente tu carga.</Text>
      <PrimaryButton disabled={addMutation.isPending} onPress={() => addMutation.mutate()}>
        {addMutation.isPending ? 'Guardando…' : 'Registrar hoy'}
      </PrimaryButton>

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
          <Text style={textStyles.body}>{entry.date}</Text>
          <Text style={textStyles.muted}>Flujo: {entry.flow ?? 'NONE'}</Text>
          <PrimaryButton
            disabled={deleteMutation.isPending}
            onPress={() => Alert.alert(
              'Eliminar registro',
              `Se eliminará el registro del ${entry.date}.`,
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
