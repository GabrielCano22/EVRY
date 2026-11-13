import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { civilDate, todayCivil } from '@evry/domain';
import type { components } from '@evry/api-client';
import { AppIcon } from '../ui/icon';
import { PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';

export type CycleEntry = components['schemas']['CycleEntry'];
export type CycleInput = components['schemas']['CycleEntryInput'];
const flows = { NONE: 'Sin flujo', SPOTTING: 'Manchado', LIGHT: 'Ligero', MEDIUM: 'Moderado', HEAVY: 'Abundante' } as const;

/** Shared with the calendar day sheet so both render the same labels. */
export const CYCLE_FLOW_LABELS: Record<CycleEntry['flow'], string> = flows;

export function CycleEntryForm({ entry, today = todayCivil(), initialDate, busy, onSave, onCancel }: {
  entry?: CycleEntry;
  today?: string;
  /** Pre-selected date when creating from a calendar day. Never bypasses the future check. */
  initialDate?: string;
  busy: boolean;
  onSave: (input: CycleInput) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(entry?.date.slice(0, 10) ?? initialDate ?? today);
  const [flow, setFlow] = useState<CycleEntry['flow']>(entry?.flow ?? 'NONE');
  const [symptoms, setSymptoms] = useState(entry?.symptoms.join('\n') ?? '');
  const [energy, setEnergy] = useState(entry?.energy?.toString() ?? '');
  const [mood, setMood] = useState(entry?.mood?.toString() ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [isPeriodStart, setPeriodStart] = useState(entry?.isPeriodStart ?? false);
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    if (busy) return;
    try {
      const label = civilDate(date);
      if (label > today) throw new Error('La fecha no puede ser futura.');
      const score = (value: string) => {
        if (!value.trim()) return null;
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) throw new Error('Energía y ánimo deben estar entre 1 y 5, o quedar vacíos.');
        return parsed;
      };
      const items = symptoms.split('\n').map((item) => item.trim()).filter(Boolean);
      if (items.length > 30 || items.some((item) => item.length > 80)) throw new Error('Usa hasta 30 síntomas de máximo 80 caracteres cada uno.');
      const input: CycleInput = { date: label, flow, symptoms: items, energy: score(energy), mood: score(mood), notes: notes || null, isPeriodStart };
      if (entry) input.previousDate = entry.date.slice(0, 10);
      setError(null);
      onSave(input);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Revisa los campos.');
    }
  };
  return (
    <View style={styles.form}>
      <View style={styles.formHeader}>
        <View style={styles.formIcon}>
          <AppIcon color={theme.colors.cycle} name="calendar_month" size={21} />
        </View>
        <View style={styles.formCopy}>
          <Text style={styles.formTitle}>{entry ? 'Editar registro' : 'Nuevo registro'}</Text>
          <Text style={textStyles.muted}>Solo tú ves este registro. Puedes dejarlo incompleto.</Text>
        </View>
      </View>

      <Field label="Fecha (AAAA-MM-DD)">
        <TextInput
          accessibilityLabel="Fecha del registro"
          editable={!busy}
          maxLength={10}
          onChangeText={setDate}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={theme.colors.textDim}
          style={styles.input}
          value={date}
        />
      </Field>

      <View style={styles.field}>
        <Text style={styles.label}>Flujo</Text>
        <View accessibilityLabel="Flujo" accessibilityRole="radiogroup" style={styles.flowOptions}>
          {Object.entries(flows).map(([value, label]) => {
            const selected = flow === value;
            return (
              <Pressable
                accessibilityLabel={`Flujo: ${label}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                disabled={busy}
                key={value}
                onPress={() => setFlow(value as CycleEntry['flow'])}
                style={[styles.flowOption, selected && styles.flowOptionSelected, busy && styles.disabled]}
              >
                <View style={[styles.flowDot, { backgroundColor: selected ? theme.colors.onPrimary : theme.colors.cycle }]} />
                <Text style={selected ? styles.flowTextSelected : styles.flowText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Field label="Síntomas (uno por línea)">
        <TextInput
          accessibilityLabel="Síntomas"
          editable={!busy}
          multiline
          maxLength={2430}
          onChangeText={setSymptoms}
          placeholder="Cólicos, dolor de cabeza…"
          placeholderTextColor={theme.colors.textDim}
          style={[styles.input, styles.multiline]}
          value={symptoms}
        />
      </Field>

      <View style={styles.pair}>
        <View style={styles.half}>
          <Field label="Energía (1–5, opcional)">
            <TextInput
              accessibilityLabel="Energía"
              editable={!busy}
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={setEnergy}
              placeholder="—"
              placeholderTextColor={theme.colors.textDim}
              style={styles.input}
              value={energy}
            />
          </Field>
        </View>
        <View style={styles.half}>
          <Field label="Ánimo (1–5, opcional)">
            <TextInput
              accessibilityLabel="Ánimo"
              editable={!busy}
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={setMood}
              placeholder="—"
              placeholderTextColor={theme.colors.textDim}
              style={styles.input}
              value={mood}
            />
          </Field>
        </View>
      </View>

      <Field label="Notas">
        <TextInput
          accessibilityLabel="Notas"
          editable={!busy}
          multiline
          maxLength={2000}
          onChangeText={setNotes}
          placeholder="Contexto opcional del día"
          placeholderTextColor={theme.colors.textDim}
          style={[styles.input, styles.multiline]}
          value={notes}
        />
      </Field>

      <View style={styles.choice}>
        <View style={styles.choiceCopy}>
          <Text style={styles.choiceTitle}>Inicio del periodo</Text>
          <Text style={textStyles.muted}>Marca el primer día de sangrado.</Text>
        </View>
        <Switch
          accessibilityLabel="Inicio del periodo"
          disabled={busy}
          onValueChange={setPeriodStart}
          thumbColor={isPeriodStart ? theme.colors.text : theme.colors.textDim}
          trackColor={{ false: theme.colors.surfaceHighest, true: theme.colors.cycle }}
          value={isPeriodStart}
        />
      </View>

      {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
      <PrimaryButton disabled={busy} onPress={save}>{busy ? 'Guardando…' : 'Guardar registro'}</PrimaryButton>
      <PrimaryButton disabled={busy} onPress={onCancel} variant="ghost">Cancelar</PrimaryButton>
    </View>
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

const styles = StyleSheet.create({
  form: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  formHeader: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.gutter },
  formIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.cycleSoft,
    borderRadius: theme.radii.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  formCopy: { flex: 1, gap: 1 },
  formTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  field: { gap: 7 },
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
  multiline: { minHeight: 78, textAlignVertical: 'top' },
  pair: { flexDirection: 'row', gap: theme.spacing.sm },
  half: { flex: 1 },
  flowOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flowOption: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  flowOptionSelected: { backgroundColor: theme.colors.cycle, borderColor: theme.colors.cycle },
  flowDot: { borderRadius: 99, height: 6, width: 6 },
  flowText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  flowTextSelected: { color: theme.colors.onPrimary, fontSize: 13, fontWeight: '800' },
  choice: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.lg,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: 12,
  },
  choiceCopy: { flex: 1, gap: 1 },
  choiceTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
