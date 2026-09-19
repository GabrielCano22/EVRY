import { Suspense } from 'react';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Dashboard from '@/app/(app)/dashboard/page';
import Workouts from '@/app/(app)/workout/page';
import Session from '@/app/(app)/workout/[id]/page';
import { EditorRutina } from '@/components/EditorRutina';
import { ProgressPage } from '@/components/progress/ProgressPage';
import { ExerciseDetailProvider } from '@/components/ExerciseDetail';
import { useAutenticacion } from '@/lib/auth-store';
import type { Routine, Workout } from '@/lib/training-api';
import { account, detail, progress } from '../fixtures/exercise-detail';

const routine: Routine = { id: 'r1', userId: account.id, name: 'Pierna', dayOfWeek: null, notes: null,
  createdAt: detail.createdAt, updatedAt: detail.createdAt, exercises: [{ id: 're1', routineId: 'r1', exerciseId: detail.id,
    order: 0, targetSets: 3, targetReps: 8, targetWeightKg: 20, seriesPlan: null, notes: null, exercise: detail }] };
const workout: Workout = { id: 'w1', userId: account.id, name: 'Sesión de pierna', startedAt: detail.createdAt, endedAt: null,
  cancelledAt: null, status: 'ACTIVE', clientId: null, lastSyncId: null, revision: 1, cyclePhase: null, notes: null,
  routineId: 'r1', createdAt: detail.createdAt, updatedAt: detail.createdAt, sets: [], routine };
const requests: Request[] = [];
const navigations: string[] = [];
const router: AppRouterInstance = { bfcacheId: 'test', back() { navigations.push('back'); }, forward() { navigations.push('forward'); }, refresh() {}, push(path) { navigations.push(path); }, replace(path) { navigations.push(path); }, prefetch() {} };
beforeEach(() => {
  requests.length = 0; navigations.length = 0;
  useAutenticacion.setState({ usuario: account, estado: 'authenticated' });
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init); requests.push(request); const path = new URL(request.url).pathname;
    if (path.endsWith('/progress/overview')) return Response.json({ period: progress.period,
      summary: { sessionsCompleted: 1, volumeKg: 100, activeDays: 1, weeklyFrequency: 0.2 }, comparison: null,
      records: [{ exerciseId: detail.id, exerciseName: detail.name, kind: 'WEIGHT', value: 20, achievedAt: detail.createdAt }],
      muscleDistribution: [], streakDays: 1, recentWorkouts: [] });
    if (path.endsWith('/progress/activity')) return Response.json({ from: '2026-08-01', to: '2026-09-30', days: [] });
    if (path.includes('/progress/exercises/')) return Response.json(progress);
    if (path.endsWith('/readiness/latest')) return Response.json(null);
    if (path.endsWith('/routines')) return Response.json([routine]);
    if (path.endsWith('/workouts')) return Response.json([]);
    if (path.endsWith('/workouts/w1')) return Response.json(workout);
    if (path.endsWith('/exercises/squat')) return Response.json(detail);
    throw new Error(`Unexpected HTTP request ${path}`);
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); useAutenticacion.setState({ usuario: null }); });
function show(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<AppRouterContext.Provider value={router}><QueryClientProvider client={client}><ExerciseDetailProvider><Suspense fallback={<p>Cargando página</p>}>{children}</Suspense></ExerciseDetailProvider></QueryClientProvider></AppRouterContext.Provider>);
}
async function inspect() {
  const trigger = (await screen.findAllByRole('button', { name: 'Sentadilla' }))[0];
  fireEvent.click(trigger);
  expect(await screen.findByRole('dialog', { name: 'Sentadilla' })).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(trigger).toHaveFocus();
  expect(requests.every(request => request.method === 'GET')).toBe(true);
  expect(navigations).toEqual([]);
}
it('opens a dashboard record for inspection without navigation', async () => { show(<Dashboard />); await inspect(); });
it('opens a routine card exercise without starting or editing the routine', async () => { show(<Workouts />); await inspect(); expect(screen.getByRole('button', { name: 'Empezar rutina' })).toBeEnabled(); });
it('keeps the routine draft and exercise selection when its detail closes', async () => {
  show(<EditorRutina titulo="Editar rutina" rutinaExistente={routine} onListo={() => {}} onCancelar={() => {}} />);
  fireEvent.change(screen.getByLabelText('Nombre de la rutina'), { target: { value: 'Borrador conservado' } });
  await inspect(); expect(screen.getByLabelText('Nombre de la rutina')).toHaveValue('Borrador conservado');
  expect(screen.getByRole('button', { name: 'Eliminar Sentadilla' })).toBeInTheDocument();
});
it('gives the detail muscle map its own accessible label when another map is behind it', async () => {
  show(<EditorRutina titulo="Editar rutina" rutinaExistente={routine} onListo={() => {}} onCancelar={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Sentadilla' }));
  const dialog = await screen.findByRole('dialog', { name: 'Sentadilla' });
  const map = within(dialog).getByRole('img', { name: /^Mapa de músculos trabajados/ });
  const titleId = map.getAttribute('aria-labelledby')!.split(' ')[0];
  expect(dialog).toContainElement(document.getElementById(titleId));
});
it('opens a session exercise without activating the series editor or fetching a GIF', async () => {
  const params = Object.assign(Promise.resolve({ id: 'w1' }), { status: 'fulfilled', value: { id: 'w1' } });
  show(<Session params={params} />);
  await inspect(); expect(screen.queryByText('Registrando')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Empezar' })).toBeEnabled();
  expect(document.querySelector('img[src$=".gif"]')).toBeNull();
  expect(requests.some(request => request.url.includes('/adaptive/'))).toBe(false);
});
it('opens progress exercise names without changing the selected overview period', async () => {
  show(<ProgressPage />);
  await waitFor(() => expect(screen.getByLabelText('Periodo de progreso')).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Periodo de progreso'), { target: { value: '90d' } });
  await inspect(); expect(screen.getByLabelText('Periodo de progreso')).toHaveValue('90d');
});
