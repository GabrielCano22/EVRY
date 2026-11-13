import { create } from 'zustand';
import type { MobileSession } from '../api/client';
import { useSessionStore } from '../auth/session-store';
import { deleteSupplement, listSupplementIntakes, listSupplements, recordSupplementIntake, removeSupplementIntake, saveSupplement } from './repository';
import { localCivilDate, validateSupplementDraft, type Supplement, type SupplementDraft } from './supplement';

interface SupplementsState {
  session: MobileSession | null;
  supplements: Supplement[];
  /** Supplement id -> ISO timestamp of today's intake. */
  intakes: Record<string, string>;
  intakesDay: string | null;
  ready: boolean;
  saving: boolean;
  error: string | null;
  editVersion: number;
  load: (session: MobileSession) => Promise<void>;
  save: (session: MobileSession, draft: SupplementDraft) => Promise<Supplement>;
  remove: (session: MobileSession, id: string) => Promise<void>;
  markTaken: (session: MobileSession, id: string, isCurrent?: () => boolean) => Promise<void>;
  undo: (session: MobileSession, id: string) => Promise<void>;
  reset: () => void;
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Keep writes and their subsequent snapshots in invocation order. A rejected
// operation must not prevent the next one from running.
let queue: Promise<unknown> = Promise.resolve();
let generation = 0;
let pendingSaves = 0;
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.catch(() => undefined);
  return result;
}

export const useSupplementsStore = create<SupplementsState>((set, get) => {
  function begin(session: MobileSession) {
    if (get().session !== session) {
      generation += 1;
      pendingSaves = 0;
      set({ session, supplements: [], intakes: {}, intakesDay: null, ready: false, saving: false, error: null });
    }
    return generation;
  }
  function current(session: MobileSession, token: number) {
    return generation === token && get().session === session;
  }
  async function refresh(session: MobileSession, token: number) {
    // A read can straddle midnight or a timezone change. Never publish a
    // snapshot for yesterday as today's intakes.
    while (current(session, token)) {
      const day = localCivilDate();
      const [supplements, intakes] = await Promise.all([
        listSupplements(session), listSupplementIntakes(session, day),
      ]);
      if (!current(session, token)) return;
      if (day !== localCivilDate()) continue;
      set({ supplements, intakes: Object.fromEntries(intakes.map((row) => [row.supplementId, row.takenAt])), intakesDay: day, ready: true });
      return;
    }
  }
  function mutate<T>(session: MobileSession, operation: () => Promise<T>, fallback: string, saving: boolean, isCurrent?: () => boolean): Promise<T> {
    const token = begin(session);
    if (saving) pendingSaves += 1;
    set({ error: null, ...(saving ? { saving: true } : {}) });
    return enqueue(async () => {
      try {
        if (!current(session, token) || (isCurrent && !isCurrent())) throw new Error('La operación de suplementos ya no pertenece a la sesión actual.');
        const result = await operation();
        if (current(session, token)) await refresh(session, token);
        return result;
      } catch (error) {
        if (current(session, token) && (!isCurrent || isCurrent())) set({ error: message(error, fallback) });
        throw error;
      } finally {
        if (saving && current(session, token)) {
          pendingSaves -= 1;
          set({ saving: pendingSaves > 0 });
        }
      }
    });
  }
  return {
    session: null, supplements: [], intakes: {}, intakesDay: null, ready: false, saving: false, error: null, editVersion: 0,
    reset: () => {
      generation += 1;
      pendingSaves = 0;
      set({ session: null, supplements: [], intakes: {}, intakesDay: null, ready: false, saving: false, error: null, editVersion: get().editVersion + 1 });
    },
    load(session) {
      const token = begin(session);
      if (get().intakesDay !== localCivilDate()) set({ intakes: {}, intakesDay: null });
      return enqueue(async () => {
        if (!current(session, token)) return;
        try {
          await refresh(session, token);
        } catch (error) {
          if (current(session, token)) set({ ready: false, error: message(error, 'No se pudieron leer los suplementos locales.') });
        }
      });
    },
    async save(session, draft) {
      const validation = validateSupplementDraft(draft);
      if (!validation.value) throw new Error(Object.values(validation.errors)[0] ?? 'Revisa los datos del suplemento.');
      const value = validation.value;
      return mutate(session, () => saveSupplement(session, value), 'No se pudo guardar el suplemento.', true);
    },
    remove: (session, id) => mutate(session, () => deleteSupplement(session, id), 'No se pudo eliminar el suplemento.', true),
    markTaken: (session, id, isCurrent) => {
      const at = new Date();
      return mutate(session, async () => { await recordSupplementIntake(session, id, at); }, 'No se pudo registrar la toma.', false, isCurrent);
    },
    undo: (session, id) => {
      const day = localCivilDate();
      return mutate(session, () => removeSupplementIntake(session, id, day), 'No se pudo deshacer la toma.', false);
    },
  };
});

/** Used by notification actions, which do not have the screen's local state. */
export async function recordIntakeFromNotification(session: MobileSession, supplementId: string): Promise<void> {
  const authenticated = () => useSessionStore.getState().status === 'authenticated' && useSessionStore.getState().session === session;
  if (!authenticated()) return;
  const store = useSupplementsStore.getState();
  if (store.session !== session) {
    const loading = store.load(session);
    const token = generation;
    await loading;
    if (generation !== token) return;
  }
  if (!authenticated() || useSupplementsStore.getState().session !== session) return;
  await useSupplementsStore.getState().markTaken(session, supplementId, authenticated);
}
