import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { todayCivil } from '@evry/domain';
import { apiClient, refreshMobileSession } from '@/src/api/client';
import { useSessionStore } from '@/src/auth/session-store';
import { PrimaryButton, Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

async function loadEntries() {
  let response = await apiClient.GET('/cycle/entries');
  if (response.response.status === 401 && await refreshMobileSession()) {
    response = await apiClient.GET('/cycle/entries');
  }
  if (response.error) throw new Error('No se pudo cargar el ciclo.');
  return response.data ?? [];
}

export default function CycleScreen() {
  const trackCycle = useSessionStore((state) => state.user?.trackCycle ?? false);
  const query = useQuery({ queryKey: ['cycle'], queryFn: loadEntries, enabled: trackCycle });
  if (!trackCycle) return <Screen><Text style={textStyles.muted}>El seguimiento del ciclo no está activado.</Text></Screen>;

  async function addToday() {
    await apiClient.POST('/cycle/entries', {
      body: { date: todayCivil(), flow: 'NONE', symptoms: [] },
    });
    await query.refetch();
  }

  return (
    <Screen>
      <Text style={textStyles.title}>Ciclo</Text>
      <Text style={textStyles.muted}>Contexto opcional y estimado; nunca modifica automáticamente tu carga.</Text>
      <PrimaryButton onPress={() => void addToday()}>Registrar hoy</PrimaryButton>
      {query.data?.map((entry) => (
        <View key={entry.id} style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16 }}>
          <Text style={textStyles.body}>{entry.date}</Text>
          <Text style={textStyles.muted}>{entry.flow ?? 'NONE'}</Text>
        </View>
      ))}
    </Screen>
  );
}
