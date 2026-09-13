import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api';
import type { UpdatedUser, User } from '@/lib/auth-api';
import { useAutenticacion } from '@/lib/auth-store';
import PaginaPerfil from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const user: User = {
  id: 'account-a',
  email: 'eva@example.test',
  name: 'Eva Inicial',
  biologicalSex: 'PREFER_NOT_SAY',
  birthDate: '1999-05-20T00:00:00.000Z',
  goals: [],
  trackCycle: true,
  avgCycleLen: 28,
  avgPeriodLen: 5,
  createdAt: '2026-01-01T12:00:00.000Z',
};

function updated(overrides: Partial<UpdatedUser> = {}): UpdatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    biologicalSex: user.biologicalSex,
    birthDate: user.birthDate,
    goals: user.goals,
    trackCycle: user.trackCycle,
    avgCycleLen: user.avgCycleLen,
    avgPeriodLen: user.avgPeriodLen,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PaginaPerfil />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setAccessToken(null);
  useAutenticacion.setState({
    usuario: user,
    estado: 'authenticated',
    cargando: false,
    error: null,
  });
});

afterEach(() => {
  cleanup();
  setAccessToken(null);
  useAutenticacion.setState({ usuario: null, estado: 'anonymous', cargando: false, error: null });
  vi.unstubAllGlobals();
});

it('sends one complete pending update and applies the canonical user without a second GET', async () => {
  const pending = deferred<Response>();
  const requests: Array<{ body: unknown; method: string }> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input.clone() : new Request(input, init);
    requests.push({
      body: request.body ? JSON.parse(await request.text()) : undefined,
      method: request.method,
    });
    return pending.promise;
  }));
  show();

  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Eva Cano' } });
  fireEvent.change(screen.getByLabelText('Sexo registrado'), { target: { value: 'OTHER' } });
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2000-06-15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Fuerza' }));
  fireEvent.click(screen.getByRole('button', { name: 'Movilidad' }));
  fireEvent.change(screen.getByLabelText('Ciclo (días)'), { target: { value: '30' } });
  fireEvent.change(screen.getByLabelText('Período (días)'), { target: { value: '6' } });

  const form = screen.getByRole('button', { name: 'Guardar cambios' }).closest('form');
  expect(form).not.toBeNull();
  fireEvent.submit(form!);
  await waitFor(() => expect(screen.getByRole('button', { name: '…' })).toBeDisabled());
  fireEvent.submit(form!);

  await waitFor(() => expect(requests).toEqual([{
    method: 'PATCH',
    body: {
      name: 'Eva Cano',
      biologicalSex: 'OTHER',
      birthDate: '2000-06-15',
      goals: ['STRENGTH', 'MOBILITY'],
      trackCycle: true,
      avgCycleLen: 30,
      avgPeriodLen: 6,
    },
  }]));

  pending.resolve(Response.json(updated({
    name: 'Eva Cano canónica',
    biologicalSex: 'OTHER',
    birthDate: '2000-06-15T00:00:00.000Z',
    goals: ['STRENGTH', 'MOBILITY'],
    avgCycleLen: 30,
    avgPeriodLen: 6,
  })));

  expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre')).toHaveValue('Eva Cano canónica');
  expect(useAutenticacion.getState().usuario).toEqual({
    ...user,
    ...updated({
      name: 'Eva Cano canónica',
      biologicalSex: 'OTHER',
      birthDate: '2000-06-15T00:00:00.000Z',
      goals: ['STRENGTH', 'MOBILITY'],
      avgCycleLen: 30,
      avgPeriodLen: 6,
    }),
    createdAt: user.createdAt,
  });
  expect(requests).toHaveLength(1);
});

it('keeps edited values, links 422 field errors and leaves the canonical user unchanged', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    code: 'validation_error',
    message: 'Revisa los datos del perfil.',
    retryable: false,
    requestId: 'request-profile-422',
    fieldErrors: {
      name: ['Nombre inválido.'],
      birthDate: ['Fecha inválida.'],
    },
  }, { status: 422 })));
  show();

  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Valor conservado' } });
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2001-02-03' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

  const nameError = await screen.findByText('Nombre inválido.');
  const birthDateError = screen.getByText('Fecha inválida.');
  expect(screen.getByLabelText(/Nombre/)).toHaveValue('Valor conservado');
  expect(screen.getByLabelText(/Fecha de nacimiento/)).toHaveValue('2001-02-03');
  expect(screen.getByLabelText(/Nombre/).closest('label')).toContainElement(nameError);
  expect(screen.getByLabelText(/Fecha de nacimiento/).closest('label')).toContainElement(birthDateError);
  expect(screen.getByRole('alert')).toHaveTextContent('Revisa los datos del perfil.');
  expect(useAutenticacion.getState().usuario).toEqual(user);
});

it('shows a remote 503 error and allows a successful retry', async () => {
  const network = vi.fn()
    .mockResolvedValueOnce(Response.json({
      code: 'service_unavailable',
      message: 'Servicio temporalmente no disponible.',
      retryable: true,
      requestId: 'request-profile-503',
    }, { status: 503 }))
    .mockResolvedValueOnce(Response.json(updated({ name: 'Eva recuperada' })));
  vi.stubGlobal('fetch', network);
  show();

  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Eva recuperada' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Servicio temporalmente no disponible.');
  expect(screen.getByLabelText('Nombre')).toHaveValue('Eva recuperada');
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

  expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
  expect(network).toHaveBeenCalledTimes(2);
  expect(useAutenticacion.getState().usuario?.name).toBe('Eva recuperada');
});

it('omits an empty birth date because null means no change in the generated contract', async () => {
  let sentBody: Record<string, unknown> | undefined;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input.clone() : new Request(input, init);
    sentBody = JSON.parse(await request.text());
    return Response.json(updated());
  }));
  show();

  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

  await screen.findByText('Cambios guardados.');
  expect(sentBody).not.toHaveProperty('birthDate');
});
