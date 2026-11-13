import { useEffect, useRef, useState, type ReactNode } from 'react';
import { todayCivil, type CivilDate } from '@evry/domain';
import type { components } from '@evry/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { apiError, isCurrentMobileSession, withMobileAuth, type CurrentUser, type MobileSession } from '@/src/api/client';
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
import { Avatar, Card, PrimaryButton, Screen, ScreenHeader, SectionHeader, textStyles } from '@/src/ui/components';
import { AppIcon } from '@/src/ui/icon';
import { theme } from '@/src/ui/theme';
import { RestPreferencesCard } from '@/src/training/RestPreferencesCard';
import { useReadinessDay } from '@/src/profile/use-readiness-day';

type Readiness = components['schemas']['Readiness'];
const readinessFields = ['sleepHrs', 'stress', 'soreness', 'motivation'] as const;
type ReadinessField = typeof readinessFields[number];
type ReadinessValues = Pick<Readiness, ReadinessField>;
type ReadinessDraft = { values: ReadinessValues; touched: Partial<Record<ReadinessField, boolean>>;
  source: Readiness | null | undefined; version: number };

function readinessValues(record: Readiness): ReadinessValues {
  return { sleepHrs: record.sleepHrs, stress: record.stress, soreness: record.soreness, motivation: record.motivation };
}

function confirmedReadiness(record: Readiness, session: MobileSession): Readiness {
  const metric = (value: unknown, min: number, max: number, integer = false) => value === null
    || (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
      && (!integer || Number.isInteger(value)));
  if (typeof record !== 'object' || record === null || typeof record.id !== 'string'
    || record.userId !== session.userId || typeof record.date !== 'string' || !Number.isFinite(Date.parse(record.date))
    || !(record.civilDate === null || (typeof record.civilDate === 'string' && Number.isFinite(Date.parse(record.civilDate))))
    || typeof record.score !== 'number' || !Number.isFinite(record.score) || record.score < 0 || record.score > 100
    || !metric(record.sleepHrs, 0, 16) || !metric(record.stress, 1, 5, true)
    || !metric(record.soreness, 1, 5, true) || !metric(record.motivation, 1, 5, true)) {
    throw apiError({ code: 'INVALID_RESPONSE', message: 'El servidor devolvió un readiness incompatible. Reintenta.' }, '');
  }
  return record;
}

