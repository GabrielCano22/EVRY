'use client';

import { create } from 'zustand';
import { ApiError, setAccessToken } from './api';
import { getCurrentUser, loginWeb, logoutWeb, registerWeb, restoreCurrentUser } from './auth-api';
import { beginNewSession, currentSessionGeneration, invalidateSession, isCurrentSessionGeneration } from './auth-session';
import type { RegisterInput, UpdatedUser } from './auth-api';
import type { AuthStatus, Usuario } from './types';

interface EstadoAutenticacion {
  usuario: Usuario | null;
  cargando: boolean;
  error: string | null;
  estado: AuthStatus;
  inicializar: (options?: { reuseForDocument?: boolean }) => Promise<void>;
  ingresar: (email: string, password: string) => Promise<boolean>;
  registrar: (datos: RegisterInput) => Promise<boolean>;
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
type Inicializacion = { generation: number; epoch: number; promise: Promise<void> };
let inicializacionPendiente: Inicializacion | null = null;
let inicializacionDocumento: Inicializacion | null = null;

export const useAutenticacion = create<EstadoAutenticacion>((set, get) => ({
  usuario: null,
  cargando: false,
  error: null,
  estado: 'checking',
  async inicializar(options) {
    const generation = currentSessionGeneration();
    if (options?.reuseForDocument && inicializacionDocumento?.generation === generation && inicializacionDocumento.epoch === epochOperacion) {
      return inicializacionDocumento.promise;
    }
    if (inicializacionPendiente?.generation === generation && inicializacionPendiente.epoch === epochOperacion) {
      if (options?.reuseForDocument) inicializacionDocumento = inicializacionPendiente;
      return inicializacionPendiente.promise;
    }
    const epoch = ++epochOperacion;
    const pending = {
      generation,
      epoch,
      promise: (async () => {
        if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return;
        set({ cargando: true, estado: 'checking', error: null });
        try {
          const usuario = await restoreCurrentUser();
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
      })(),
    };
    inicializacionPendiente = pending;
    if (options?.reuseForDocument) inicializacionDocumento = pending;
    try {
      await pending.promise;
    } finally {
      if (inicializacionPendiente === pending) inicializacionPendiente = null;
    }
  },
  async ingresar(email, password) {
    const epoch = ++epochOperacion;
    const generation = beginNewSession();
    let tokenAplicado = false;
    set({ cargando: true, error: null, estado: 'checking' });
    try {
      const emailNormalizado = email.trim().toLowerCase();
      const respuesta = await loginWeb({ email: emailNormalizado, password });
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return false;
      setAccessToken(respuesta.accessToken, generation);
      tokenAplicado = true;
      const usuario = await getCurrentUser();
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return false;
      set({ usuario, cargando: false, estado: 'authenticated', error: null });
      return true;
    } catch (error) {
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return false;
      const sesionInvalida = esSesionInvalida(error);
      const limpiarSesion = tokenAplicado || sesionInvalida;
      if (limpiarSesion) setAccessToken(null, generation);
      set({
        usuario: limpiarSesion ? null : get().usuario,
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
    let tokenAplicado = false;
    set({ cargando: true, error: null, estado: 'checking' });
    try {
      const datosNormalizados = {
        ...datos,
        email: datos.email.trim().toLowerCase(),
        name: datos.name.trim(),
      };
      const respuesta = await registerWeb(datosNormalizados);
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return false;
      setAccessToken(respuesta.accessToken, generation);
      tokenAplicado = true;
      const usuario = await getCurrentUser();
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return false;
      set({ usuario, cargando: false, estado: 'authenticated', error: null });
      return true;
    } catch (error) {
      if (epoch !== epochOperacion || !isCurrentSessionGeneration(generation)) return false;
      const sesionInvalida = esSesionInvalida(error);
      const limpiarSesion = tokenAplicado || sesionInvalida;
      if (limpiarSesion) setAccessToken(null, generation);
      set({
        usuario: limpiarSesion ? null : get().usuario,
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
    await logoutWeb();
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
