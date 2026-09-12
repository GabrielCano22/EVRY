'use client';

import { create } from 'zustand';
import { ApiError, setAccessToken } from './api';
import { getCurrentUser, loginWeb, logoutWeb, registerWeb } from './auth-api';
import { beginNewSession, currentSessionGeneration, invalidateSession, isCurrentSessionGeneration } from './auth-session';
import type { RegisterInput, UpdatedUser } from './auth-api';
import type { AuthStatus, Usuario } from './types';

interface EstadoAutenticacion {
  usuario: Usuario | null;
  cargando: boolean;
  error: string | null;
  estado: AuthStatus;
  inicializar: () => Promise<void>;
  ingresar: (email: string, password: string) => Promise<void>;
  registrar: (datos: RegisterInput) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  recargarUsuario: () => Promise<void>;
  aplicarUsuarioActualizado: (updated: UpdatedUser) => void;
}

function esSesionInvalida(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function mensajeSeguro(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

let epochOperacion = 0;

export const useAutenticacion = create<EstadoAutenticacion>((set, get) => ({
  usuario: null,
  cargando: false,
  error: null,
  estado: 'checking',
  async inicializar() {
    const epoch = ++epochOperacion;
    const generation = currentSessionGeneration();
    set({ cargando: true, estado: 'checking', error: null });
    try {
      const usuario = await getCurrentUser();
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return;
      set({ usuario, cargando: false, estado: 'authenticated', error: null });
    } catch (error) {
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return;
      if (esSesionInvalida(error)) {
        setAccessToken(null, generation);
        set({ usuario: null, cargando: false, estado: 'anonymous', error: null });
        return;
      }
      set({ usuario: get().usuario, cargando: false, estado: 'error', error: mensajeSeguro(error, 'No se pudo cargar la sesión') });
    }
  },
  async ingresar(email, password) {
    const epoch = ++epochOperacion;
    const generation = beginNewSession();
    set({ cargando: true, error: null, estado: 'checking' });
    try {
      const emailNormalizado = email.trim().toLowerCase();
      const respuesta = await loginWeb({ email: emailNormalizado, password });
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return;
      setAccessToken(respuesta.accessToken, generation);
      const usuario = await getCurrentUser();
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return;
      set({ usuario, cargando: false, estado: 'authenticated', error: null });
    } catch (error) {
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return;
      const sesionInvalida = esSesionInvalida(error);
      if (sesionInvalida) setAccessToken(null, generation);
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
    const epoch = ++epochOperacion;
    const generation = beginNewSession();
    set({ cargando: true, error: null, estado: 'checking' });
    try {
      const datosNormalizados = {
        ...datos,
        email: datos.email.trim().toLowerCase(),
        name: datos.name.trim(),
      };
      const respuesta = await registerWeb(datosNormalizados);
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return;
      setAccessToken(respuesta.accessToken, generation);
      const usuario = await getCurrentUser();
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return;
      set({ usuario, cargando: false, estado: 'authenticated', error: null });
    } catch (error) {
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return;
      const sesionInvalida = esSesionInvalida(error);
      if (sesionInvalida) setAccessToken(null, generation);
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
    ++epochOperacion;
    setAccessToken(null, invalidateSession());
    set({ usuario: null, estado: 'anonymous', cargando: false, error: null });
    await logoutWeb().catch(() => undefined);
  },
  async recargarUsuario() {
    await get().inicializar();
  },
  aplicarUsuarioActualizado(updated) {
    const current = get().usuario;
    if (!current || current.id !== updated.id) return;
    set({ usuario: { ...current, ...updated }, estado: 'authenticated', error: null });
  },
}));
