import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { adjustRestTimer, finishRestTimer, pauseRestTimer, remainingRestMs, resumeRestTimer,
  startRestTimer, type RestTimerState } from '@evry/domain';
import { isCurrentMobileSession, type MobileSession } from '../api/client';
import { useSessionStore } from '../auth/session-store';
import { loadRestTimer, saveRestTimer } from '../db/database';
import { PrimaryButton, textStyles } from '../ui/components';
import { useTrainingStore } from './training-store';

export function RestTimer({ session, workoutId }: { session: MobileSession; workoutId: string }) {
  const [timer, setTimer] = useState<RestTimerState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const alive = useRef(false);
  const busy = useRef(false);
  const failedWrite = useRef<RestTimerState | null>(null);
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
      if (owned()) { setTimer(saved); setLoaded(true); setError(null); setNow(Date.now()); }
    }).catch((reason: unknown) => {
      if (owned()) setError(reason instanceof Error ? reason.message : 'No se pudo recuperar el descanso.');
    }).finally(() => { busy.current = false; });
  }, [owned, session, workoutId]);

  const commit = useCallback(async (next: RestTimerState) => {
    if (!owned() || busy.current || useTrainingStore.getState().localSaveState === 'saving') return;
    busy.current = true;
    setSaving(true);
    // Reserve a single completion attempt durably before optional native haptics.
    // A process interruption/device refusal must not cause repeated vibrations.
    const notify = next.mode === 'FINISHED' && !next.notificationDelivered;
    const durable = notify ? { ...next, notificationDelivered: true } : next;
    failedWrite.current = next;
    try {
      await saveRestTimer(session, workoutId, durable);
      if (!owned()) return;
      failedWrite.current = null;
      setTimer(durable); setError(null); setNow(Date.now());
      if (notify && AppState.currentState === 'active') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    } catch (reason) {
      if (owned()) setError(reason instanceof Error ? reason.message : 'No se pudo guardar el descanso.');
    } finally {
      busy.current = false;
      if (owned()) setSaving(false);
    }
  }, [owned, session, workoutId]);

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

  const seconds = Math.ceil(timer ? remainingRestMs(timer, now) / 1000 : 120);
  const display = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const disabled = !loaded || saving || Boolean(error) || localSaveState === 'saving';
  return <View style={{ gap: 8 }}>
    <Text style={textStyles.heading}>Descanso</Text>
    <Text accessibilityLabel="Tiempo de descanso" style={textStyles.title}>{display}</Text>
    {!loaded && !error ? <Text style={textStyles.muted}>Recuperando descanso…</Text> : null}
    {loaded && !timer ? <Text style={textStyles.muted}>Listo para iniciar. El descanso se guarda en este dispositivo.</Text> : null}
    {saving ? <Text accessibilityLiveRegion="polite" style={textStyles.muted}>Guardando descanso…</Text> : null}
    {timer?.mode === 'PAUSED' ? <Text style={textStyles.muted}>Descanso pausado</Text> : null}
    {timer?.mode === 'FINISHED' ? <Text accessibilityLiveRegion="polite" style={textStyles.body}>Descanso terminado</Text> : null}
    {error ? <><Text accessibilityRole="alert" style={textStyles.error}>{error}</Text>
      <PrimaryButton disabled={saving} onPress={() => void (failedWrite.current ? commit(failedWrite.current) : hydrate())}>Reintentar descanso</PrimaryButton></> : null}
    <PrimaryButton disabled={disabled} onPress={() => void commit(startRestTimer(120))}>
      {timer ? 'Reiniciar descanso' : 'Iniciar descanso'}
    </PrimaryButton>
    {timer && timer.mode !== 'FINISHED' ? <>
      <PrimaryButton disabled={disabled} onPress={() => void commit(timer.mode === 'RUNNING' ? pauseRestTimer(timer) : resumeRestTimer(timer))}>
        {timer.mode === 'RUNNING' ? 'Pausar descanso' : 'Reanudar descanso'}
      </PrimaryButton>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <PrimaryButton disabled={disabled} onPress={() => void commit(adjustRestTimer(timer, -10))}>Restar 10 segundos</PrimaryButton>
        <PrimaryButton disabled={disabled} onPress={() => void commit(adjustRestTimer(timer, 10))}>Añadir 10 segundos</PrimaryButton>
      </View>
    </> : null}
  </View>;
}
