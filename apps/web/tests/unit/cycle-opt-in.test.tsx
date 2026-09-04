import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PaginaRegistro from '@/app/(auth)/register/page';
import PaginaCiclo from '@/app/(app)/cycle/page';
import PaginaPerfil from '@/app/(app)/profile/page';
import PaginaDashboard from '@/app/(app)/dashboard/page';
import { useAutenticacion } from '@/lib/auth-store';
import { setAccessToken } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const user = {
  id: 'user-1', email: 'alex@example.test', name: 'Alex', biologicalSex: 'MALE' as const,
  birthDate: null, goals: [], trackCycle: true, avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-01-01',
};

beforeEach(() => {
  push.mockReset();
  useAutenticacion.setState({ usuario: null, cargando: false, error: null, estado: 'anonymous' });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    if (path.endsWith('/auth/register')) return Response.json({ accessToken: 'test-token' });
    if (path.endsWith('/users/me')) return Response.json(user);
    throw new Error(`Unexpected request: ${path}`);
  }));
});
afterEach(() => { cleanup(); setAccessToken(null); vi.unstubAllGlobals(); });

it('keeps explicit cycle consent when sex changes and sends it for a male registration', async () => {
  render(<PaginaRegistro />);
  for (const name of ['Femenino', 'Masculino', 'Otro']) {
    fireEvent.click(screen.getByRole('button', { name }));
    expect(screen.getByRole('checkbox', { name: 'Activar seguimiento del ciclo' })).not.toBeChecked();
  }
  fireEvent.click(screen.getByRole('button', { name: 'Femenino' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Activar seguimiento del ciclo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Otro' }));
  expect(screen.getByRole('checkbox', { name: 'Activar seguimiento del ciclo' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Masculino' }));
  expect(screen.getByRole('checkbox', { name: 'Activar seguimiento del ciclo' })).toBeChecked();
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'alex@example.test' } });
  fireEvent.change(screen.getByLabelText('Contraseña (mín. 8 caracteres)'), { target: { value: 'testing-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  await waitFor(() => {
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls.find(([input]) => String(input).includes('/auth/register'));
    expect(call).toBeDefined();
    expect(JSON.parse(call![1].body)).toEqual({ email: 'alex@example.test', password: 'testing-password', name: 'Alex', biologicalSex: 'MALE', trackCycle: true });
  });
  await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  expect(useAutenticacion.getState().estado).toBe('authenticated');
});

it('offers the optional consent to Otro and submits untouched consent as false', async () => {
  render(<PaginaRegistro />);
  fireEvent.click(screen.getByRole('button', { name: 'Otro' }));
  expect(screen.getByRole('checkbox', { name: 'Activar seguimiento del ciclo' })).not.toBeChecked();
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'alex@example.test' } });
  fireEvent.change(screen.getByLabelText('Contraseña (mín. 8 caracteres)'), { target: { value: 'testing-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  await waitFor(() => {
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls.find(([input]) => String(input).includes('/auth/register'));
    expect(JSON.parse(call![1].body)).toEqual(expect.objectContaining({ biologicalSex: 'OTHER', trackCycle: false }));
  });
  await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  expect(useAutenticacion.getState().estado).toBe('authenticated');
});

it('blocks the direct cycle route before any cycle request when consent is off', () => {
  useAutenticacion.setState({ usuario: { ...user, biologicalSex: 'FEMALE', trackCycle: false } });
  render(<PaginaCiclo />);
  expect(screen.getByText('El seguimiento del ciclo es opcional. Puedes activarlo en tu perfil.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Configurar seguimiento' })).toHaveAttribute('href', '/profile');
  expect(fetch).not.toHaveBeenCalled();
});

it('shows the cycle form and loaded non-female history only with explicit consent', async () => {
  useAutenticacion.setState({ usuario: { ...user, biologicalSex: 'OTHER', trackCycle: true } });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    if (path.endsWith('/cycle/today')) return Response.json(null);
    if (path.endsWith('/cycle/entries')) return Response.json([{ id: 'entry-1', userId: user.id, date: '2026-01-01T00:00:00.000Z', flow: 'LIGHT', symptoms: ['fatiga'], energy: 3, mood: 3, notes: 'privada', isPeriodStart: true }]);
    if (path.endsWith('/workouts')) return Response.json([]);
    throw new Error(`Unexpected request: ${path}`);
  }));
  render(<PaginaCiclo />);
  expect(await screen.findByRole('button', { name: 'Guardar registro' })).toBeInTheDocument();
  expect(await screen.findByText(/1 síntomas/)).toBeInTheDocument();
});

