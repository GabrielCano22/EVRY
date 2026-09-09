import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { civilDate, todayCivil } from '@evry/domain';
import type { components } from '@evry/api-client';
import { PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';

export type CycleEntry = components['schemas']['CycleEntry'];
export type CycleInput = components['schemas']['CycleEntryInput'];
const flows = { NONE: 'Sin flujo', SPOTTING: 'Manchado', LIGHT: 'Ligero', MEDIUM: 'Moderado', HEAVY: 'Abundante' } as const;

export function CycleEntryForm({ entry, today = todayCivil(), busy, onSave, onCancel }: {
  entry?: CycleEntry;
  today?: string;
  busy: boolean;
  onSave: (input: CycleInput) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(entry?.date.slice(0, 10) ?? today);
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
      <Text style={textStyles.heading}>{entry ? 'Editar registro' : 'Nuevo registro'}</Text>
      <Text style={textStyles.body}>Fecha (AAAA-MM-DD)</Text>
      <TextInput accessibilityLabel="Fecha del registro" editable={!busy} maxLength={10} value={date} onChangeText={setDate} style={styles.input} />
      <Text style={textStyles.body}>Flujo</Text>
      {Object.entries(flows).map(([value, label]) => (
        <PrimaryButton key={value} disabled={busy} accessibilityState={{ selected: flow === value }} onPress={() => setFlow(value as CycleEntry['flow'])}>
          {flow === value ? `✓ ${label}` : label}
        </PrimaryButton>
      ))}
      <Text style={textStyles.body}>Síntomas (uno por línea)</Text>
      <TextInput accessibilityLabel="Síntomas" editable={!busy} multiline maxLength={2430} value={symptoms} onChangeText={setSymptoms} style={styles.input} />
      <Text style={textStyles.body}>Energía (1–5, opcional)</Text>
      <TextInput accessibilityLabel="Energía" editable={!busy} keyboardType="number-pad" maxLength={2} value={energy} onChangeText={setEnergy} style={styles.input} />
      <Text style={textStyles.body}>Ánimo (1–5, opcional)</Text>
      <TextInput accessibilityLabel="Ánimo" editable={!busy} keyboardType="number-pad" maxLength={2} value={mood} onChangeText={setMood} style={styles.input} />
      <Text style={textStyles.body}>Notas</Text>
      <TextInput accessibilityLabel="Notas" editable={!busy} multiline maxLength={2000} value={notes} onChangeText={setNotes} style={styles.input} />
      <Text style={textStyles.body}>Inicio del periodo</Text>
      <Switch accessibilityLabel="Inicio del periodo" disabled={busy} value={isPeriodStart} onValueChange={setPeriodStart} />
      {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
      <PrimaryButton disabled={busy} onPress={save}>{busy ? 'Guardando…' : 'Guardar registro'}</PrimaryButton>
      <PrimaryButton disabled={busy} onPress={onCancel}>Cancelar</PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, padding: 16, borderRadius: 12, backgroundColor: theme.colors.surface },
  input: { minHeight: 48, padding: 12, backgroundColor: theme.colors.surfaceHigh, color: theme.colors.text, borderRadius: 8, fontSize: 16 },
});
