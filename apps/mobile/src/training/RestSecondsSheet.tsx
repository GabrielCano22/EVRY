import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MAX_REST_SECONDS, MIN_REST_SECONDS, REST_STEP_SECONDS, normalizeRestSeconds,
  restSecondsForSetType,
} from '@evry/domain';
import { BottomSheet } from '../ui/bottom-sheet';
import { PrimaryButton, textStyles } from '../ui/components';
import { formatRest } from './format-rest';
import { theme } from '../ui/theme';

/**
 * Rest selector for one exercise. `null` means "use the global default", which
 * is how an override is removed without guessing a replacement value.
 */
export function RestSecondsSheet({ visible, title, seconds, defaultSeconds, hasOverride, saving, error, onSave, onClose }: {
  visible: boolean;
  title: string;
  seconds: number;
  defaultSeconds: number;
  hasOverride: boolean;
  saving: boolean;
  error: string | null;
  onSave: (seconds: number | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(seconds);
  const step = (delta: number) => setDraft((value) => normalizeRestSeconds(value + delta));
  return (
    <BottomSheet
      footer={<PrimaryButton disabled={saving} onPress={() => onSave(normalizeRestSeconds(draft))}>
        {saving ? 'Guardando…' : 'Guardar descanso'}
      </PrimaryButton>}
      onClose={onClose}
      title={title}
      visible={visible}
    >
      <Text style={textStyles.muted}>Descanso para las series de trabajo de este ejercicio.</Text>
      <Text accessibilityLabel="Descanso configurado" style={styles.value}>{formatRest(draft)}</Text>
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Restar quince segundos"
          accessibilityRole="button"
          accessibilityState={{ disabled: draft <= MIN_REST_SECONDS }}
          disabled={draft <= MIN_REST_SECONDS}
          onPress={() => step(-REST_STEP_SECONDS)}
          style={styles.step}
        >
          <Text style={styles.stepText}>−15</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Añadir quince segundos"
          accessibilityRole="button"
          accessibilityState={{ disabled: draft >= MAX_REST_SECONDS }}
          disabled={draft >= MAX_REST_SECONDS}
          onPress={() => step(REST_STEP_SECONDS)}
          style={styles.step}
        >
          <Text style={styles.stepText}>+15</Text>
        </Pressable>
      </View>
      <View style={styles.note}>
        <Text style={textStyles.body}>Calentamiento y drop set</Text>
        <Text style={textStyles.muted}>
          Descansan al 50 %: {formatRest(restSecondsForSetType(draft, 'WARMUP'))} con este ajuste.
        </Text>
      </View>
      <Text style={textStyles.muted}>Predeterminado de tu cuenta: {formatRest(defaultSeconds)}.</Text>
      {hasOverride ? (
        <Pressable
          accessibilityLabel="Usar el descanso predeterminado"
          accessibilityRole="button"
          disabled={saving}
          onPress={() => onSave(null)}
          style={styles.reset}
        >
          <Text style={styles.resetText}>Usar predeterminado</Text>
        </Pressable>
      ) : null}
      {error ? <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  value: { color: theme.colors.text, fontSize: 44, fontVariant: ['tabular-nums'], fontWeight: '800', textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  step: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    minWidth: 96,
  },
  stepText: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  note: { backgroundColor: theme.colors.surfaceHigh, borderRadius: 10, gap: 2, padding: 12 },
  reset: { justifyContent: 'center', minHeight: 44 },
  resetText: { color: theme.colors.primary, fontSize: 15, fontWeight: '700' },
});
