import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayCivil } from '@evry/domain';

const currentDay = () => todayCivil(new Date(Date.now()));

/** Readiness follows the API's Bogotá day, not the phone's presentation zone. */
export function useReadinessDay() {
  const [day, setDay] = useState(currentDay);
  const refreshDay = useCallback(() => setDay(currentDay()), []);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
    const watch = () => {
      stop();
      if (disposed || AppState.currentState !== 'active') return;
      const now = Date.now();
      const nextDay = todayCivil(new Date(now));
      setDay(nextDay);
      // Bogotá's civil midnight is UTC-05:00, matching the shared domain zone.
      const midnight = new Date(`${nextDay}T00:00:00-05:00`).getTime() + 86_400_000;
      timer = setTimeout(watch, Math.max(1, midnight - now));
    };
    const subscription = AppState.addEventListener('change', watch);
    // Respond asynchronously to native state; no synchronous effect state reset.
    void Promise.resolve().then(watch);
    return () => { disposed = true; stop(); subscription.remove(); };
  }, []);
  return { day, refreshDay };
}
