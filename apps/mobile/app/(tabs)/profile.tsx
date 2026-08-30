import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { withMobileAuth } from '@/src/api/client';
import { useSessionStore } from '@/src/auth/session-store';
import { PrimaryButton, Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

async function loadReadiness() {
  const response = await withMobileAuth((client) => client.GET('/readiness/latest'));
  if (response.error) throw new Error('No se pudo cargar el readiness de hoy.');
  return response.data ?? null;
}

async function updateProfile(name: string, trackCycle: boolean) {
  const request = { body: { name: name.trim(), trackCycle } };
  const response = await withMobileAuth((client) => client.PATCH('/users/me', request));
  if (!response.data || response.error) throw new Error('No se pudo guardar el perfil.');
  return response.data;
}

async function saveReadiness(values: { sleepHrs: number; stress: number; soreness: number; motivation: number }) {
  const response = await withMobileAuth((client) => client.POST('/readiness/checkin', { body: values }));
  if (!response.data || response.error) throw new Error('No se pudo guardar el readiness.');
  return response.data;
}

export default function ProfileScreen() {
  const user = useSessionStore((state) => state.user);
  const refreshUser = useSessionStore((state) => state.refreshUser);
  const logout = useSessionStore((state) => state.logout);
  const [name, setName] = useState(user?.name ?? '');
  const [trackCycle, setTrackCycle] = useState(user?.trackCycle ?? false);
  const [sleepHrs, setSleepHrs] = useState(7);
  const [stress, setStress] = useState(3);
  const [soreness, setSoreness] = useState(2);
  const [motivation, setMotivation] = useState(3);
  const queryClient = useQueryClient();
  const readinessQuery = useQuery({ queryKey: ['readiness', 'today'], queryFn: loadReadiness });
  const profileMutation = useMutation({
    mutationFn: () => updateProfile(name, trackCycle),
    onSuccess: async () => {
      await refreshUser();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });
  const readinessMutation = useMutation({
    mutationFn: () => saveReadiness({ sleepHrs, stress, soreness, motivation }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['readiness', 'today'] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  return (
    <Screen>
      <Text style={textStyles.title}>Perfil</Text>
      <View style={styles.card}>
        <Text style={textStyles.heading}>Datos personales</Text>
        <Text style={textStyles.muted}>{user?.email}</Text>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          accessibilityLabel="Nombre"
          autoCapitalize="words"
          maxLength={120}
          onChangeText={setName}
          style={styles.input}
          value={name}
        />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={textStyles.body}>Seguimiento de ciclo</Text>
            <Text style={textStyles.muted}>Opcional para cualquier persona.</Text>
          </View>
          <Switch accessibilityLabel="Activar seguimiento de ciclo" onValueChange={setTrackCycle} value={trackCycle} />
        </View>
        {profileMutation.error ? <Text accessibilityRole="alert" style={textStyles.error}>{profileMutation.error.message}</Text> : null}
        {profileMutation.isSuccess ? <Text accessibilityLiveRegion="polite" style={styles.success}>Perfil guardado.</Text> : null}
        <PrimaryButton disabled={!name.trim() || profileMutation.isPending} onPress={() => profileMutation.mutate()}>
          {profileMutation.isPending ? 'Guardando…' : 'Guardar perfil'}
        </PrimaryButton>
      </View>

      <View style={styles.card}>
        <Text style={textStyles.heading}>Readiness de hoy</Text>
        <Text style={textStyles.muted}>Sirve como contexto para sugerencias conservadoras; no cambia cargas automáticamente.</Text>
        {readinessQuery.data ? <Text style={styles.score}>Puntaje actual: {readinessQuery.data.score}/100</Text> : null}
        {readinessQuery.isError ? <Text accessibilityRole="alert" style={textStyles.error}>No pudimos consultar el registro de hoy.</Text> : null}
        <MetricStepper label="Horas de sueño" max={16} min={0} onChange={setSleepHrs} step={0.5} value={sleepHrs} />
        <MetricStepper label="Estrés" max={5} min={1} onChange={setStress} value={stress} />
        <MetricStepper label="Dolor muscular" max={5} min={1} onChange={setSoreness} value={soreness} />
        <MetricStepper label="Motivación" max={5} min={1} onChange={setMotivation} value={motivation} />
        {readinessMutation.error ? <Text accessibilityRole="alert" style={textStyles.error}>{readinessMutation.error.message}</Text> : null}
        {readinessMutation.isSuccess ? <Text accessibilityLiveRegion="polite" style={styles.success}>Readiness guardado para hoy.</Text> : null}
        <PrimaryButton disabled={readinessMutation.isPending} onPress={() => readinessMutation.mutate()}>
          {readinessMutation.isPending ? 'Guardando…' : 'Guardar readiness'}
        </PrimaryButton>
      </View>

      <PrimaryButton onPress={() => void logout()}>Cerrar sesión</PrimaryButton>
    </Screen>
  );
}

function MetricStepper(props: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  const step = props.step ?? 1;
  const change = async (direction: -1 | 1) => {
    props.onChange(Math.max(props.min, Math.min(props.max, props.value + direction * step)));
    await Haptics.selectionAsync();
  };
  return (
    <View style={styles.stepper}>
      <Text style={textStyles.body}>{props.label}</Text>
      <View style={styles.stepperControls}>
        <Pressable accessibilityLabel={`Reducir ${props.label}`} accessibilityRole="button" onPress={() => void change(-1)} style={styles.stepButton}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={styles.stepValue}>{props.value}</Text>
        <Pressable accessibilityLabel={`Aumentar ${props.label}`} accessibilityRole="button" onPress={() => void change(1)} style={styles.stepButton}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 12, padding: 18 },
  input: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 10, color: theme.colors.text, fontSize: 16, minHeight: 48, paddingHorizontal: 14 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  score: { color: theme.colors.primary, fontSize: 18, fontWeight: '800' },
  stepButton: { alignItems: 'center', backgroundColor: theme.colors.surfaceHigh, borderRadius: 10, height: 42, justifyContent: 'center', width: 42 },
  stepper: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stepperControls: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  stepText: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  stepValue: { color: theme.colors.text, fontSize: 16, minWidth: 34, textAlign: 'center' },
  success: { color: theme.colors.success, fontSize: 14 },
  switchCopy: { flex: 1 },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
