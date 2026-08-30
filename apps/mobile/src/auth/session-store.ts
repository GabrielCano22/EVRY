import { create } from 'zustand';
import {
  currentUserWithRefresh,
  loginMobile,
  logoutMobile,
  type CurrentUser,
} from '../api/client';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'error';

interface SessionState {
  status: AuthStatus;
  user: CurrentUser | null;
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
  error: null,
  async initialize() {
    const action = ++actionVersion;
    set({ status: 'checking', error: null });
    try {
      const user = await currentUserWithRefresh();
      if (action !== actionVersion) return;
      set({ status: 'authenticated', user, error: null });
    } catch {
      if (action !== actionVersion) return;
      set({ status: 'anonymous', user: null, error: null });
    }
  },
  async login(email, password) {
    const action = ++actionVersion;
    set({ status: 'checking', user: null, error: null });
    try {
      await loginMobile(email, password);
      if (action !== actionVersion) return;
      const user = await currentUserWithRefresh();
      if (action !== actionVersion) return;
      set({ status: 'authenticated', user, error: null });
    } catch (error) {
      if (action !== actionVersion) return;
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
      set({ status: 'anonymous', user: null, error: message });
    }
  },
  async logout() {
    const action = ++actionVersion;
    set({ user: null, status: 'anonymous', error: null });
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
      set({ user, status: 'authenticated', error: null });
    } catch (error) {
      if (action !== actionVersion) return;
      set({ error: error instanceof Error ? error.message : 'No se pudo actualizar el perfil.' });
    }
  },
}));
