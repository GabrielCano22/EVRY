import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PaginaCiclo from '@/app/(app)/cycle/page';
import PaginaPerfil from '@/app/(app)/profile/page';
import { CalendarioActividad } from '@/components/CalendarioActividad';
import { useAutenticacion } from '@/lib/auth-store';
import { setAccessToken } from '@/lib/api';
import { todayCivil } from '@/lib/civil-date';
import type { RegistroCiclo, Usuario } from '@/lib/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const user: Usuario = {
  id: 'account-a', email: 'alex@example.test', name: 'Alex hidratado', biologicalSex: 'OTHER',
  birthDate: null, goals: [], trackCycle: true, avgCycleLen: 28, avgPeriodLen: 5, createdAt: '2026-01-01',
};
const entry: RegistroCiclo & { userId: string } = {
  id: 'entry-a', userId: 'account-a', date: `${todayCivil()}T00:00:00.000Z`, flow: 'LIGHT', symptoms: ['fatiga'],
  energy: 3, mood: 3, notes: 'Nota privada de A', isPeriodStart: true,
};
type Pending = { path: string; method: string; signal?: AbortSignal | null; body: unknown; resolve: (body: unknown) => void; done: Promise<Response> };
const pending: Pending[] = [];
const requests: { path: string; method: string }[] = [];

function transport(defer: (path: string, method: string) => boolean, responseEntry = entry) {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    const method = init?.method ?? 'GET';
    requests.push({ path, method });
    if (!['/api/v1/cycle/today', '/api/v1/cycle/entries', '/api/v1/workouts'].includes(path)) throw new Error(`Unexpected ${method} ${path}`);
    if (defer(path, method)) {
      let resolve!: (body: unknown) => void;
      const done = new Promise<Response>((finish) => { resolve = (body) => finish(Response.json(body)); });
      pending.push({ path, method, signal: init?.signal, body: init?.body ? JSON.parse(String(init.body)) : undefined, resolve, done });
      return done;
    }
    return Promise.resolve(Response.json(path.endsWith('/cycle/today') ? null : path.endsWith('/cycle/entries') ? [responseEntry] : []));
  }));
}
async function settle(items: Pending[], late = false) {
  await act(async () => {
    for (const item of items) item.resolve(item.method === 'POST' ? entry : item.path.endsWith('/cycle/today') ? null : late ? [entry] : []);
    await Promise.all(items.map((item) => item.done));
  });
}
beforeEach(() => {
  pending.length = 0; requests.length = 0; setAccessToken(null);
  useAutenticacion.setState({ usuario: user, estado: 'authenticated', cargando: false, error: null });
});
afterEach(async () => { cleanup(); await settle(pending); setAccessToken(null); vi.unstubAllGlobals(); });

it('hydrates the profile from the real session then saves and reloads disabled consent', async () => {
  useAutenticacion.setState({ usuario: null });
  let saved = user;
  const bodies: unknown[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    if (path !== '/api/v1/users/me') throw new Error(`Unexpected ${path}`);
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)); bodies.push(body); saved = { ...user, ...body };
    }
    return Response.json(saved);
  }));
  render(<PaginaPerfil />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  await act(async () => { await useAutenticacion.getState().inicializar(); });
  expect(screen.getByLabelText('Nombre')).toHaveValue('Alex hidratado');
  expect(screen.getByRole('checkbox', { name: 'Activar seguimiento' })).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Activar seguimiento' }));
  expect(screen.queryByLabelText('Ciclo (días)')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(useAutenticacion.getState().usuario?.trackCycle).toBe(false));
  expect(bodies).toContainEqual(expect.objectContaining({ name: 'Alex hidratado', trackCycle: false }));
  expect(useAutenticacion.getState().estado).toBe('authenticated');
});

it('removes opted-in OTHER calendar markers, legend and details and only reloads workouts after opt-out', async () => {
  transport(() => false);
  render(<CalendarioActividad />);
  const day = await screen.findByRole('button', { name: /inicio de período, 1 síntomas/ });
  const expectedDate = new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(entry.date));
  expect(day).toHaveAccessibleName(`Ver actividad del ${expectedDate}, inicio de período, 1 síntomas`);
  fireEvent.click(day);
  expect(screen.getByText('Nota privada de A')).toBeInTheDocument();
  expect(screen.getByText('Menstrual')).toBeInTheDocument();
  act(() => useAutenticacion.setState({ usuario: { ...user, trackCycle: false } }));
  expect(screen.queryByRole('button', { name: /inicio de período/ })).not.toBeInTheDocument();
  expect(screen.queryByText('Menstrual')).not.toBeInTheDocument();
  expect(screen.queryByText('Nota privada de A')).not.toBeInTheDocument();
  await screen.findByText('Aún no hay actividad registrada.');
  const cycleCount = requests.filter((r) => r.path.includes('/cycle/')).length;
  transport((path) => path.endsWith('/workouts'));
  act(() => { window.dispatchEvent(new CustomEvent('evry:cycle-updated')); });
  expect(pending).toHaveLength(1);
  await settle([...pending]);
  expect(await screen.findByText('Aún no hay actividad registrada.')).toBeInTheDocument();
  expect(requests.filter((r) => r.path.includes('/cycle/'))).toHaveLength(cycleCount);
});

