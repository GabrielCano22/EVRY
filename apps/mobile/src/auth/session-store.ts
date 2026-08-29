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

export const useSessionStore = create<SessionState>((set) => ({
  status: 'checking',
  user: null,
  error: null,
  async initialize() {
    set({ status: 'checking', error: null });
    try {
      const user = await currentUserWithRefresh();
      set({ status: 'authenticated', user, error: null });
    } catch {
      set({ status: 'anonymous', user: null, error: null });
    }
  },
  async login(email, password) {
    set({ status: 'checking', error: null });
    try {
      await loginMobile(email, password);
      const user = await currentUserWithRefresh();
      set({ status: 'authenticated', user, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
      set({ status: 'anonymous', user: null, error: message });
      throw error;
    }
  },
  async logout() {
    set({ user: null, status: 'anonymous', error: null });
    await logoutMobile();
  },
  async refreshUser() {
    try {
      const user = await currentUserWithRefresh();
      set({ user, status: 'authenticated', error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'No se pudo actualizar el perfil.' });
    }
  },
}));
