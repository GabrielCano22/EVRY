import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  adjustRestTimer, finishRestTimer, pauseRestTimer, remainingRestMs, resumeRestTimer,
  skipRestTimer, startRestTimer, type RestTimerState,
} from '@evry/domain';
import { isCurrentMobileSession, type MobileSession } from '../api/client';
import { useSessionStore } from '../auth/session-store';
import { loadRestTimer, saveRestTimer } from '../db/database';
import { loadRestNotificationsEnabled } from '../notifications/preferences';
import { cancelRestReminder, syncRestReminder } from '../notifications/rest-reminder';
import { AppIcon } from '../ui/icon';
import { theme } from '../ui/theme';
import { useTrainingStore } from './training-store';
import { formatRest } from './format-rest';

export interface RestStartRequest {
  /** Identity of the request; a new key starts a new rest. */
  key: string;
  seconds: number;
  /** Shown while a reduced rest is running («Calentamiento · 01:00»). */
  label: string | null;
  exerciseId: string;
  /** Used only for the native notification body. */
  exerciseName?: string | null;
}

const AUTO_HIDE_MS = 3_000;

/**
 * Anchored rest bar. It owns the durable timer and never blocks training:
 * clearing a set, going offline or closing the keyboard all keep working.
 */
export function RestTimer({ session, workoutId, startRequest, onAdjustExercise }: {
  session: MobileSession;
  workoutId: string;
  startRequest: RestStartRequest | null;
  onAdjustExercise: (exerciseId: string, deltaSeconds: number) => void;
}) {
  const [timer, setTimer] = useState<RestTimerState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const [hidden, setHidden] = useState(false);
  const [totalMs, setTotalMs] = useState(1);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const alive = useRef(false);
  const busy = useRef(false);
  const failedWrite = useRef<RestTimerState | null>(null);
  const lastRequestKey = useRef<string | null>(null);
  const activeExerciseName = useRef<string | null>(null);
  const localSaveState = useTrainingStore(state => state.localSaveState);
  const owned = useCallback(() => {
    const training = useTrainingStore.getState();
    return alive.current && isCurrentMobileSession(session) && useSessionStore.getState().session === session
      && training.session === session && training.ready && training.activeWorkout?.clientId === workoutId
      && training.activeWorkout.status === 'ACTIVE';
  }, [session, workoutId]);

  const hydrate = useCallback(() => {
    if (!owned() || busy.current) return Promise.resolve();
    busy.current = true;
    // Hydration updates are responses to the native storage operation, never
    // synchronous state resets during effect setup.
    return loadRestTimer(session, workoutId).then(saved => {
      if (!owned()) return;
      setTimer(saved);
      setLoaded(true);
      setError(null);
      setNow(Date.now());
      if (saved) {
        setTotalMs(Math.max(1, saved.remainingMs));
        setHidden(false);
        if (saved.mode === 'RUNNING' && !saved.notificationDelivered) {
          const remainingMs = remainingRestMs(saved, Date.now());
          if (remainingMs > 0) {
            void syncRestReminder({
              workoutId,
              seconds: Math.ceil(remainingMs / 1000),
              exerciseName: activeExerciseName.current,
              enabled: notificationsEnabled,
              requestPermission: false,
            }).catch(() => undefined);
          }
        }
      }
    }).catch((reason: unknown) => {
      if (owned()) setError(reason instanceof Error ? reason.message : 'No se pudo recuperar el descanso.');
    }).finally(() => { busy.current = false; });
  }, [owned, session, workoutId, notificationsEnabled]);

  const commit = useCallback(async (next: RestTimerState): Promise<boolean> => {
    if (!owned() || busy.current || useTrainingStore.getState().localSaveState === 'saving') return false;
    busy.current = true;
    setSaving(true);
    // Reserve a single completion attempt durably before optional native haptics.
    // A process interruption/device refusal must not cause repeated vibrations.
    const notify = next.mode === 'FINISHED' && !next.notificationDelivered;
    const durable = notify ? { ...next, notificationDelivered: true } : next;
    failedWrite.current = next;
    try {
      await saveRestTimer(session, workoutId, durable);
      if (!owned()) return false;
      failedWrite.current = null;
      setTimer(durable);
      setError(null);
      setNow(Date.now());
      if (notify && AppState.currentState === 'active') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
      const seconds = durable.mode === 'RUNNING' && durable.deadlineMs !== null
        ? Math.max(1, Math.ceil((durable.deadlineMs - Date.now()) / 1000))
        : 0;
      void syncRestReminder({
        workoutId,
        seconds,
        exerciseName: activeExerciseName.current,
        enabled: notificationsEnabled && durable.mode === 'RUNNING' && !durable.notificationDelivered,
        requestPermission: true,
      }).catch(() => undefined);
      return true;
    } catch (reason) {
      if (owned()) setError(reason instanceof Error ? reason.message : 'No se pudo guardar el descanso.');
      return false;
    } finally {
      busy.current = false;
      if (owned()) setSaving(false);
    }
  }, [owned, session, workoutId, notificationsEnabled]);

  useEffect(() => {
    let active = true;
    void loadRestNotificationsEnabled(session)
      .then((enabled) => { if (active) setNotificationsEnabled(enabled); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [session]);

  useEffect(() => () => { void cancelRestReminder(workoutId); }, [workoutId]);

  useEffect(() => {
    alive.current = true;
    void hydrate();
    return () => { alive.current = false; };
  }, [hydrate]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const tick = () => {
      if (cancelled || !owned() || AppState.currentState !== 'active') return;
      const time = Date.now();
      setNow(time);
      if (timer && !error && !busy.current && !timer.notificationDelivered
        && (timer.mode === 'FINISHED' || (timer.mode === 'RUNNING' && remainingRestMs(timer, time) === 0))) {
        void commit(finishRestTimer(timer, time));
      }
    };
    const watch = () => {
      if (interval) clearInterval(interval);
      interval = undefined;
      if (AppState.currentState === 'active') {
        void Promise.resolve().then(tick);
        if (timer?.mode === 'RUNNING') interval = setInterval(tick, 1000);
      }
    };
    const subscription = AppState.addEventListener('change', watch);
    watch();
    return () => { cancelled = true; if (interval) clearInterval(interval); subscription.remove(); };
  }, [timer, error, owned, commit]);

  // Start a fresh rest when a set is completed. If the previous local write is
  // still in flight, the effect runs again as soon as it settles.
  useEffect(() => {
    if (!startRequest || !loaded || error || saving || localSaveState === 'saving') return;
    if (lastRequestKey.current === startRequest.key) return;
    lastRequestKey.current = startRequest.key;
    setHidden(false);
    setTotalMs(Math.max(1, startRequest.seconds * 1000));
    setActiveExerciseId(startRequest.exerciseId);
    setActiveLabel(startRequest.label);
    activeExerciseName.current = startRequest.exerciseName?.trim() || null;
    void commit(startRestTimer(startRequest.seconds));
  }, [startRequest, loaded, error, saving, localSaveState, commit]);

  // The finished bar stays long enough to be read, then gets out of the way.
  useEffect(() => {
    if (timer?.mode !== 'FINISHED' || hidden) return;
    const timeout = setTimeout(() => setHidden(true), AUTO_HIDE_MS);
    return () => clearTimeout(timeout);
  }, [timer, hidden]);

  const errorRow = error ? <View style={styles.errorRow}>
    <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
    <Pressable
      accessibilityLabel="Reintentar descanso"
      accessibilityRole="button"
      disabled={saving}
      onPress={() => void (failedWrite.current ? commit(failedWrite.current) : hydrate())}
      style={styles.errorRetry}
    >
      <Text style={styles.actionText}>Reintentar</Text>
    </Pressable>
  </View> : null;

  // A failed first write still needs a visible retry: never hide the failure
  // behind a bar that only exists once something has been stored.
  if (!timer) {
    if (!errorRow) return null;
    return <View style={styles.bar}>
      {errorRow}
      <View style={styles.row}>
        <Text style={styles.caption}>No se pudo guardar el descanso.</Text>
      </View>
    </View>;
  }
  if (hidden) return null;

  const remaining = remainingRestMs(timer, now);
  const seconds = Math.ceil(remaining / 1000);
  const progress = Math.max(0, Math.min(1, remaining / Math.max(1, totalMs)));
  const disabled = !loaded || saving || Boolean(error) || localSaveState === 'saving';
  const running = timer.mode === 'RUNNING';
  const finished = timer.mode === 'FINISHED';

  const adjust = (delta: number) => {
    if (!owned()) return;
    void commit(adjustRestTimer(timer, delta));
    if (activeExerciseId) {
      setTotalMs(value => Math.max(1, value + delta * 1000));
      onAdjustExercise(activeExerciseId, delta);
    }
  };

  return (
    <View style={styles.bar}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      {errorRow}
      <View style={styles.row}>
        <Pressable
          accessibilityLabel="Restar quince segundos de descanso"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled || finished}
          onPress={() => adjust(-15)}
          style={[styles.step, (disabled || finished) && styles.disabled]}
        >
          <Text style={styles.stepText}>−15</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={finished ? 'Descanso terminado' : running ? 'Pausar descanso' : 'Reanudar descanso'}
          accessibilityRole="button"
          accessibilityLiveRegion="polite"
          accessibilityState={{ disabled }}
          disabled={disabled || finished}
          onPress={() => void commit(running ? pauseRestTimer(timer) : resumeRestTimer(timer))}
          style={styles.clock}
        >
          <Text style={styles.time}>{formatRest(seconds)}</Text>
          <Text numberOfLines={1} style={styles.caption}>
            {finished ? 'Descanso terminado' : timer.mode === 'PAUSED' ? 'Pausado · toca para seguir' : (activeLabel ?? 'Descanso')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Añadir quince segundos de descanso"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled || finished}
          onPress={() => adjust(15)}
          style={[styles.step, (disabled || finished) && styles.disabled]}
        >
          <Text style={styles.stepText}>+15</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Omitir descanso"
          accessibilityRole="button"
          disabled={disabled || finished}
          onPress={() => void commit(skipRestTimer(timer))}
          style={[styles.skip, (disabled || finished) && styles.disabled]}
        >
          <AppIcon color={theme.colors.textMuted} name="skip_next" size={17} />
          <Text style={styles.skipText}>Omitir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.colors.backgroundElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 12,
    elevation: 12,
    left: 12,
    overflow: 'hidden',
    position: 'absolute',
    right: 12,
  },
  progressTrack: { backgroundColor: theme.colors.surfaceHigh, height: 3 },
  progressFill: { backgroundColor: theme.colors.primary, height: 3 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 2, paddingHorizontal: 8, paddingVertical: 8 },
  step: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radii.full,
    height: 44,
    justifyContent: 'center',
    minWidth: 48,
  },
  stepText: { color: theme.colors.text, fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '700' },
  clock: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 48 },
  time: { color: theme.colors.text, fontSize: 26, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: -0.5 },
  caption: { color: theme.colors.textMuted, fontSize: 10, maxWidth: 150 },
  skip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 64,
  },
  skipText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  actionText: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  errorRow: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  error: { color: theme.colors.error, flex: 1, fontSize: 12 },
  errorRetry: { justifyContent: 'center', minHeight: 44 },
  disabled: { opacity: 0.4 },
});
