import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  loginWeb: vi.fn(),
  registerWeb: vi.fn(),
  logoutWeb: vi.fn(),
  getCurrentUser: vi.fn(),
  setAccessToken: vi.fn(),
  request: vi.fn(() => Promise.reject(new Error('legacy request used'))),
  requestOrThrow: vi.fn(() => Promise.reject(new Error('legacy requestOrThrow used'))),
}));

vi.mock('./auth-api', () => ({
  loginWeb: apiMock.loginWeb,
  registerWeb: apiMock.registerWeb,
  logoutWeb: apiMock.logoutWeb,
  getCurrentUser: apiMock.getCurrentUser,
}));

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  setAccessToken: apiMock.setAccessToken,
  request: apiMock.request,
  requestOrThrow: apiMock.requestOrThrow,
}));

import { useAutenticacion } from './auth-store';
import { ApiError } from './api';
import type { Usuario } from './types';

const user: Usuario = {
  id: 'u1',
  email: 'u@evry.test',
  name: 'Eva',
  biologicalSex: 'FEMALE',
  birthDate: null,
  goals: [],
  trackCycle: true,
  avgCycleLen: 28,
  avgPeriodLen: 5,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAutenticacion.setState({ usuario: null, cargando: false, error: null, estado: 'checking' });
});

describe('useAutenticacion operation epochs', () => {
  it('ignores a late initialize 401 after a newer normalized login', async () => {
    const late = deferred<typeof user>();
    apiMock.getCurrentUser.mockReturnValueOnce(late.promise).mockResolvedValueOnce(user);
    apiMock.loginWeb.mockResolvedValueOnce({ accessToken: 'fresh' });

    const initializing = useAutenticacion.getState().inicializar();
    await useAutenticacion.getState().ingresar('  U@EVRY.TEST  ', 'secret');
    late.reject(new ApiError({
      status: 401,
      code: 'unauthorized',
      message: 'expired',
      retryable: false,
    }));
    await initializing;

    expect(apiMock.loginWeb).toHaveBeenCalledWith({ email: 'u@evry.test', password: 'secret' });
    expect(apiMock.getCurrentUser).toHaveBeenCalledTimes(2);
    expect(useAutenticacion.getState()).toMatchObject({ usuario: user, estado: 'authenticated' });
    expect(apiMock.setAccessToken).toHaveBeenCalledWith('fresh', expect.any(Number));
  });

  it('ignores a late initialize success after logout', async () => {
    const late = deferred<typeof user>();
    apiMock.getCurrentUser.mockReturnValueOnce(late.promise);
    apiMock.logoutWeb.mockImplementationOnce(async () => {
      expect(apiMock.setAccessToken).toHaveBeenCalledWith(null, expect.any(Number));
      expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'anonymous' });
      return { ok: true };
    });

    const initializing = useAutenticacion.getState().inicializar();
    await useAutenticacion.getState().cerrarSesion();
    late.resolve(user);
    await initializing;

    expect(apiMock.logoutWeb).toHaveBeenCalledOnce();
    expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'anonymous' });
  });

  it('returns false to a login caller when logout supersedes the operation', async () => {
    const late = deferred<{ accessToken: string }>();
    apiMock.loginWeb.mockReturnValueOnce(late.promise);
    apiMock.logoutWeb.mockResolvedValueOnce({ ok: true });

    const login = useAutenticacion.getState().ingresar('eva@evry.test', 'secret');
    await useAutenticacion.getState().cerrarSesion();
    late.resolve({ accessToken: 'stale' });

    await expect(login).resolves.toBe(false);
    expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'anonymous' });
  });

  it('returns false to a registration caller when logout supersedes the operation', async () => {
    const late = deferred<{ accessToken: string }>();
    apiMock.registerWeb.mockReturnValueOnce(late.promise);
    apiMock.logoutWeb.mockResolvedValueOnce({ ok: true });

    const registration = useAutenticacion.getState().registrar({
      email: 'eva@evry.test',
      password: 'testing-password',
      name: 'Eva',
    });
    await useAutenticacion.getState().cerrarSesion();
    late.resolve({ accessToken: 'stale' });

    await expect(registration).resolves.toBe(false);
    expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'anonymous' });
  });
});

