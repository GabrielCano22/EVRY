import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  request: vi.fn(),
  requestOrThrow: vi.fn(),
  setAccessToken: vi.fn(),
}));

vi.mock('./api', () => ({
  ...apiMock,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message = 'error') { super(message); this.status = status; }
  },
}));

import { useAutenticacion } from './auth-store';

const user = { id: 'u1', email: 'u@evry.test', name: 'Eva' } as never;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAutenticacion.setState({ usuario: null, cargando: false, error: null, estado: 'checking' });
});

describe('useAutenticacion operation epochs', () => {
  it('ignores a late initialize 401 after a newer successful login', async () => {
    const late = deferred<{ ok: false; error: { status: number; message: string } }>();
    apiMock.request.mockReturnValueOnce(late.promise);
    apiMock.requestOrThrow.mockResolvedValueOnce({ accessToken: 'fresh' }).mockResolvedValueOnce(user);

    const initializing = useAutenticacion.getState().inicializar();
    await useAutenticacion.getState().ingresar('u@evry.test', 'secret');
    late.resolve({ ok: false, error: { status: 401, message: 'expired' } });
    await initializing;

    expect(useAutenticacion.getState()).toMatchObject({ usuario: user, estado: 'authenticated' });
    expect(apiMock.setAccessToken).toHaveBeenCalledWith('fresh');
  });

  it('ignores a late initialize success after logout', async () => {
    const late = deferred<{ ok: true; data: typeof user }>();
    apiMock.request.mockReturnValueOnce(late.promise).mockResolvedValueOnce({ ok: true, data: undefined });

    const initializing = useAutenticacion.getState().inicializar();
    await useAutenticacion.getState().cerrarSesion();
    late.resolve({ ok: true, data: user });
    await initializing;

    expect(useAutenticacion.getState()).toMatchObject({ usuario: null, estado: 'anonymous' });
  });
});
