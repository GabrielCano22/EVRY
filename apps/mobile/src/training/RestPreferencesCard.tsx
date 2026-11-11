import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MAX_REST_SECONDS, MIN_REST_SECONDS, REST_STEP_SECONDS, restSecondsForSetType,
} from '@evry/domain';
import type { MobileSession } from '../api/client';
import { PrimaryButton, textStyles } from '../ui/components';
import { theme } from '../ui/theme';
import { formatRest } from './format-rest';
import { useRestPreferencesStore } from './rest-preferences-store';

/**
 * Device-level rest default. It is deliberately local: Phase 1 does not sync
 * rest preferences across devices, so this card never talks to the server.
 */
export function RestPreferencesCard({ session }: { session: MobileSession }) {
  const preferences = useRestPreferencesStore((state) => state.preferences);
  const ready = useRestPreferencesStore((state) => state.ready);
  const saving = useRestPreferencesStore((state) => state.saving);
  const error = useRestPreferencesStore((state) => state.error);
  const load = useRestPreferencesStore((state) => state.load);
  const setDefault = useRestPreferencesStore((state) => state.setDefault);

  useEffect(() => { void load(session); }, [session, load]);

  const base = preferences.defaultRestSeconds;
  const step = (delta: number) => {
    const next = Math.max(MIN_REST_SECONDS, Math.min(MAX_REST_SECONDS, base + delta));
    if (next === base) return;
    void setDefault(next).catch(() => undefined);
  };
  const busy = !ready || saving;

  return (
    <View style={styles.card}>
      <Text style={textStyles.heading}>Descanso entre series</Text>
      <Text style={textStyles.muted}>
        Se guarda solo en este dispositivo. Calentamiento y drop set descansan la mitad.
      </Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel="Restar quince segundos al descanso predeterminado"
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || base <= MIN_REST_SECONDS }}
          disabled={busy || base <= MIN_REST_SECONDS}
          onPress={() => step(-REST_STEP_SECONDS)}
          style={[styles.stepButton, (busy || base <= MIN_REST_SECONDS) && styles.disabled]}
        >
          <Text style={styles.stepText}>−15</Text>
        </Pressable>
        <View
          accessibilityLabel={`Descanso predeterminado ${formatRest(base)}`}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
          style={styles.valueBox}
        >
          <Text style={styles.value}>{formatRest(base)}</Text>
          <Text style={styles.valueCaption}>
            Calentamiento / drop {formatRest(restSecondsForSetType(base, 'WARMUP'))}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Añadir quince segundos al descanso predeterminado"
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || base >= MAX_REST_SECONDS }}
          disabled={busy || base >= MAX_REST_SECONDS}
          onPress={() => step(REST_STEP_SECONDS)}
          style={[styles.stepButton, (busy || base >= MAX_REST_SECONDS) && styles.disabled]}
        >
          <Text style={styles.stepText}>+15</Text>
        </Pressable>
      </View>
      <Text accessibilityLiveRegion="polite" style={textStyles.muted}>
        {saving ? 'Guardando…' : ready ? 'Guardado automático.' : 'Leyendo preferencias…'}
      </Text>
      {error ? <View style={styles.errorBox}>
        <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text>
        <PrimaryButton disabled={saving} onPress={() => void load(session)}>Reintentar</PrimaryButton>
      </View> : null}
      <Text style={textStyles.muted}>
        Los ejercicios con un descanso propio mantienen su valor; se cambia desde la sesión.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, gap: 10, padding: 18 },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  stepButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    width: 64,
  },
  stepText: { color: theme.colors.text, fontSize: 16, fontVariant: ['tabular-nums'], fontWeight: '700' },
  valueBox: { alignItems: 'center', flex: 1, gap: 2 },
  value: { color: theme.colors.text, fontSize: 30, fontVariant: ['tabular-nums'], fontWeight: '800' },
  valueCaption: { color: theme.colors.textMuted, fontSize: 12 },
  errorBox: { gap: 8 },
  disabled: { opacity: 0.45 },
});
