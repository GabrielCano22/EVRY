'use client';

import { create } from 'zustand';
import { api, setAccessToken } from './api';
import type { Usuario } from './types';

interface DatosRegistro {
  email: string;
  password: string;
  name: string;
  biologicalSex?: Usuario['biologicalSex'];
  trackCycle?: boolean;
}

interface EstadoAutenticacion {
  usuario: Usuario | null;
  cargando: boolean;
  error: string | null;
  inicializar: () => Promise<void>;
  ingresar: (email: string, password: string) => Promise<void>;
  registrar: (datos: DatosRegistro) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  recargarUsuario: () => Promise<void>;
}

export const useAutenticacion = create<EstadoAutenticacion>((set) => ({
  usuario: null,
  cargando: false,
  error: null,
  async inicializar() {
    set({ cargando: true });
    try {
      const usuario = await api<Usuario>('/users/me');
      set({ usuario, cargando: false });
    } catch {
      set({ usuario: null, cargando: false });
    }
  },
  async ingresar(email, password) {
    set({ cargando: true, error: null });
    try {
      const respuesta = await api<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        json: { email, password },
        auth: false,
      });
      setAccessToken(respuesta.accessToken);
      const usuario = await api<Usuario>('/users/me');
      set({ usuario, cargando: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Error al ingresar', cargando: false });
      throw e;
    }
  },
  async registrar(datos) {
    set({ cargando: true, error: null });
    try {
      const respuesta = await api<{ accessToken: string }>('/auth/register', {
        method: 'POST',
        json: datos,
        auth: false,
      });
      setAccessToken(respuesta.accessToken);
      const usuario = await api<Usuario>('/users/me');
      set({ usuario, cargando: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'No se pudo crear la cuenta', cargando: false });
      throw e;
    }
  },
  async cerrarSesion() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    set({ usuario: null });
  },
  async recargarUsuario() {
    const usuario = await api<Usuario>('/users/me');
    set({ usuario });
  },
}));
