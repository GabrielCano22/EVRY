import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@evry/api-client';
import { Text, View } from 'react-native';
import { apiError, withMobileAuth, type MobileSession } from '../api/client';
import { PrimaryButton, textStyles } from '../ui/components';

type Recommendation = components['schemas']['AdaptiveRecommendation'];
const actions: Record<Recommendation['action'], string> = {
  HOLD: 'Mantener', PROGRESS: 'Progresar', DELOAD: 'Descargar',
};

/** Advice is optional and remote; it never writes or replaces offline set data. */
export function TrainingRecommendation({ session, exerciseId, workoutId }: {
  session: MobileSession; exerciseId: string; workoutId: string;
}) {
  const consultationId = useId();
  const query = useQuery({
    queryKey: ['training-recommendation', session.serverUrl, session.userId, session.version, workoutId, exerciseId, consultationId],
    enabled: false,
    retry: false,
    gcTime: 0,
    // A failed offline consultation must remain an explicit error, not silently
    // pause training or imply that cached advice is today's recommendation.
    networkMode: 'always',
    queryFn: async ({ signal }) => {
      const response = await withMobileAuth(client => client.GET('/adaptive/recommend/{exerciseId}', {
        params: { path: { exerciseId } }, signal,
      }), session);
      if (!response.data || response.error) {
        throw apiError(response.error, 'No se pudo consultar la recomendación. Puedes seguir entrenando sin conexión.', response.response.status);
      }
      if (response.data.exerciseId !== exerciseId) throw new Error('La recomendación no corresponde al ejercicio seleccionado.');
      return response.data;
    },
  });
  // Refetch failures retain data in Query; do not present that older advice as a
  // successful current consultation during loading or after a network failure.
  const advice = query.isSuccess && !query.isFetching ? query.data : null;
  return <View style={{ gap: 8 }}>
    <Text style={textStyles.heading}>Recomendación de carga</Text>
    <Text style={textStyles.muted}>Orientativa, basada en sesiones sincronizadas. No modifica tus series automáticamente.</Text>
    {query.isFetching ? <Text accessibilityLiveRegion="polite" style={textStyles.muted}>Consultando recomendación…</Text> : null}
    {query.isError ? <Text accessibilityRole="alert" style={textStyles.error}>
      {query.error.message || 'No se pudo consultar la recomendación.'} Puedes seguir entrenando sin conexión.
    </Text> : null}
    {advice ? <>
      <Text style={textStyles.body}>{actions[advice.action]}</Text>
      {advice.targetWeightKg !== null ? <Text style={textStyles.body}>Carga sugerida: {advice.targetWeightKg} kg</Text>
        : <Text style={textStyles.muted}>Sin carga numérica sugerida.</Text>}
      {advice.targetReps !== null ? <Text style={textStyles.body}>Repeticiones sugeridas: {advice.targetReps}</Text> : null}
      {advice.rationale.map((reason, index) => <Text key={index} style={textStyles.muted}>{reason}</Text>)}
    </> : null}
    <PrimaryButton disabled={query.isFetching} onPress={() => void query.refetch()}>
      {query.isError ? 'Reintentar recomendación' : query.isSuccess ? 'Actualizar recomendación' : 'Consultar recomendación'}
    </PrimaryButton>
  </View>;
}