async function loadReadiness(session: MobileSession, signal: AbortSignal) {
  const response = await withMobileAuth((client) => client.GET('/readiness/latest', { signal }), session);
  if (response.error || response.data === undefined) throw apiError(
    response.error, 'No se pudo cargar el readiness de hoy.', response.response.status,
  );
  return response.data === null ? null : confirmedReadiness(response.data, session);
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

async function saveReadiness(session: MobileSession, values: ReadinessValues) {
  const response = await withMobileAuth((client) => client.POST('/readiness/checkin', { body: values }), session);
  if (!response.data || response.error) throw new Error('No se pudo guardar el readiness.');
  return confirmedReadiness(response.data, session);
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
      // Device feedback must neither reject nor delay a confirmed update.
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
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

  return (
    <Screen>
      <ScreenHeader
        eyebrow="TU CUENTA"
        subtitle="Datos personales, ciclo y readiness en un solo lugar."
        title="Perfil"
      />

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Avatar name={draft.name || user?.email || 'EVRY'} size={46} />
          <View style={styles.cardHeaderCopy}>
            <Text style={styles.cardTitle}>Datos personales</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <Field label="Nombre">
          <TextInput
            accessibilityLabel="Nombre"
            autoCapitalize="words"
            maxLength={120}
            onChangeText={(name) => updateDraft({ name })}
            placeholder="Tu nombre"
            placeholderTextColor={theme.colors.textDim}
            style={styles.input}
            value={draft.name}
          />
        </Field>
        {profileErrors.name ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.name}</Text> : null}

        <Field label="Fecha de nacimiento">
          <TextInput
            accessibilityLabel="Fecha de nacimiento"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            onChangeText={(birthDate) => updateDraft({ birthDate })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textDim}
            style={styles.input}
            value={draft.birthDate}
          />
        </Field>
        <Text style={textStyles.muted}>Formato: YYYY-MM-DD</Text>
        {profileErrors.birthDate ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.birthDate}</Text> : null}

        <Text style={styles.label}>Sexo biológico</Text>
        <View style={styles.options}>
          {sexOptions.map((option) => {
            const selected = draft.biologicalSex === option.value;
            return (
              <Pressable
                accessibilityLabel={`Sexo biológico: ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.value}
                onPress={() => updateDraft({ biologicalSex: option.value })}
                style={[styles.option, selected && styles.optionSelected]}
              >
                {selected ? <AppIcon color={theme.colors.onPrimary} name="check" size={14} /> : null}
                <Text style={selected ? styles.optionTextSelected : styles.optionText}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {profileErrors.biologicalSex ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.biologicalSex}</Text> : null}

        <Text style={styles.label}>Objetivos</Text>
        <View style={styles.options}>
          {goalOptions.map((option) => {
            const selected = draft.goals.includes(option.value);
            return (
              <Pressable
                accessibilityLabel={`Objetivo: ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.value}
                onPress={() => toggleGoal(option.value)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                {selected ? <AppIcon color={theme.colors.onPrimary} name="check" size={14} /> : null}
                <Text style={selected ? styles.optionTextSelected : styles.optionText}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {profileErrors.goals ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.goals}</Text> : null}

        <View style={styles.switchRow}>
          <View style={styles.switchIcon}>
            <AppIcon color={theme.colors.cycle} name="calendar_month" size={18} />
          </View>
          <View style={styles.switchCopy}>
            <Text style={styles.switchTitle}>Seguimiento de ciclo</Text>
            <Text style={textStyles.muted}>Opcional para cualquier persona.</Text>
          </View>
          <Switch
            accessibilityLabel="Activar seguimiento de ciclo"
            onValueChange={toggleCycleTracking}
            thumbColor={draft.trackCycle ? theme.colors.text : theme.colors.textDim}
            trackColor={{ false: theme.colors.surfaceHighest, true: theme.colors.cycle }}
            value={draft.trackCycle}
          />
        </View>
        {profileErrors.trackCycle ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.trackCycle}</Text> : null}

        {draft.trackCycle ? (
          <View style={styles.cycleLengths}>
            <View style={styles.cycleField}>
              <Field label="Promedio de ciclo (días)">
                <TextInput
                  accessibilityLabel="Promedio de ciclo (días)"
                  inputMode="numeric"
                  keyboardType="number-pad"
                  onChangeText={(avgCycleLen) => updateDraft({ avgCycleLen })}
                  placeholder="28"
                  placeholderTextColor={theme.colors.textDim}
                  style={styles.input}
                  value={draft.avgCycleLen}
                />
              </Field>
              {profileErrors.avgCycleLen ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.avgCycleLen}</Text> : null}
            </View>
            <View style={styles.cycleField}>
              <Field label="Promedio de periodo (días)">
                <TextInput
                  accessibilityLabel="Promedio de periodo (días)"
                  inputMode="numeric"
                  keyboardType="number-pad"
                  onChangeText={(avgPeriodLen) => updateDraft({ avgPeriodLen })}
                  placeholder="5"
                  placeholderTextColor={theme.colors.textDim}
                  style={styles.input}
                  value={draft.avgPeriodLen}
                />
              </Field>
              {profileErrors.avgPeriodLen ? <Text accessibilityRole="alert" style={textStyles.error}>{profileErrors.avgPeriodLen}</Text> : null}
            </View>
          </View>
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
      </Card>

      <SectionHeader detail="Contexto diario para sugerencias conservadoras." title="Bienestar" />

      <DailyReadiness session={session} />

      <RestPreferencesCard key={JSON.stringify([session.serverUrl, session.userId, session.version])} session={session} />

      <PrimaryButton icon={<AppIcon color={theme.colors.error} name="logout" size={19} />} onPress={() => void logout()} variant="danger">
        Cerrar sesión
      </PrimaryButton>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function DailyReadiness({ session }: { session: MobileSession }) {
  const { day, refreshDay } = useReadinessDay();
  return <ReadinessForm key={JSON.stringify([session.serverUrl, session.userId, session.version, day])}
    session={session} day={day} refreshDay={refreshDay} />;
}

function ReadinessForm({ session, day, refreshDay }: {
  session: MobileSession; day: CivilDate; refreshDay: () => void;
}) {
  const [draft, setDraft] = useState<ReadinessDraft>(() => ({
    values: { sleepHrs: 7, stress: 3, soreness: 2, motivation: 3 }, touched: {}, source: undefined, version: 0,
  }));
  const [confirmedValues, setConfirmedValues] = useState<ReadinessValues | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const owned = () => alive.current && isCurrentMobileSession(session) && day === todayCivil(new Date(Date.now()));
  const queryClient = useQueryClient();
  const readinessKey = ['readiness', session.serverUrl, session.userId, session.version, day];
  const readinessQuery = useQuery({ queryKey: readinessKey,
    queryFn: ({ signal }) => loadReadiness(session, signal), networkMode: 'always' });
  // Adjust only this component's state when its canonical source changes.
  // An external refresh must not replace any field the user has edited.
  if (draft.source !== readinessQuery.data) {
    const values = { ...draft.values };
    if (readinessQuery.data) for (const field of readinessFields) {
      if (!draft.touched[field]) values[field] = readinessQuery.data[field];
    }
    setDraft({ ...draft, values, source: readinessQuery.data });
  }
  const updateField = (field: ReadinessField, value: number | null) => setDraft(current => {
    if (current.values[field] === value) return current;
    return { ...current, values: { ...current.values, [field]: value },
      touched: { ...current.touched, [field]: true }, version: current.version + 1 };
  });
  const readinessMutation = useMutation({
    onMutate: () => { setConfirmedValues(null); },
    mutationFn: ({ values }: { values: ReadinessValues; version: number }) => {
      if (day !== todayCivil(new Date(Date.now()))) {
        refreshDay();
        throw new Error('El día cambió. Registra el readiness del nuevo día.');
      }
      if (!owned()) throw new Error('La sesión cambió. Vuelve a intentar la operación.');
      return saveReadiness(session, values);
    },
    onSuccess: async (saved, submitted) => {
      if (!owned()) return;
      // A GET begun before the save must not overwrite the confirmed POST.
      await queryClient.cancelQueries({ queryKey: readinessKey, exact: true });
      if (!owned()) return;
      const canonical = queryClient.setQueryData<Readiness | null>(readinessKey, saved);
      setDraft(current => current.version === submitted.version
        ? { ...current, values: readinessValues(saved), touched: {}, source: canonical }
        : { ...current, source: canonical });
      setConfirmedValues(readinessValues(saved));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    },
  });
  const score = readinessQuery.data?.score ?? null;
  return <Card style={styles.readiness}>
    <View style={styles.readinessHeader}>
      <View style={styles.readinessIcon}>
        <AppIcon color={theme.colors.success} name="monitor_heart" size={20} />
      </View>
      <View style={styles.readinessCopy}>
        <Text style={styles.cardTitle}>Readiness de hoy</Text>
        <Text accessibilityLabel="Fecha de readiness" style={textStyles.muted}>{day}</Text>
      </View>
      {score !== null ? (
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeText}>{score}</Text>
          <Text style={styles.scoreBadgeUnit}>/100</Text>
        </View>
      ) : null}
    </View>
    <Text style={textStyles.muted}>Sirve como contexto para sugerencias conservadoras; no cambia cargas automáticamente.</Text>
    {score !== null ? (
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${Math.max(0, Math.min(100, score))}%` }]} />
      </View>
    ) : null}
    {readinessQuery.isFetching ? <Text accessibilityLiveRegion="polite" style={textStyles.muted}>Consultando readiness de hoy…</Text> : null}
    {readinessQuery.data ? <Text style={styles.scoreText}>Puntaje actual: {readinessQuery.data.score}/100</Text> : null}
    {readinessQuery.isError ? <Text accessibilityRole="alert" style={textStyles.error}>No pudimos consultar el registro de hoy.</Text> : null}
    {readinessQuery.isError && readinessQuery.data ? <Text style={textStyles.muted}>Se conserva el último puntaje consultado; no se pudo actualizar.</Text> : null}
    {readinessQuery.isSuccess && readinessQuery.data === null ? <Text style={textStyles.muted}>No has registrado readiness hoy.</Text> : null}
    <PrimaryButton disabled={readinessQuery.isFetching} onPress={() => void readinessQuery.refetch()} variant="secondary">
      {readinessQuery.isError ? 'Reintentar readiness' : 'Actualizar readiness'}
    </PrimaryButton>

    <View style={styles.metrics}>
      <MetricStepper label="Horas de sueño" max={16} min={0} onChange={value => updateField('sleepHrs', value)} step={0.5} value={draft.values.sleepHrs} />
      <MetricStepper label="Estrés" max={5} min={1} onChange={value => updateField('stress', value)} value={draft.values.stress} />
      <MetricStepper label="Dolor muscular" max={5} min={1} onChange={value => updateField('soreness', value)} value={draft.values.soreness} />
      <MetricStepper label="Motivación" max={5} min={1} onChange={value => updateField('motivation', value)} value={draft.values.motivation} />
    </View>

    {readinessMutation.error ? <Text accessibilityRole="alert" style={textStyles.error}>{readinessMutation.error.message}</Text> : null}
    {readinessMutation.isSuccess && confirmedValues !== null ? <Text accessibilityLiveRegion="polite" style={styles.success}>
      {readinessFields.every(field => confirmedValues[field] === draft.values[field])
        ? 'Readiness guardado para hoy.' : 'Registro guardado; tienes cambios sin guardar.'}
    </Text> : null}
    <PrimaryButton disabled={readinessMutation.isPending} onPress={() => readinessMutation.mutate({ values: { ...draft.values }, version: draft.version })}>
      {readinessMutation.isPending ? 'Guardando…' : 'Guardar readiness'}
    </PrimaryButton>
  </Card>;
}

function MetricStepper(props: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number | null) => void;
  step?: number;
  value: number | null;
}) {
  const step = props.step ?? 1;
  const change = (direction: -1 | 1) => {
    // Choosing a value from unset is explicit; merely loading/saving never
    // replaces null with zero or a standard answer.
    props.onChange(props.value === null ? props.min : Math.max(props.min, Math.min(props.max, props.value + direction * step)));
    void Haptics.selectionAsync().catch(() => undefined);
  };
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{props.label}</Text>
      <View style={styles.metricControls}>
        <Pressable
          accessibilityHint={props.value === null ? `Comenzar a registrar en ${props.min}` : undefined}
          accessibilityLabel={`Reducir ${props.label}`}
          accessibilityRole="button"
          onPress={() => void change(-1)}
          style={styles.stepButton}
        >
          <AppIcon color={theme.colors.text} name="remove" size={20} />
        </Pressable>
        <Text
          accessibilityLabel={`Valor de ${props.label}`}
          accessibilityLiveRegion="polite"
          style={styles.stepValue}
        >
          {props.value === null ? 'Sin registrar' : props.value}
        </Text>
        <Pressable
          accessibilityHint={props.value === null ? `Comenzar a registrar en ${props.min}` : undefined}
          accessibilityLabel={`Aumentar ${props.label}`}
          accessibilityRole="button"
          onPress={() => void change(1)}
          style={styles.stepButton}
        >
          <AppIcon color={theme.colors.text} name="add" size={20} />
        </Pressable>
      </View>
      <Pressable
        accessibilityLabel={`Dejar sin registrar ${props.label}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: props.value === null }}
        disabled={props.value === null}
        onPress={() => props.onChange(null)}
        style={styles.metricClear}
      >
        <Text style={styles.metricClearText}>Dejar sin registrar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.gutter },
  cardHeaderCopy: { flex: 1, gap: 1 },
  cardTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  email: { color: theme.colors.textMuted, fontSize: 12 },
  field: { gap: 6 },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  input: {
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  optionSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  optionText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  optionTextSelected: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: '800' },
  switchRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: 12,
  },
  switchIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.cycleSoft,
    borderRadius: theme.radii.full,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  switchCopy: { flex: 1, gap: 1 },
  switchTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  cycleLengths: { flexDirection: 'row', gap: theme.spacing.sm },
  cycleField: { flex: 1, gap: 4 },
  success: { color: theme.colors.success, fontSize: 14 },
  readiness: { gap: theme.spacing.sm },
  readinessHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.gutter },
  readinessIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.successSoft,
    borderRadius: theme.radii.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  readinessCopy: { flex: 1, gap: 1 },
  scoreBadge: {
    alignItems: 'baseline',
    backgroundColor: theme.colors.successSoft,
    borderRadius: theme.radii.full,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  scoreBadgeText: { color: theme.colors.success, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  scoreBadgeUnit: { color: theme.colors.success, fontSize: 10, fontWeight: '700' },
  scoreTrack: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 99, height: 6, overflow: 'hidden' },
  scoreFill: { backgroundColor: theme.colors.success, borderRadius: 99, height: 6 },
  scoreText: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  metrics: { gap: theme.spacing.sm },
  metric: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.lg,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  metricControls: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'space-between' },
  stepButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  stepValue: { color: theme.colors.text, flex: 1, fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '800', textAlign: 'center' },
  metricClear: { alignSelf: 'center', justifyContent: 'center', minHeight: 30 },
  metricClearText: { color: theme.colors.textDim, fontSize: 11, fontWeight: '600' },
});
