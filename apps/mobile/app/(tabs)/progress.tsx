import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { apiClient, refreshMobileSession } from '@/src/api/client';
import { Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

async function loadOverview() {
  let response = await apiClient.GET('/progress/overview', { params: { query: { period: '30d' } } });
  if (response.response.status === 401 && await refreshMobileSession()) {
    response = await apiClient.GET('/progress/overview', { params: { query: { period: '30d' } } });
  }
  if (response.error) throw new Error('No se pudo cargar el progreso.');
  return response.data ?? {};
}

export default function ProgressScreen() {
  const query = useQuery({ queryKey: ['progress', '30d'], queryFn: loadOverview });
  const overview = query.data as Record<string, unknown> | undefined;

  return (
    <Screen>
      <Text style={textStyles.title}>Progreso</Text>
      <Text style={textStyles.muted}>Comparación real de los últimos 30 días contra el periodo anterior.</Text>
      {query.isLoading ? <Text style={textStyles.muted}>Cargando métricas…</Text> : null}
      {query.isError ? <Text accessibilityRole="alert" style={textStyles.error}>No pudimos cargar el progreso.</Text> : null}
      {overview ? (
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, gap: 8, padding: 18 }}>
          <Text style={textStyles.heading}>Resumen disponible</Text>
          <Text style={textStyles.muted}>{Object.keys(overview).length} grupos de métricas recibidos.</Text>
        </View>
      ) : null}
    </Screen>
  );
}
