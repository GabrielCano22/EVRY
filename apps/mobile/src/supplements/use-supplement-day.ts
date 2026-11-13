import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { MobileSession } from '../api/client';
import { localCivilDate } from './supplement';

export function useSupplementDay(session: MobileSession | null, load: (session: MobileSession) => Promise<void>) {
  useEffect(() => {
    if (!session) return;
    let day = localCivilDate();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watch = () => {
      if (timer) clearTimeout(timer);
      if (AppState.currentState !== 'active') return;
      const now = new Date();
      const today = localCivilDate(now);
      if (today !== day) {
        day = today;
        void load(session);
      }
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(watch, Math.max(1, midnight.getTime() - now.getTime()));
    };
    const subscription = AppState.addEventListener('change', watch);
    watch();
    return () => { if (timer) clearTimeout(timer); subscription.remove(); };
  }, [session, load]);
}
