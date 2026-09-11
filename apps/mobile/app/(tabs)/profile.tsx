import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { apiError, withMobileAuth, type CurrentUser, type MobileSession } from '@/src/api/client';
import { useSessionStore } from '@/src/auth/session-store';
import {
  createProfileDraft,
  restoreCycleLengths,
  validateProfileDraft,
  type BiologicalSex,
  type ProfileDraft,
  type ProfileErrors,
  type ProfileGoal,
  type ProfileUpdateInput,
} from '@/src/profile/profile-form';
import { PrimaryButton, Screen, textStyles } from '@/src/ui/components';
import { theme } from '@/src/ui/theme';

async function loadReadiness(session: MobileSession) {
  const response = await withMobileAuth((client) => client.GET('/readiness/latest'), session);
  if (response.error) throw new Error('No se pudo cargar el readiness de hoy.');
  return response.data ?? null;
}

type ProfileUpdateError = Error & {
  code?: string;
  fieldErrors?: ProfileErrors;
  requestId?: string;
  status?: number;
};

async function updateProfile(session: MobileSession, input: ProfileUpdateInput) {
  const request = { body: input };
  const response = await withMobileAuth((client) => client.PATCH('/users/me', request), session);
  if (!response.data || response.error) {
    const translated = apiError(
      response.error,
      'No se pudo guardar el perfil.',
      response.response.status,
    ) as ProfileUpdateError;
    translated.fieldErrors = profileFieldErrors(response.error);
    const requestId = apiErrorRecord(response.error)?.requestId;
    if (typeof requestId === 'string') translated.requestId = requestId;
    throw translated;
  }
  return response.data;
}

async function saveReadiness(session: MobileSession, values: { sleepHrs: number; stress: number; soreness: number; motivation: number }) {
  const response = await withMobileAuth((client) => client.POST('/readiness/checkin', { body: values }), session);
  if (!response.data || response.error) throw new Error('No se pudo guardar el readiness.');
  return response.data;
}

const sexOptions: readonly { label: string; value: BiologicalSex }[] = [
  { label: 'Hombre', value: 'MALE' },
  { label: 'Mujer', value: 'FEMALE' },
  { label: 'Otro', value: 'OTHER' },
  { label: 'Prefiero no decirlo', value: 'PREFER_NOT_SAY' },
];

const goalOptions: readonly { label: string; value: ProfileGoal }[] = [
  { label: 'Fuerza', value: 'STRENGTH' },
  { label: 'Hipertrofia', value: 'HYPERTROPHY' },
  { label: 'Resistencia', value: 'ENDURANCE' },
  { label: 'Pérdida de grasa', value: 'FAT_LOSS' },
  { label: 'Acondicionamiento general', value: 'GENERAL_FITNESS' },
  { label: 'Movilidad', value: 'MOBILITY' },
];

const profileFieldNames: readonly (keyof ProfileDraft)[] = [
  'name',
  'biologicalSex',
  'birthDate',
  'goals',
  'trackCycle',
  'avgCycleLen',
  'avgPeriodLen',
];

function apiErrorRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function profileFieldErrors(value: unknown): ProfileErrors {
  const fieldErrors = apiErrorRecord(apiErrorRecord(value)?.fieldErrors);
  if (!fieldErrors) return {};
  const result: ProfileErrors = {};
  for (const field of profileFieldNames) {
    const messages = fieldErrors[field];
    if (Array.isArray(messages) && typeof messages[0] === 'string') result[field] = messages[0];
  }
  return result;
}

