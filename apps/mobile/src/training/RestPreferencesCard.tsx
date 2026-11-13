import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import {
  MAX_REST_SECONDS, MIN_REST_SECONDS, REST_STEP_SECONDS, restSecondsForSetType,
} from '@evry/domain';
import type { MobileSession } from '../api/client';
import { ensureNotificationPermission } from '../notifications/permissions';
import {
  loadRestNotificationsEnabled, saveRestNotificationsEnabled,
} from '../notifications/preferences';
import { AppIcon } from '../ui/icon';
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
  const [notifyOnFinish, setNotifyOnFinish] = useState(true);
  const [notifyReady, setNotifyReady] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  useEffect(() => { void load(session); }, [session, load]);
  useEffect(() => {
    let active = true;
    void loadRestNotificationsEnabled(session)
      .then((enabled) => { if (active) { setNotifyOnFinish(enabled); setNotifyReady(true); } })
      .catch(() => { if (active) setNotifyReady(true); });
    return () => { active = false; };
  }, [session]);

  const toggleNotify = async (enabled: boolean) => {
    setNotifyError(null);
    if (enabled) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        setNotifyError('El sistema no permite notificaciones. Actívalas en Ajustes para recibir el aviso.');
        return;
      }
    }
    try {
      await saveRestNotificationsEnabled(session, enabled);
      setNotifyOnFinish(enabled);
    } catch {
      setNotifyError('No se pudo guardar la preferencia de avisos.');
    }
  };

  const base = preferences.defaultRestSeconds;
  const step = (delta: number) => {
    const next = Math.max(MIN_REST_SECONDS, Math.min(MAX_REST_SECONDS, base + delta));
    if (next === base) return;
    void setDefault(next).catch(() => undefined);
  };
  const busy = !ready || saving;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <AppIcon color={theme.colors.primary} name="timer" size={20} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={textStyles.heading}>Descanso entre series</Text>
          <Text style={textStyles.muted}>Solo en este dispositivo.</Text>
        </View>
      </View>
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
          <AppIcon color={theme.colors.text} name="remove" size={20} />
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
          <AppIcon color={theme.colors.text} name="add" size={20} />
        </Pressable>
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.status}>
        {saving ? 'Guardando…' : ready ? 'Guardado automático.' : 'Leyendo preferencias…'}
      </Text>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>Avisar al terminar</Text>
          <Text style={textStyles.muted}>Aunque el teléfono esté bloqueado.</Text>
        </View>
        <Switch
          accessibilityLabel="Avisar al terminar el descanso"
          disabled={busy || !notifyReady}
          onValueChange={(enabled) => void toggleNotify(enabled)}
          thumbColor={notifyOnFinish ? theme.colors.text : theme.colors.textDim}
          trackColor={{ false: theme.colors.surfaceHighest, true: theme.colors.primary }}
          value={notifyOnFinish}
        />
      </View>
      {notifyError ? <Text accessibilityRole="alert" style={textStyles.error}>{notifyError}</Text> : null}
      {error ? <View style={styles.errorBox}>
        <Text accessibilityRole="alert" style={textStyles.error}>{error}</Text>
        <PrimaryButton disabled={saving} onPress={() => void load(session)} variant="secondary">Reintentar</PrimaryButton>
      </View> : null}
      <Text style={styles.hint}>
        Los ejercicios con un descanso propio mantienen su valor; se cambia desde la sesión.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: theme.spacing.gutter },
  icon: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: { flex: 1, gap: 1 },
  stepper: {
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.radii.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  valueBox: { alignItems: 'center', flex: 1, gap: 1 },
  value: { color: theme.colors.text, fontSize: 28, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: -0.6 },
  valueCaption: { color: theme.colors.textMuted, fontSize: 11 },
  status: { color: theme.colors.textDim, fontSize: 11 },
  switchRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.radii.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 56,
    paddingHorizontal: 10,
  },
  switchCopy: { flex: 1, gap: 1 },
  switchTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  errorBox: { gap: 8 },
  hint: { color: theme.colors.textDim, fontSize: 11, lineHeight: 16 },
  disabled: { opacity: 0.4 },
});
