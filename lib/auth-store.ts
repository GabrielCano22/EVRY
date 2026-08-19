'use client';

import { create } from 'zustand';
import { ApiError, request, requestOrThrow, setAccessToken } from './api';
import type { AuthStatus, Usuario } from './types';

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
  estado: AuthStatus;
  inicializar: () => Promise<void>;
  ingresar: (email: string, password: string) => Promise<void>;
  registrar: (datos: DatosRegistro) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  recargarUsuario: () => Promise<void>;
}

function esSesionInvalida(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function mensajeSeguro(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

let epochSesion = 0;

export const useAutenticacion = create<EstadoAutenticacion>((set, get) => ({
  usuario: null,
  cargando: false,
  error: null,
  estado: 'checking',
  async inicializar() {
    const epoch = ++epochSesion;
    set({ cargando: true, estado: 'checking', error: null });
    const resultado = await request<Usuario>('/users/me');
    if (epoch !== epochSesion) return;
    if (resultado.ok) {
      set({ usuario: resultado.data, cargando: false, estado: 'authenticated', error: null });
      return;
    }
    if (resultado.error.status === 401 || resultado.error.status === 403) {
      setAccessToken(null);
      set({ usuario: null, cargando: false, estado: 'anonymous', error: null });
      return;
    }
    set({ usuario: get().usuario, cargando: false, estado: 'error', error: resultado.error.message });
  },
  async ingresar(email, password) {
    const epoch = ++epochSesion;
    set({ cargando: true, error: null, estado: 'checking' });
    try {
      const emailNormalizado = email.trim().toLowerCase();
      const respuesta = await requestOrThrow<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: { email: emailNormalizado, password },
        auth: false,
      });
      if (epoch !== epochSesion) return;
      setAccessToken(respuesta.accessToken);
      const usuario = await requestOrThrow<Usuario>('/users/me');
      if (epoch !== epochSesion) return;
      set({ usuario, cargando: false, estado: 'authenticated', error: null });
    } catch (error) {
      if (epoch !== epochSesion) return;
      const sesionInvalida = esSesionInvalida(error);
      if (sesionInvalida) setAccessToken(null);
      set({
        usuario: sesionInvalida ? null : get().usuario,
        error: mensajeSeguro(error, 'Error al ingresar'),
        cargando: false,
        estado: sesionInvalida ? 'anonymous' : 'error',
      });
      throw error;
    }
  },
  async registrar(datos) {
    const epoch = ++epochSesion;
    set({ cargando: true, error: null, estado: 'checking' });
    try {
      const datosNormalizados = {
        ...datos,
        email: datos.email.trim().toLowerCase(),
        name: datos.name.trim(),
      };
      const respuesta = await requestOrThrow<{ accessToken: string }>('/auth/register', {
        method: 'POST',
        body: datosNormalizados,
        auth: false,
      });
      if (epoch !== epochSesion) return;
      setAccessToken(respuesta.accessToken);
      const usuario = await requestOrThrow<Usuario>('/users/me');
      if (epoch !== epochSesion) return;
      set({ usuario, cargando: false, estado: 'authenticated', error: null });
    } catch (error) {
      if (epoch !== epochSesion) return;
      const sesionInvalida = esSesionInvalida(error);
      if (sesionInvalida) setAccessToken(null);
      set({
        usuario: sesionInvalida ? null : get().usuario,
        error: mensajeSeguro(error, 'No se pudo crear la cuenta'),
        cargando: false,
        estado: sesionInvalida ? 'anonymous' : 'error',
      });
      throw error;
    }
  },
  async cerrarSesion() {
    ++epochSesion;
    setAccessToken(null);
    set({ usuario: null, estado: 'anonymous', cargando: false, error: null });
    await request('/auth/logout', { method: 'POST' });
  },
  async recargarUsuario() {
    await get().inicializar();
  },
}));
