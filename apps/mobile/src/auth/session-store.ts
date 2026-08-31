import { create } from 'zustand';
import {
  currentUserWithRefresh,
  captureMobileSession,
  restoreCachedUser,
  onMobileSessionInvalidated,
  loginMobile,
  logoutMobile,
  type CurrentUser,
  type MobileSession,
} from '../api/client';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'error';

interface SessionState {
  status: AuthStatus;
  user: CurrentUser | null;
  session: MobileSession | null;
  offline: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

let actionVersion = 0;

export const useSessionStore = create<SessionState>((set) => ({
  status: 'checking',
  user: null,
  session: null,
  offline: false,
  error: null,
  async initialize() {
    const action = ++actionVersion;
    set({ status: 'checking', error: null });
    let cached: CurrentUser | null = null;
    try {
      cached = await restoreCachedUser();
      if (action !== actionVersion) return;
      if (cached) set({ status: 'authenticated', user: cached, session: captureMobileSession(), offline: true });
      const user = await currentUserWithRefresh();
      if (action !== actionVersion) return;
      set({ status: 'authenticated', user, session: captureMobileSession(), offline: false, error: null });
    } catch (error) {
      if (action !== actionVersion) return;
      if (cached && isTemporaryFailure(error)) {
        set({ status: 'authenticated', user: cached, session: captureMobileSession(), offline: true, error: null });
      } else {
        set({ status: 'anonymous', user: null, session: null, offline: false,
          error: isTemporaryFailure(error) ? 'No hay conexión ni una cuenta validada en este dispositivo. Conéctate para iniciar sesión.' : null });
      }
    }
  },
  async login(email, password) {
    const action = ++actionVersion;
    set({ status: 'checking', user: null, session: null, offline: false, error: null });
    try {
      await loginMobile(email, password);
      if (action !== actionVersion) return;
      const user = await currentUserWithRefresh();
      if (action !== actionVersion) return;
      set({ status: 'authenticated', user, session: captureMobileSession(), offline: false, error: null });
    } catch (error) {
      if (action !== actionVersion) return;
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
      set({ status: 'anonymous', user: null, session: null, offline: false, error: message });
    }
  },
  async logout() {
    const action = ++actionVersion;
    set({ user: null, session: null, offline: false, status: 'anonymous', error: null });
    try {
      await logoutMobile();
    } catch (error) {
      if (action !== actionVersion) return;
      set({ error: error instanceof Error ? error.message : 'No se pudieron borrar las credenciales locales.' });
    }
  },
  async refreshUser() {
    const action = actionVersion;
    try {
      const user = await currentUserWithRefresh();
      if (action !== actionVersion) return;
      set({ user, session: captureMobileSession(), offline: false, status: 'authenticated', error: null });
    } catch (error) {
      if (action !== actionVersion) return;
      set({ offline: isTemporaryFailure(error), error: error instanceof Error ? error.message : 'No se pudo actualizar el perfil.' });
    }
  },
}));

onMobileSessionInvalidated(() => {
  useSessionStore.setState({ status: 'anonymous', user: null, session: null, offline: false, error: 'Tu sesión terminó. Vuelve a iniciar sesión.' });
});

function isTemporaryFailure(error: unknown): boolean {
  return error instanceof TypeError || (typeof error === 'object' && error !== null &&
    'status' in error && typeof error.status === 'number' && error.status >= 500);
}