it('registers with normalized generated input and loads the current user', async () => {
  apiMock.registerWeb.mockResolvedValueOnce({ accessToken: 'fresh' });
  apiMock.getCurrentUser.mockResolvedValueOnce(user);

  await useAutenticacion.getState().registrar({
    email: '  EVA@EXAMPLE.TEST ',
    password: 'testing-password',
    name: '  Eva  ',
    biologicalSex: 'FEMALE',
    trackCycle: true,
  });

  expect(apiMock.registerWeb).toHaveBeenCalledWith({
    email: 'eva@example.test',
    password: 'testing-password',
    name: 'Eva',
    biologicalSex: 'FEMALE',
    trackCycle: true,
  });
  expect(apiMock.getCurrentUser).toHaveBeenCalledOnce();
  expect(useAutenticacion.getState()).toMatchObject({ usuario: user, estado: 'authenticated' });
});

it('clears the new login token and previous user when hydration fails', async () => {
  const failure = new ApiError({
    status: 503,
    code: 'service_unavailable',
    message: 'Servicio no disponible.',
    retryable: true,
  });
  useAutenticacion.setState({ usuario: user, estado: 'authenticated' });
  apiMock.loginWeb.mockResolvedValueOnce({ accessToken: 'next-login-token' });
  apiMock.getCurrentUser.mockRejectedValueOnce(failure);

  await expect(useAutenticacion.getState().ingresar('eva@evry.test', 'secret')).rejects.toBe(failure);

  const generation = apiMock.setAccessToken.mock.calls[0]?.[1];
  expect(apiMock.setAccessToken.mock.calls).toEqual([
    ['next-login-token', generation],
    [null, generation],
  ]);
  expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'error' });
});

it('clears the new registration token and previous user when hydration fails', async () => {
  const failure = new ApiError({
    status: 503,
    code: 'service_unavailable',
    message: 'Servicio no disponible.',
    retryable: true,
  });
  useAutenticacion.setState({ usuario: user, estado: 'authenticated' });
  apiMock.registerWeb.mockResolvedValueOnce({ accessToken: 'next-registration-token' });
  apiMock.getCurrentUser.mockRejectedValueOnce(failure);

  await expect(useAutenticacion.getState().registrar({
    email: 'eva@evry.test',
    password: 'testing-password',
    name: 'Eva',
  })).rejects.toBe(failure);

  const generation = apiMock.setAccessToken.mock.calls[0]?.[1];
  expect(apiMock.setAccessToken.mock.calls).toEqual([
    ['next-registration-token', generation],
    [null, generation],
  ]);
  expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'error' });
});

it('clears local session before propagating a remote logout failure', async () => {
  const failure = new ApiError({
    status: 503,
    code: 'service_unavailable',
    message: 'Servicio no disponible.',
    retryable: true,
  });
  useAutenticacion.setState({ usuario: user, estado: 'authenticated' });
  apiMock.logoutWeb.mockImplementationOnce(async () => {
    expect(apiMock.setAccessToken).toHaveBeenCalledWith(null, expect.any(Number));
    expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'anonymous' });
    throw failure;
  });

  await expect(useAutenticacion.getState().cerrarSesion()).rejects.toBe(failure);
  expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'anonymous' });
});

it('applies an updated matching user without losing createdAt', () => {
  useAutenticacion.setState({ usuario: user });

  useAutenticacion.getState().aplicarUsuarioActualizado({
    id: user.id,
    email: 'eva.updated@evry.test',
    name: 'Eva Actualizada',
    biologicalSex: 'PREFER_NOT_SAY',
    birthDate: '1990-06-15T00:00:00.000Z',
    goals: ['STRENGTH'],
    trackCycle: false,
    avgCycleLen: 30,
    avgPeriodLen: 6,
  });

  expect(useAutenticacion.getState()).toMatchObject({
    estado: 'authenticated',
    error: null,
    usuario: {
      id: user.id,
      email: 'eva.updated@evry.test',
      name: 'Eva Actualizada',
      createdAt: user.createdAt,
    },
  });
});
