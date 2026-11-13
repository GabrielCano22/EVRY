import { Redirect, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSessionStore } from '@/src/auth/session-store';
import { ensureNotificationPermission } from '@/src/notifications/permissions';
import { useSupplementsStore } from '@/src/supplements/store';
import { useSupplementDay } from '@/src/supplements/use-supplement-day';
import {
  ALL_WEEKDAYS,
  WEEKDAY_LABELS,
  draftFromSupplement,
  emptySupplementDraft,
  reminderSummary,
  validateSupplementDraft,
  type Supplement,
  type SupplementDraft,
} from '@/src/supplements/supplement';
import { BottomSheet } from '@/src/ui/bottom-sheet';
import {
  Card, EmptyState, PrimaryButton, Screen, ScreenHeader, SectionHeader, textStyles,
} from '@/src/ui/components';
import { AppIcon } from '@/src/ui/icon';
import { theme } from '@/src/ui/theme';

type EditorTarget = Supplement | 'new' | null;

export default function SupplementsScreen() {
  const session = useSessionStore((state) => state.session);
  const supplements = useSupplementsStore((state) => state.supplements);
  const intakes = useSupplementsStore((state) => state.intakes);
  const ready = useSupplementsStore((state) => state.ready);
  const saving = useSupplementsStore((state) => state.saving);
  const error = useSupplementsStore((state) => state.error);
  const load = useSupplementsStore((state) => state.load);
  const save = useSupplementsStore((state) => state.save);
  const remove = useSupplementsStore((state) => state.remove);
  const markTaken = useSupplementsStore((state) => state.markTaken);
  const undo = useSupplementsStore((state) => state.undo);
  const [editor, setEditor] = useState<EditorTarget>(null);

  useEffect(() => {
    if (session) void load(session);
  }, [session, load]);

  useSupplementDay(session, load);

  if (!session) return <Redirect href="/login" />;

  const takenCount = supplements.filter((supplement) => intakes[supplement.id]).length;
  const closeEditor = () => { setEditor(null); };

  const toggleTaken = async (supplement: Supplement) => {
    try {
      if (intakes[supplement.id]) await undo(session, supplement.id);
      else await markTaken(session, supplement.id);
      void Haptics.selectionAsync().catch(() => undefined);
    } catch {
      // The store publishes the error; the list stays usable.
    }
  };

  const saveDraft = async (draft: SupplementDraft) => {
    await save(session, draft);
    closeEditor();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const confirmDelete = (supplement: Supplement) => {
    Alert.alert(
      'Eliminar suplemento',
      `Se quitará «${supplement.name}» y su historial de tomas de este dispositivo.`,
      [
        { text: 'Conservar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void remove(session, supplement.id)
              .then(() => { closeEditor(); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined); })
              .catch(() => undefined);
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader
        action={<Pressable accessibilityLabel="Volver" accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <AppIcon color={theme.colors.text} name="arrow_back" size={22} />
        </Pressable>}
        eyebrow="BIENESTAR"
        subtitle="Registro local. EVRY no sugiere dosis ni sustituye consejo médico."
        title="Suplementos"
      />

      {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}

      <Card style={styles.todayCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <AppIcon color={theme.colors.success} name="today" size={20} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={textStyles.heading}>Hoy</Text>
            <Text style={textStyles.muted}>
              {supplements.length === 0 ? 'Sin suplementos configurados.' : `${takenCount} de ${supplements.length} tomados`}
            </Text>
          </View>
        </View>
        {supplements.length === 0 ? <Text style={textStyles.muted}>
          Añade un suplemento para llevar un registro diario en este dispositivo.
        </Text> : supplements.map((supplement) => {
          const taken = Boolean(intakes[supplement.id]);
          return <Pressable
            accessibilityLabel={taken ? `Desmarcar ${supplement.name} como tomado` : `Marcar ${supplement.name} como tomado`}
            accessibilityRole="button"
            accessibilityState={{ selected: taken }}
            key={supplement.id}
            onPress={() => void toggleTaken(supplement)}
            style={({ pressed }) => [styles.todayRow, taken && styles.todayRowTaken, pressed && styles.pressed]}
          >
            <View style={[styles.check, taken && styles.checkTaken]}>
              {taken ? <AppIcon color={theme.colors.onPrimary} name="check" size={17} /> : null}
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{supplement.name}</Text>
              <Text style={textStyles.muted}>{supplement.dosage ?? 'Sin dosis indicada'}</Text>
            </View>
            <Text style={taken ? styles.takenLabel : styles.pendingLabel}>{taken ? 'Tomado' : 'Pendiente'}</Text>
          </Pressable>;
        })}
      </Card>

      <SectionHeader
        actionLabel="Agregar"
        detail="Solo en este dispositivo"
        onAction={() => setEditor('new')}
        title="Tus suplementos"
      />

      {supplements.length === 0 ? <EmptyState
        action={<PrimaryButton onPress={() => setEditor('new')}>Agregar suplemento</PrimaryButton>}
        description="Nombre, dosis si la conoces y un recordatorio semanal opcional."
        icon="medication"
        title="Aún no registras suplementos"
      /> : supplements.map((supplement) => <Card key={supplement.id} style={styles.supplementCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <AppIcon color={theme.colors.primary} name="medication" size={20} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={styles.rowTitle}>{supplement.name}</Text>
            <Text style={textStyles.muted}>{supplement.dosage ?? 'Sin dosis indicada'}</Text>
          </View>
          <Pressable
            accessibilityLabel={`Editar ${supplement.name}`}
            accessibilityRole="button"
            onPress={() => setEditor(supplement)}
            style={styles.iconButton}
          >
            <AppIcon color={theme.colors.textMuted} name="edit" size={19} />
          </Pressable>
        </View>
        <View style={styles.metaRow}>
          <AppIcon
            color={supplement.reminderEnabled ? theme.colors.primary : theme.colors.textDim}
            name={supplement.reminderEnabled ? 'notifications_active' : 'notifications_off'}
            size={16}
          />
          <Text style={textStyles.muted}>{reminderSummary(supplement)}</Text>
        </View>
        {supplement.notes ? <Text style={styles.notes}>{supplement.notes}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton compact onPress={() => setEditor(supplement)} variant="secondary">Editar</PrimaryButton>
          <PrimaryButton compact onPress={() => confirmDelete(supplement)} variant="danger">Eliminar</PrimaryButton>
        </View>
      </Card>)}

      {!ready && supplements.length === 0 ? <Text style={textStyles.muted}>Leyendo suplementos locales…</Text> : null}

      <Card style={styles.disclaimer}>
        <View style={styles.metaRow}>
          <AppIcon color={theme.colors.textMuted} name="info" size={17} />
          <Text style={styles.disclaimerText}>
            EVRY guarda lo que tú declaras. No sugiere dosis, pautas ni interacciones. Consulta a un profesional sanitario si tienes dudas.
          </Text>
        </View>
      </Card>

      <BottomSheet
        onClose={closeEditor}
        subtitle="Los recordatorios se programan en este dispositivo."
        title={editor === 'new' ? 'Nuevo suplemento' : 'Editar suplemento'}
        visible={editor !== null}
      >
        {editor !== null ? <SupplementForm
          initial={editor === 'new' ? null : editor}
          key={editor === 'new' ? 'new' : editor.id}
          onCancel={closeEditor}
          onSave={saveDraft}
          saving={saving}
        /> : null}
      </BottomSheet>
    </Screen>
  );
}

function SupplementForm({ initial, saving, onSave, onCancel }: {
  initial: Supplement | null;
  saving: boolean;
  onSave: (draft: SupplementDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<SupplementDraft>(() => initial ? draftFromSupplement(initial) : emptySupplementDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const update = (changes: Partial<SupplementDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(changes)) delete next[key];
      return next;
    });
  };

  const toggleWeekday = (iso: number) => {
    const selected = draft.reminderWeekdays.includes(iso);
    update({
      reminderWeekdays: selected
        ? draft.reminderWeekdays.filter((day) => day !== iso)
        : [...draft.reminderWeekdays, iso].sort((a, b) => a - b),
    });
  };

  const submit = async () => {
    const validation = validateSupplementDraft(draft);
    setErrors(validation.errors);
    setFailure(null);
    if (!validation.value) return;
    if (draft.reminderEnabled) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        setFailure('El sistema no permite notificaciones. Actívalas en Ajustes para usar recordatorios.');
        return;
      }
    }
    try {
      await onSave(draft);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'No se pudo guardar el suplemento.');
    }
  };

  return <View style={styles.form}>
    <Text style={styles.fieldLabel}>Nombre</Text>
    <TextInput
      accessibilityLabel="Nombre del suplemento"
      autoCapitalize="sentences"
      editable={!saving}
      maxLength={80}
      onChangeText={(name) => update({ name })}
      placeholder="Por ejemplo, creatina"
      placeholderTextColor={theme.colors.textDim}
      style={styles.input}
      value={draft.name}
    />
    {errors.name ? <Text accessibilityRole="alert" style={textStyles.error}>{errors.name}</Text> : null}

    <Text style={styles.fieldLabel}>Dosis que tú usas (opcional)</Text>
    <TextInput
      accessibilityLabel="Dosis del suplemento"
      editable={!saving}
      maxLength={80}
      onChangeText={(dosage) => update({ dosage })}
      placeholder="Sin dosis indicada"
      placeholderTextColor={theme.colors.textDim}
      style={styles.input}
      value={draft.dosage}
    />
    {errors.dosage ? <Text accessibilityRole="alert" style={textStyles.error}>{errors.dosage}</Text> : null}

    <Text style={styles.fieldLabel}>Notas (opcional)</Text>
    <TextInput
      accessibilityLabel="Notas del suplemento"
      editable={!saving}
      maxLength={240}
      multiline
      onChangeText={(notes) => update({ notes })}
      placeholder="Marca, sabor u otra nota personal"
      placeholderTextColor={theme.colors.textDim}
      style={[styles.input, styles.multiline]}
      value={draft.notes}
    />
    {errors.notes ? <Text accessibilityRole="alert" style={textStyles.error}>{errors.notes}</Text> : null}

    <View style={styles.switchRow}>
      <View style={styles.cardCopy}>
        <Text style={styles.switchTitle}>Recordatorio semanal</Text>
        <Text style={textStyles.muted}>Notificación local en este dispositivo.</Text>
      </View>
      <Switch
        accessibilityLabel="Activar recordatorio del suplemento"
        disabled={saving}
        onValueChange={(reminderEnabled) => update({ reminderEnabled })}
        thumbColor={draft.reminderEnabled ? theme.colors.text : theme.colors.textDim}
        trackColor={{ false: theme.colors.surfaceHighest, true: theme.colors.primary }}
        value={draft.reminderEnabled}
      />
    </View>

    {draft.reminderEnabled ? <>
      <Text style={styles.fieldLabel}>Hora</Text>
      <TextInput
        accessibilityLabel="Hora del recordatorio"
        editable={!saving}
        inputMode="numeric"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        onChangeText={(reminderTime) => update({ reminderTime })}
        placeholder="HH:MM"
        placeholderTextColor={theme.colors.textDim}
        style={styles.input}
        value={draft.reminderTime}
      />
      {errors.reminderTime ? <Text accessibilityRole="alert" style={textStyles.error}>{errors.reminderTime}</Text> : null}
      <Text style={styles.fieldLabel}>Días</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {WEEKDAY_LABELS.map((day) => {
          const selected = draft.reminderWeekdays.includes(day.iso);
          return <Pressable
            accessibilityLabel={`Recordatorio ${day.long}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={day.iso}
            onPress={() => toggleWeekday(day.iso)}
            style={[styles.day, selected && styles.daySelected]}
          >
            <Text style={selected ? styles.dayTextSelected : styles.dayText}>{day.short}</Text>
          </Pressable>;
        })}
        <Pressable
          accessibilityLabel="Seleccionar todos los días"
          accessibilityRole="button"
          onPress={() => update({ reminderWeekdays: [...ALL_WEEKDAYS] })}
          style={styles.dayAll}
        >
          <Text style={styles.dayAllText}>Todos</Text>
        </Pressable>
      </ScrollView>
      {errors.reminderWeekdays ? <Text accessibilityRole="alert" style={textStyles.error}>{errors.reminderWeekdays}</Text> : null}
      <Text style={styles.hint}>Si no hay permiso de notificaciones, el registro diario sigue funcionando.</Text>
    </> : null}

    {failure ? <Text accessibilityRole="alert" style={textStyles.error}>{failure}</Text> : null}

    <View style={styles.formActions}>
      <PrimaryButton disabled={saving} onPress={onCancel} variant="secondary">Cancelar</PrimaryButton>
      <PrimaryButton disabled={saving || draft.name.trim().length === 0} onPress={() => void submit()}>
        {saving ? 'Guardando…' : 'Guardar suplemento'}
      </PrimaryButton>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  todayCard: { gap: theme.spacing.sm },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  cardCopy: { flex: 1, gap: 1 },
  rowCopy: { flex: 1, gap: 1 },
  rowTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  todayRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  todayRowTaken: { backgroundColor: theme.colors.successSoft, borderColor: 'rgba(48,209,88,0.32)' },
  check: {
    alignItems: 'center',
    borderColor: theme.colors.border,
    borderRadius: theme.radii.full,
    borderWidth: 1.5,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  checkTaken: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  takenLabel: { color: theme.colors.success, fontSize: 11, fontWeight: '800' },
  pendingLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.82 },
  supplementCard: { gap: theme.spacing.sm },
  iconButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  notes: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  disclaimer: { backgroundColor: theme.colors.backgroundElevated },
  disclaimerText: { color: theme.colors.textMuted, flex: 1, fontSize: 12, lineHeight: 18 },
  form: { gap: theme.spacing.sm },
  fieldLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: {
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    color: theme.colors.text,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm, minHeight: 52 },
  switchTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  days: { gap: 6, paddingVertical: 2 },
  day: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  daySelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayText: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  dayTextSelected: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: '800' },
  dayAll: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dayAllText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  hint: { color: theme.colors.textDim, fontSize: 11, lineHeight: 16 },
  formActions: { flexDirection: 'row', gap: theme.spacing.sm, paddingTop: theme.spacing.xs },
});
