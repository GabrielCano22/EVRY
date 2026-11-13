import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MAX_REST_SECONDS, MIN_REST_SECONDS, REST_STEP_SECONDS, normalizeRestSeconds,
  restSecondsForSetType,
} from '@evry/domain';
import { BottomSheet } from '../ui/bottom-sheet';
import { AppIcon } from '../ui/icon';
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
      subtitle="Este ajuste solo afecta a este ejercicio en este dispositivo."
      title={title}
      visible={visible}
    >
      <View style={styles.display}>
        <Text accessibilityLabel="Descanso configurado" style={styles.value}>{formatRest(draft)}</Text>
        <Text style={styles.displayCaption}>Descanso para las series de trabajo de este ejercicio.</Text>
        <View style={styles.controls}>
          <Pressable
            accessibilityLabel="Restar quince segundos"
            accessibilityRole="button"
            accessibilityState={{ disabled: draft <= MIN_REST_SECONDS }}
            disabled={draft <= MIN_REST_SECONDS}
            onPress={() => step(-REST_STEP_SECONDS)}
            style={[styles.step, draft <= MIN_REST_SECONDS && styles.disabled]}
          >
            <AppIcon color={theme.colors.text} name="remove" size={22} />
          </Pressable>
          <Text style={styles.stepHint}>15 s</Text>
          <Pressable
            accessibilityLabel="Añadir quince segundos"
            accessibilityRole="button"
            accessibilityState={{ disabled: draft >= MAX_REST_SECONDS }}
            disabled={draft >= MAX_REST_SECONDS}
            onPress={() => step(REST_STEP_SECONDS)}
            style={[styles.step, draft >= MAX_REST_SECONDS && styles.disabled]}
          >
            <AppIcon color={theme.colors.text} name="add" size={22} />
          </Pressable>
        </View>
      </View>
      <View style={styles.note}>
        <View style={styles.noteHeader}>
          <AppIcon color={theme.colors.warning} name="bolt" size={17} />
          <Text style={styles.noteTitle}>Calentamiento y drop set</Text>
        </View>
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
  display: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  value: { color: theme.colors.text, fontSize: 46, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: -1 },
  displayCaption: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' },
  controls: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'center' },
  step: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.full,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  stepHint: { color: theme.colors.textDim, fontSize: 11, fontWeight: '700' },
  note: { backgroundColor: theme.colors.surfaceHigh, borderRadius: theme.radii.lg, gap: 4, padding: 12 },
  noteHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  noteTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  reset: { justifyContent: 'center', minHeight: 44 },
  resetText: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