it.each(['MALE', 'OTHER', 'PREFER_NOT_SAY'] as const)('lets %s save both consent values and reload the session', async (biologicalSex) => {
  useAutenticacion.setState({ usuario: { ...user, biologicalSex, trackCycle: false } });
  const requests: unknown[] = [];
  let savedConsent = false;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    if (path.endsWith('/users/me') && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)); requests.push(body); savedConsent = body.trackCycle;
      return Response.json({ ...user, biologicalSex, trackCycle: savedConsent });
    }
    if (path.endsWith('/users/me')) return Response.json({ ...user, biologicalSex, trackCycle: savedConsent });
    throw new Error(`Unexpected request: ${path}`);
  }));
  render(<PaginaPerfil />);
  const toggle = screen.getByRole('checkbox', { name: 'Activar seguimiento' });
  expect(toggle).not.toBeChecked();
  fireEvent.click(toggle);
  expect(screen.getByLabelText('Ciclo (días)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(requests).toContainEqual(expect.objectContaining({ trackCycle: true })));
  await waitFor(() => expect(useAutenticacion.getState().usuario?.trackCycle).toBe(true));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled());
  fireEvent.click(screen.getByRole('checkbox', { name: 'Activar seguimiento' }));
  expect(screen.queryByLabelText('Ciclo (días)')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(useAutenticacion.getState().usuario?.trackCycle).toBe(false));
  expect(requests).toContainEqual(expect.objectContaining({ trackCycle: false }));
});

it('persists explicit profile opt-out and does not render length controls', async () => {
  useAutenticacion.setState({ usuario: { ...user, trackCycle: true } });
  const bodies: unknown[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    if (path.endsWith('/users/me') && init?.method === 'PATCH') { bodies.push(JSON.parse(String(init.body))); return Response.json({}); }
    if (path.endsWith('/users/me')) return Response.json({ ...user, trackCycle: false });
    throw new Error(`Unexpected request: ${path}`);
  }));
  render(<PaginaPerfil />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Activar seguimiento' }));
  expect(screen.queryByLabelText('Ciclo (días)')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(bodies).toContainEqual(expect.objectContaining({ trackCycle: false })));
  await waitFor(() => expect(useAutenticacion.getState().usuario?.trackCycle).toBe(false));
});

it('requests and displays a returned cycle phase for an opted-in male dashboard only', async () => {
  useAutenticacion.setState({ usuario: { ...user, trackCycle: true } });
  const paths: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname; paths.push(path);
    if (path.endsWith('/cycle/today')) return Response.json({ phase: 'LUTEAL', dayOfCycle: 20, cycleLength: 28, nextPeriodStart: null, trainingHint: 'Dato de prueba', intensityCap: 1, volumeCap: 1 });
    if (path.endsWith('/progress/overview')) return Response.json({ period: { key: '30d', from: '2026-01-01', to: '2026-01-30', timezone: 'America/Bogota' }, summary: { sessionsCompleted: 0, volumeKg: 0, activeDays: 0, weeklyFrequency: 0 }, comparison: null, records: [], muscleDistribution: [] });
    if (path.endsWith('/readiness/latest')) return Response.json(null);
    if (path.endsWith('/workouts') || path.endsWith('/cycle/entries')) return Response.json([]);
    throw new Error(`Unexpected request: ${path}`);
  }));
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><PaginaDashboard /></QueryClientProvider>);
  expect(await screen.findAllByText('Lútea')).not.toHaveLength(0);
  expect(paths).toContain('/api/v1/cycle/today');
  cleanup(); paths.length = 0;
  useAutenticacion.setState({ usuario: { ...user, biologicalSex: 'FEMALE', trackCycle: false } });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><PaginaDashboard /></QueryClientProvider>);
  await screen.findByText('Estado del día');
  await waitFor(() => expect(screen.queryByText('Preparando tu resumen…')).not.toBeInTheDocument());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByText('Fase del ciclo')).not.toBeInTheDocument();
  expect(screen.queryByText('Lútea')).not.toBeInTheDocument();
  expect(paths).not.toContain('/api/v1/cycle/today');
});
