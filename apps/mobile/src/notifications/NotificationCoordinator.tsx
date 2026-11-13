import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSessionStore } from '../auth/session-store';
import { useSupplementsStore, recordIntakeFromNotification } from '../supplements/store';
import { localCivilDate } from '../supplements/supplement';
import {
  SUPPLEMENT_TAKEN_ACTION,
  ensureNotificationChannels,
} from './channels';
import { syncSupplementReminders } from './supplement-reminders';

const RECENT_RESPONSE_MS = 120_000;

function supplementIdOf(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data;
  return data?.kind === 'supplement' && typeof data.supplementId === 'string' ? data.supplementId : null;
}

/**
 * Owns the native notification lifecycle. It is intentionally thin: the
 * durable state lives in SQLite and the timer keeps its own state.
 */
export function NotificationCoordinator() {
  const session = useSessionStore((state) => state.session);
  const supplements = useSupplementsStore((state) => state.supplements);
  const ready = useSupplementsStore((state) => state.ready);
  const supplementSession = useSupplementsStore((state) => state.session);
  const loadSupplements = useSupplementsStore((state) => state.load);
  const resetSupplements = useSupplementsStore((state) => state.reset);
  const handled = useRef(new Set<string>());
  const inFlight = useRef(new Set<string>());
  const rebuild = useRef<() => void>(() => undefined);

  useEffect(() => {
    void ensureNotificationChannels().catch(() => undefined);
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const kind = notification.request.content.data?.kind;
        // The in-app bar already announces the end of a rest; a banner on top
        // would duplicate it. Background deliveries still use the channel.
        const suppress = kind === 'rest' && AppState.currentState === 'active';
        return {
          shouldShowBanner: !suppress,
          shouldShowList: !suppress,
          shouldPlaySound: !suppress,
          shouldSetBadge: false,
        };
      },
    });
    return () => Notifications.setNotificationHandler(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    let cleanupGeneration = 0;
    let retryNeeded = false;
    let rebuildNeeded = false;
    let rebuildGeneration = 0;

    rebuild.current = () => {
      const currentSession = useSessionStore.getState().session;
      const currentSupplements = useSupplementsStore.getState();
      if (!currentSession || !currentSupplements.ready || currentSupplements.session !== currentSession) return;
      const generation = ++rebuildGeneration;
      rebuildNeeded = false;
      const isCurrent = () => mounted && generation === rebuildGeneration
        && useSessionStore.getState().session === currentSession
        && useSupplementsStore.getState().session === currentSession;
      void syncSupplementReminders(currentSupplements.supplements, { isCurrent }).catch(() => {
        if (isCurrent()) {
          rebuildNeeded = true;
          console.warn('No se pudieron sincronizar los recordatorios de suplementos; se reintentará al volver a la aplicación.');
        }
      });
    };

    const cleanup = (rebuildAfterRetry = false) => {
      const generation = ++cleanupGeneration;
      ++rebuildGeneration;
      rebuildNeeded = false;
      retryNeeded = false;
      void syncSupplementReminders([], { dismissPresented: true }).then(() => {
        if (!mounted || generation !== cleanupGeneration || !rebuildAfterRetry) return;
        // Retrying cleanup can cancel the current account's reminders. Restore
        // them only from state that still belongs to the current session.
        rebuild.current();
      }).catch(() => {
        // Never log native errors: they may contain notification contents.
        console.warn('No se pudieron limpiar los recordatorios de suplementos; se reintentará al volver a la aplicación.');
        if (mounted && generation === cleanupGeneration) retryNeeded = true;
      });
    };

    // Subscribe directly so an in-flight rebuild is invalidated at the session
    // transition, rather than waiting for React to render the new account.
    const unsubscribe = useSessionStore.subscribe((state, previous) => {
      if (state.session !== previous.session) {
        cleanup();
      }
    });
    // Also clear leftovers from a previous process before rebuilding the
    // current account's reminders, even if authentication was restored first.
    cleanup();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (retryNeeded) cleanup(true);
      else if (rebuildNeeded) rebuild.current();
    });
    return () => {
      mounted = false;
      unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (session) void loadSupplements(session);
    else resetSupplements();
  }, [session, loadSupplements, resetSupplements]);

  useEffect(() => {
    if (!session || !ready || supplementSession !== session || useSessionStore.getState().session !== session) return;
    // Rebuild weekly reminders after any supplement change. Without permission
    // this only removes stale requests; it never prompts on its own.
    rebuild.current();
  }, [session, supplementSession, ready, supplements]);

  const handleResponse = useCallback(async (response: Notifications.NotificationResponse) => {
    const key = `${response.notification.request.identifier}:${response.actionIdentifier}:${response.notification.date}`;
    if (handled.current.has(key) || inFlight.current.has(key)) return;
    const supplementId = supplementIdOf(response);
    if (!supplementId || !session || useSessionStore.getState().session !== session) return;
    inFlight.current.add(key);
    try {
      const deliveredOn = localCivilDate(new Date(response.notification.date));
      const today = localCivilDate();
      if (response.actionIdentifier === SUPPLEMENT_TAKEN_ACTION && deliveredOn === today) {
        await recordIntakeFromNotification(session, supplementId);
      }
      handled.current.add(key);
      // Old responses restored by the OS do not hijack the app.
      if (useSessionStore.getState().session === session && Date.now() - response.notification.date <= RECENT_RESPONSE_MS) {
        router.push('/supplements');
      }
    } catch {
      // A later delivery may safely retry a failed intake.
    } finally {
      inFlight.current.delete(key);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleResponse(response);
    });
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => (response ? handleResponse(response) : undefined))
      .catch(() => undefined);
    return () => {
      // jest-expo and older native shims may return a partial subscription.
      if (typeof subscription?.remove === 'function') subscription.remove();
    };
  }, [session, handleResponse]);

  return null;
}