function currentCivilDate(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function ProfileScreen() {
  const session = useSessionStore((state) => state.session)!;
  const user = useSessionStore((state) => state.user);
  const refreshUser = useSessionStore((state) => state.refreshUser);
  const logout = useSessionStore((state) => state.logout);
  const currentUser = user!;
  const [draft, setDraft] = useState<ProfileDraft>(() => createProfileDraft(currentUser));
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [sleepHrs, setSleepHrs] = useState(7);
  const [stress, setStress] = useState(3);
  const [soreness, setSoreness] = useState(2);
  const [motivation, setMotivation] = useState(3);
  const queryClient = useQueryClient();
  const readinessQuery = useQuery({ queryKey: ['readiness', 'today'], queryFn: () => loadReadiness(session) });
  const profileMutation = useMutation({
    mutationFn: (input: ProfileUpdateInput) => updateProfile(session, input),
    onError: (error: ProfileUpdateError) => {
      setProfileErrors(error.fieldErrors ?? {});
    },
    onSuccess: async (updatedUser) => {
      const confirmedUser = { ...currentUser, ...updatedUser } as CurrentUser;
      setDraft(createProfileDraft(confirmedUser));
      setProfileErrors({});
      try {
        await refreshUser();
      } catch {
        // The confirmed PATCH response remains authoritative for this form.
      }
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Haptic availability must not turn a confirmed update into a failed save.
      }
    },
  });
  const updateDraft = (changes: Partial<ProfileDraft>) => {
    setDraft((value) => ({ ...value, ...changes }));
    setProfileErrors((value) => {
      const next = { ...value };
      for (const field of Object.keys(changes) as (keyof ProfileDraft)[]) delete next[field];
      return next;
    });
  };
  const toggleGoal = (goal: ProfileGoal) => {
    setDraft((value) => ({
      ...value,
      goals: value.goals.includes(goal)
        ? value.goals.filter((candidate) => candidate !== goal)
        : [...value.goals, goal],
    }));
    setProfileErrors((value) => ({ ...value, goals: undefined }));
  };
  const toggleCycleTracking = (enabled: boolean) => {
    if (enabled) {
      setDraft((value) => restoreCycleLengths(value, currentUser));
      setProfileErrors((value) => ({
        ...value,
        trackCycle: undefined,
        avgCycleLen: undefined,
        avgPeriodLen: undefined,
      }));
      return;
    }
    updateDraft({ trackCycle: false });
  };
  const submitProfile = () => {
    const result = validateProfileDraft(draft, currentCivilDate());
    setProfileErrors(result.errors);
    if (result.input) profileMutation.mutate(result.input);
  };
  const readinessMutation = useMutation({
    mutationFn: () => saveReadiness(session, { sleepHrs, stress, soreness, motivation }),
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
          onChangeText={(name) => updateDraft({ name })}
          style={styles.input}
          value={draft.name}
        />
        {profileErrors.name ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.name}</Text> : null}
        <Text style={styles.label}>Fecha de nacimiento</Text>
        <TextInput
          accessibilityLabel="Fecha de nacimiento"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          onChangeText={(birthDate) => updateDraft({ birthDate })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={draft.birthDate}
        />
        <Text style={textStyles.muted}>Formato: YYYY-MM-DD</Text>
        {profileErrors.birthDate ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.birthDate}</Text> : null}
        <Text style={styles.label}>Sexo biológico</Text>
        <View style={styles.options}>
          {sexOptions.map((option) => (
            <Pressable
              accessibilityLabel={`Sexo biológico: ${option.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.biologicalSex === option.value }}
              key={option.value}
              onPress={() => updateDraft({ biologicalSex: option.value })}
              style={[styles.option, draft.biologicalSex === option.value && styles.optionSelected]}
            >
              <Text style={textStyles.body}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        {profileErrors.biologicalSex ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.biologicalSex}</Text> : null}
        <Text style={styles.label}>Objetivos</Text>
        <View style={styles.options}>
          {goalOptions.map((option) => (
            <Pressable
              accessibilityLabel={`Objetivo: ${option.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.goals.includes(option.value) }}
              key={option.value}
              onPress={() => toggleGoal(option.value)}
              style={[styles.option, draft.goals.includes(option.value) && styles.optionSelected]}
            >
              <Text style={textStyles.body}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        {profileErrors.goals ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.goals}</Text> : null}
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={textStyles.body}>Seguimiento de ciclo</Text>
            <Text style={textStyles.muted}>Opcional para cualquier persona.</Text>
          </View>
          <Switch
            accessibilityLabel="Activar seguimiento de ciclo"
            onValueChange={toggleCycleTracking}
            value={draft.trackCycle}
          />
        </View>
        {profileErrors.trackCycle ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.trackCycle}</Text> : null}
        {draft.trackCycle ? (
          <>
            <Text style={styles.label}>Promedio de ciclo (días)</Text>
            <TextInput
              accessibilityLabel="Promedio de ciclo (días)"
              keyboardType="number-pad"
              onChangeText={(avgCycleLen) => updateDraft({ avgCycleLen })}
              style={styles.input}
              value={draft.avgCycleLen}
            />
            {profileErrors.avgCycleLen ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.avgCycleLen}</Text> : null}
            <Text style={styles.label}>Promedio de periodo (días)</Text>
            <TextInput
              accessibilityLabel="Promedio de periodo (días)"
              keyboardType="number-pad"
              onChangeText={(avgPeriodLen) => updateDraft({ avgPeriodLen })}
              style={styles.input}
              value={draft.avgPeriodLen}
            />
            {profileErrors.avgPeriodLen ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.avgPeriodLen}</Text> : null}
          </>
        ) : (
          <>
            {profileErrors.avgCycleLen ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.avgCycleLen}</Text> : null}
            {profileErrors.avgPeriodLen ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.avgPeriodLen}</Text> : null}
          </>
        )}
        {profileMutation.error ? <Text accessibilityRole="alert" style={textStyles.error}>{profileMutation.error.message}</Text> : null}
        {profileMutation.isSuccess ? <Text accessibilityLiveRegion="polite" style={styles.success}>Perfil guardado.</Text> : null}
        <PrimaryButton disabled={profileMutation.isPending} onPress={submitProfile}>
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
  option: { borderColor: theme.colors.surfaceHigh, borderRadius: 10, borderWidth: 1, padding: 10 },
  optionSelected: { backgroundColor: theme.colors.surfaceHigh, borderColor: theme.colors.primary },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
