import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SET_TYPE_CHIPS, SET_TYPE_LABELS, setTypeOf } from '@evry/domain';
import type { LocalWorkoutSet } from './workout-domain';
import { setTypeColor } from './SetTypeSheet';
import { theme } from '../ui/theme';

export interface SetTarget {
  weightKg: number | null;
  reps: number | null;
  action: 'HOLD' | 'PROGRESS' | 'DELOAD';
}

export function SetRow({ set, ordinal, previous, target, timed, editable, compact = false, onToggle, onChange, onTypePress, onOptions }: {
  set: LocalWorkoutSet;
  ordinal: string;
  previous?: { weightKg: number | null; reps: number | null; durationS?: number | null };
  target?: SetTarget | null;
  timed: boolean;
  editable: boolean;
  compact?: boolean;
  onToggle: () => void;
  onChange: (changes: Partial<LocalWorkoutSet>) => void;
  onTypePress: () => void;
  onOptions: () => void;
}) {
  const type = setTypeOf(set);
  const completed = set.completedAt !== null;
  const targetLabel = target && (target.weightKg !== null || target.reps !== null)
    ? `${target.weightKg ?? '—'} × ${target.reps ?? '—'}`
    : null;
  const previousLabel = previous
    ? `${previous.weightKg ?? '—'} × ${previous.reps ?? '—'}`
    : '—';
  const applyTarget = () => {
    if (!target) return;
    onChange({
      ...(target.weightKg !== null ? { weightKg: target.weightKg } : {}),
      ...(target.reps !== null ? { reps: target.reps } : {}),
    });
  };
  return (
    <View style={[styles.row, completed && styles.rowCompleted]}>
      <Pressable
        accessibilityLabel={`Tipo de serie: ${SET_TYPE_LABELS[type]}`}
        accessibilityRole="button"
        disabled={!editable}
        onPress={onTypePress}
        style={[styles.type, { borderColor: setTypeColor(type) }]}
      >
        <Text style={[styles.typeText, { color: setTypeColor(type) }]}>{SET_TYPE_CHIPS[type]}</Text>
      </Pressable>
      <Text accessibilityLabel={`Serie ${ordinal}`} style={styles.ordinal}>{ordinal}</Text>
      {timed ? (
        <SetNumberInput
          accessibilityLabel={`Duración de la serie ${ordinal} en segundos`}
          editable={editable}
          integer
          maximum={86400}
          onChange={(durationS) => onChange({ durationS })}
          style={styles.wideInput}
          value={set.durationS}
        />
      ) : (
        <>
          {compact ? null : <Text numberOfLines={1} style={[styles.previous, styles.flex]}>{previousLabel}</Text>}
          <Pressable
            accessibilityLabel={targetLabel ? `Objetivo ${targetLabel}; tocar para copiar` : 'Sin objetivo disponible'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !editable || !targetLabel }}
            disabled={!editable || !targetLabel}
            onPress={applyTarget}
            style={styles.flex}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.target,
                target?.action === 'DELOAD' && { color: theme.colors.warning },
                target?.action === 'PROGRESS' && { color: theme.colors.success },
              ]}
            >
              {target?.action === 'PROGRESS' && targetLabel ? '↑ ' : ''}{targetLabel ?? '—'}
            </Text>
          </Pressable>
          <SetNumberInput
            accessibilityLabel={`Peso de la serie ${ordinal} en kilos`}
            editable={editable}
            maximum={2000}
            onChange={(weightKg) => onChange({ weightKg })}
            style={styles.input}
            value={set.weightKg}
          />
          <SetNumberInput
            accessibilityLabel={`Repeticiones de la serie ${ordinal}`}
            editable={editable}
            integer
            maximum={1000}
            onChange={(reps) => onChange({ reps })}
            style={styles.repsInput}
            value={set.reps}
          />
        </>
      )}
      <Pressable
        accessibilityLabel={`Serie ${ordinal}: ${completed ? 'completada' : 'pendiente'}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, disabled: !editable }}
        disabled={!editable}
        onPress={onToggle}
        style={[styles.check, completed && styles.checkCompleted]}
      >
        <Text style={[styles.checkText, completed && styles.checkTextCompleted]}>{completed ? '✓' : '○'}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel={`Opciones de la serie ${ordinal}`}
        accessibilityRole="button"
        onPress={onOptions}
        style={styles.options}
      >
        <Text style={styles.optionsText}>⋯</Text>
      </Pressable>
    </View>
  );
}

export function SetTableHeader({ timed, compact = false }: { timed: boolean; compact?: boolean }) {
  return (
    <View style={styles.header}>
      <Text style={[styles.headerText, styles.typeHeader]}>TIPO</Text>
      <Text style={[styles.headerText, styles.ordinal]}>SERIE</Text>
      {timed ? <Text style={[styles.headerText, styles.flex]}>DURACIÓN (S)</Text> : (
        <>
          {compact ? null : <Text style={[styles.headerText, styles.flex]}>ANTERIOR</Text>}
          <Text style={[styles.headerText, styles.flex]}>OBJETIVO</Text>
          <Text style={[styles.headerText, styles.input]}>KG</Text>
          <Text style={[styles.headerText, styles.repsInput]}>REPS</Text>
        </>
      )}
      <Text style={[styles.headerText, styles.check]}>✓</Text>
      <Text style={[styles.headerText, styles.options]}> </Text>
    </View>
  );
}

function SetNumberInput({ value, editable, onChange, accessibilityLabel, style, integer = false, maximum }: {
  value: number | null;
  editable: boolean;
  onChange: (value: number | null) => void;
  accessibilityLabel: string;
  style: object;
  integer?: boolean;
  maximum: number;
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const [previous, setPrevious] = useState(value);
  if (previous !== value) {
    setPrevious(value);
    setDraft(value === null ? '' : String(value));
  }
  const change = (text: string) => {
    setDraft(text);
    const normalized = text.trim().replace(',', '.');
    if (normalized === '') {
      onChange(null);
      return;
    }
    const parsed = Number(normalized);
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) || !Number.isFinite(parsed)
      || parsed < 0 || parsed > maximum || (integer && !Number.isInteger(parsed))) return;
    onChange(parsed);
  };
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      editable={editable}
      inputMode={integer ? 'numeric' : 'decimal'}
      keyboardType={integer ? 'number-pad' : 'decimal-pad'}
      maxLength={8}
      onChangeText={change}
      placeholder="—"
      placeholderTextColor={theme.colors.textMuted}
      selectTextOnFocus
      style={[styles.numberInput, style, !editable && styles.inputDisabled]}
      value={draft}
    />
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: 4, paddingHorizontal: 2 },
  headerText: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  typeHeader: { width: 40 },
  row: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    minHeight: 46,
    paddingHorizontal: 2,
  },
  rowCompleted: { backgroundColor: 'rgba(48,209,88,0.16)' },
  type: { alignItems: 'center', borderRadius: 7, borderWidth: 2, height: 34, justifyContent: 'center', width: 38 },
  typeText: { fontSize: 13, fontWeight: '800' },
  ordinal: { color: theme.colors.textMuted, fontVariant: ['tabular-nums'], fontSize: 13, textAlign: 'center', width: 34 },
  flex: { flex: 1, minWidth: 34 },
  previous: { color: theme.colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] },
  target: { color: theme.colors.text, fontSize: 12, fontVariant: ['tabular-nums'] },
  numberInput: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.surfaceHigh,
    borderRadius: 8,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    height: 38,
    paddingHorizontal: 6,
    paddingVertical: 0,
    textAlign: 'center',
  },
  input: { width: 62 },
  repsInput: { width: 50 },
  wideInput: { flex: 1 },
  inputDisabled: { opacity: 0.7 },
  check: { alignItems: 'center', height: 44, justifyContent: 'center', width: 40 },
  checkCompleted: { backgroundColor: theme.colors.success, borderRadius: 9 },
  checkText: { color: theme.colors.textMuted, fontSize: 18 },
  checkTextCompleted: { color: theme.colors.background, fontWeight: '900' },
  options: { alignItems: 'center', height: 44, justifyContent: 'center', width: 30 },
  optionsText: { color: theme.colors.textMuted, fontSize: 18 },
});