it('does not infer calendar consent from FEMALE after loading completes', async () => {
  useAutenticacion.setState({ usuario: { ...user, biologicalSex: 'FEMALE', trackCycle: false } });
  transport(() => false);
  render(<CalendarioActividad />);
  await screen.findByText('Aún no hay actividad registrada.');
  expect(requests).toEqual([{ path: '/api/v1/workouts', method: 'GET' }]);
  expect(screen.queryByText('Menstrual')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /inicio de período/ })).not.toBeInTheDocument();
});

it('aborts pending cycle reads on opt-out, ignores late history and re-enables a fresh form', async () => {
  transport((path) => path.includes('/cycle/'));
  render(<PaginaCiclo />);
  fireEvent.change(screen.getByPlaceholderText('¿Cómo te sentiste hoy?'), { target: { value: 'Privado antes de desactivar' } });
  const old = [...pending];
  expect(old).toHaveLength(3);
  act(() => useAutenticacion.setState({ usuario: { ...user, trackCycle: false } }));
  expect(old.every((r) => r.signal?.aborted)).toBe(true);
  expect(screen.queryByRole('button', { name: 'Guardar registro' })).not.toBeInTheDocument();
  await settle(old, true);
  expect(screen.queryByRole('button', { name: /Editar registro del/ })).not.toBeInTheDocument();
  act(() => useAutenticacion.setState({ usuario: user }));
  expect(screen.getByPlaceholderText('¿Cómo te sentiste hoy?')).toHaveValue('');
  expect(pending).toHaveLength(6);
  await settle(pending.slice(3));
  await screen.findByText('Sin registros aún.');
});

it('clears private form state immediately and performs fresh reads on same-route account switch', async () => {
  transport((path) => path.includes('/cycle/'));
  render(<PaginaCiclo />);
  fireEvent.change(screen.getByPlaceholderText('¿Cómo te sentiste hoy?'), { target: { value: 'Solo cuenta A' } });
  const old = [...pending];
  act(() => useAutenticacion.setState({ usuario: { ...user, id: 'account-b', name: 'Bea' } }));
  expect(screen.getByPlaceholderText('¿Cómo te sentiste hoy?')).toHaveValue('');
  expect(old.every((r) => r.signal?.aborted)).toBe(true);
  expect(pending).toHaveLength(6);
  await settle(old, true);
  expect(screen.queryByRole('button', { name: /Editar registro del/ })).not.toBeInTheDocument();
  await settle(pending.slice(3));
  await screen.findByText('Sin registros aún.');
});

it('edits a serialized UTC-midnight cycle entry on its original civil date', async () => {
  transport(() => false);
  render(<PaginaCiclo />);
  fireEvent.click(await screen.findByRole('button', { name: /Editar registro del/ }));
  expect(screen.getByLabelText('Fecha')).toHaveValue(todayCivil());
  expect(screen.getByPlaceholderText('¿Cómo te sentiste hoy?')).toHaveValue('Nota privada de A');
});

it('keeps January 1 in the history label and edit form across the UTC month boundary', async () => {
  transport(() => false, { ...entry, date: '2026-01-01T00:00:00.000Z' });
  render(<PaginaCiclo />);
  const edit = await screen.findByRole('button', { name: 'Editar registro del 01 de ene de 2026' });
  expect(screen.getByText('01 de ene de 2026')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Editar registro del 31/ })).not.toBeInTheDocument();
  fireEvent.click(edit);
  expect(screen.getByLabelText('Fecha')).toHaveValue('2026-01-01');
  expect(screen.getByPlaceholderText('¿Cómo te sentiste hoy?')).toHaveValue('Nota privada de A');
});

it.each(['opt-out', 'account-switch'])('suppresses reads and global update after a pending save completes following %s', async (transition) => {
  transport((_path, method) => method === 'POST');
  const updates: Event[] = [];
  const onUpdate = (event: Event) => updates.push(event);
  window.addEventListener('evry:cycle-updated', onUpdate);
  try {
    render(<PaginaCiclo />);
    await screen.findByRole('button', { name: /Editar registro del/ });
    fireEvent.change(screen.getByPlaceholderText('¿Cómo te sentiste hoy?'), { target: { value: 'No compartir con B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar registro' }));
    await waitFor(() => expect(pending).toHaveLength(1));
    expect(pending[0].body).toEqual(expect.objectContaining({ notes: 'No compartir con B' }));
    act(() => useAutenticacion.setState({ usuario: transition === 'opt-out' ? { ...user, trackCycle: false } : { ...user, id: 'account-b' } }));
    if (transition === 'account-switch') {
      expect(screen.getByPlaceholderText('¿Cómo te sentiste hoy?')).toHaveValue('');
      await waitFor(() => expect(screen.queryByText('Cargando datos del ciclo…')).not.toBeInTheDocument());
    } else expect(screen.queryByRole('button', { name: 'Guardar registro' })).not.toBeInTheDocument();
    const readsBeforeCompletion = requests.filter((r) => r.method === 'GET' && r.path.includes('/cycle/')).length;
    await settle([...pending]);
    expect(requests.filter((r) => r.method === 'GET' && r.path.includes('/cycle/'))).toHaveLength(readsBeforeCompletion);
    expect(updates).toHaveLength(0);
    expect(screen.queryByDisplayValue('No compartir con B')).not.toBeInTheDocument();
    expect(screen.queryByText('Registro guardado. El calendario se actualizó.')).not.toBeInTheDocument();
  } finally { window.removeEventListener('evry:cycle-updated', onUpdate); }
});
