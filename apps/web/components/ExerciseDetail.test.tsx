import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ExerciseDetailProvider, ExerciseDetailButton } from './ExerciseDetail';
import { ExercisePicker } from './ExercisePicker';
import { useAutenticacion } from '@/lib/auth-store';
import { account, detail, progress } from '@/tests/fixtures/exercise-detail';

let answer: (request: Request) => Promise<Response>;
let client: QueryClient;
const requests: Request[] = [];
beforeEach(() => {
  requests.length = 0;
  useAutenticacion.setState({ usuario: account, estado: 'authenticated' });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  answer = async request => Response.json(new URL(request.url).pathname.includes('/progress/') ? progress : detail);
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init); requests.push(request); return answer(request);
  });
});
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); useAutenticacion.setState({ usuario: null }); });
function show(children = <><ExerciseDetailButton exerciseId="squat">Ver Sentadilla</ExerciseDetailButton><ExerciseDetailButton exerciseId="other">Ver otro</ExerciseDetailButton></>) {
  return render(<QueryClientProvider client={client}><ExerciseDetailProvider>{children}</ExerciseDetailProvider></QueryClientProvider>);
}
async function open() { fireEvent.click(screen.getByRole('button', { name: 'Ver Sentadilla' })); return screen.findByRole('dialog', { name: 'Sentadilla' }); }

it('loads metadata and requests the GIF only after explicit play, then stops it', async () => {
  show(); const dialog = await open();
  expect(within(dialog).getByText('Ejercicio de piernas.')).toBeInTheDocument();
  expect(within(dialog).getByAltText('Demostración de Sentadilla')).toHaveAttribute('src', expect.stringContaining('.jpg'));
  expect(requests).toHaveLength(1);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Reproducir GIF' }));
  expect(within(dialog).getByAltText('Demostración de Sentadilla')).toHaveAttribute('src', expect.stringContaining('.gif'));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Detener GIF' }));
  expect(within(dialog).getByAltText('Demostración de Sentadilla')).toHaveAttribute('src', expect.stringContaining('.jpg'));
});
it('shows loading and error separately and retries metadata', async () => {
  let resolve!: (response: Response) => void;
  answer = () => new Promise(done => { resolve = done; }); show();
  fireEvent.click(screen.getByRole('button', { name: 'Ver Sentadilla' }));
  expect(screen.getByRole('status')).toHaveTextContent('Cargando ejercicio');
  await waitFor(() => expect(resolve).toBeDefined());
  await act(async () => resolve(Response.json({}, { status: 503 })));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el ejercicio');
  answer = async () => Response.json(detail);
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar ejercicio' }));
  expect(await screen.findByRole('dialog', { name: 'Sentadilla' })).toBeInTheDocument();
});
it('keeps a custom exercise honest when media and instructions are absent', async () => {
  answer = async () => Response.json({ ...detail, isCustom: true, imagePath: null, imageUrl: null, gifPath: null, gifUrl: null, instructionSteps: null });
  show(); const dialog = await open();
  expect(within(dialog).getByText('Sin demostración disponible')).toBeInTheDocument();
  expect(within(dialog).queryByRole('button', { name: 'Reproducir GIF' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Indicaciones' }));
  expect(screen.getByText('Sin indicaciones disponibles.')).toBeInTheDocument();
  expect(screen.getByText('Fuente del catálogo')).toBeInTheDocument();
});
it('supports tab arrows, Home/End, focus containment, Escape and restoration', async () => {
  const user = userEvent.setup(); show();
  const trigger = screen.getByRole('button', { name: 'Ver Sentadilla' }); trigger.focus();
  await user.click(trigger); await screen.findByRole('dialog', { name: 'Sentadilla' });
  expect(screen.getByRole('button', { name: 'Cerrar ficha' })).toHaveFocus();
  expect(document.body.style.overflow).toBe('hidden');
  await user.tab({ shift: true }); expect(screen.getByRole('button', { name: 'Espalda' })).toHaveFocus();
  await user.tab(); expect(screen.getByRole('button', { name: 'Cerrar ficha' })).toHaveFocus();
  screen.getByRole('tab', { name: 'Resumen' }).focus();
  await user.keyboard('{End}'); expect(screen.getByRole('tab', { name: 'Indicaciones' })).toHaveFocus();
  expect(screen.getByRole('tabpanel', { name: 'Indicaciones' })).toHaveTextContent('Desciende con control.');
  await user.keyboard('{Home}{ArrowRight}'); expect(screen.getByRole('tab', { name: 'Progreso' })).toHaveAttribute('aria-selected', 'true');
  await user.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus(); expect(document.body.style.overflow).toBe('');
});
it('cancels closing and changing exercise reads and ignores late responses', async () => {
  let resolve!: (response: Response) => void;
  answer = () => new Promise(done => { resolve = done; }); show();
  fireEvent.click(screen.getByRole('button', { name: 'Ver Sentadilla' }));
  await waitFor(() => expect(requests).toHaveLength(1));
  answer = async () => Response.json({ ...detail, id: 'other', name: 'Otro ejercicio' });
  fireEvent.click(screen.getByRole('button', { name: 'Ver otro', hidden: true }));
  expect(await screen.findByRole('dialog', { name: 'Otro ejercicio' })).toBeInTheDocument();
  expect(requests[0].signal.aborted).toBe(true);
  await act(async () => resolve(Response.json(detail)));
  expect(screen.queryByRole('dialog', { name: 'Sentadilla' })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  answer = () => new Promise(() => {});
  fireEvent.click(screen.getByRole('button', { name: 'Ver Sentadilla' }));
  await waitFor(() => expect(requests).toHaveLength(3));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(requests[2].signal.aborted).toBe(true);
});
it('isolates account data and closes the old account panel', async () => {
  show(); await open();
  act(() => useAutenticacion.setState({ usuario: { ...account, id: 'detail-b' } }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await open(); expect(requests).toHaveLength(2);
});
it('loads progress on demand, switches periods and respects null all-time comparison', async () => {
  answer = async request => {
    const url = new URL(request.url);
    return Response.json(url.pathname.includes('/progress/') ? { ...progress, comparison: url.searchParams.get('period') === 'all' ? null : progress.comparison } : detail);
  };
  show(); await open(); expect(requests).toHaveLength(1);
  fireEvent.click(screen.getByRole('tab', { name: 'Progreso' }));
  expect(await screen.findByText(/100 kg de volumen/)).toBeInTheDocument();
  expect(screen.getByText(/\+50 kg frente al periodo anterior/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Periodo del ejercicio'), { target: { value: 'all' } });
  expect(await screen.findByText('Sin periodo anterior comparable.')).toBeInTheDocument();
  expect(new URL(requests.at(-1)!.url).searchParams.get('period')).toBe('all');
});
it('paginates by canonical cursor, preserves earlier sessions after errors and deduplicates retry', async () => {
  let failed = false;
  answer = async request => {
    const url = new URL(request.url);
    if (!url.pathname.includes('/progress/')) return Response.json(detail);
    if (!url.searchParams.has('cursor')) return Response.json(progress);
    if (!failed) { failed = true; return Response.json({}, { status: 503 }); }
    return Response.json({ ...progress, history: { ...progress.history, hasMore: false, nextCursor: null,
      items: [...progress.history.items, { ...progress.history.items[0], workoutId: 'w2', workoutName: 'Segunda sesión' }] } });
  };
  show(); await open(); fireEvent.click(screen.getByRole('tab', { name: 'Historial' }));
  await screen.findByText('Primera sesión'); fireEvent.click(screen.getByRole('button', { name: 'Cargar más sesiones' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar más sesiones');
  expect(screen.getByText('Primera sesión')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar página' }));
  await screen.findByText('Segunda sesión'); expect(screen.getAllByText('Primera sesión')).toHaveLength(1);
  expect(new URL(requests.at(-1)!.url).searchParams.get('cursor')).toBe('opaque-token');
});
it('keeps metadata usable after progress fails and offers an independent retry', async () => {
  answer = async request => new URL(request.url).pathname.includes('/progress/') ? Response.json({}, { status: 503 }) : Response.json(detail);
  show(); await open(); fireEvent.click(screen.getByRole('tab', { name: 'Progreso' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el progreso');
  expect(screen.queryByText('Sin datos de carga para graficar.')).not.toBeInTheDocument();
  answer = async () => Response.json(progress);
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar progreso' }));
  expect(await screen.findByText(/100 kg de volumen/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Resumen' }));
  expect(screen.getByText('Ejercicio de piernas.')).toBeInTheDocument();
});
it('opens instructions directly and keeps view separate from picker add and close', async () => {
  answer = async request => Response.json(new URL(request.url).pathname.endsWith('/exercises') ? { items: [detail], page: 1, limit: 30, total: 1, hasMore: false } : detail);
  let picked = ''; let closed = false;
  show(<><ExercisePicker onPick={item => { picked = item.id; }} onClose={() => { closed = true; }} /><ExerciseDetailButton exerciseId="squat" tab="instructions">Ver indicaciones</ExerciseDetailButton></>);
  fireEvent.change(screen.getByPlaceholderText('Buscar por nombre, músculo o equipo…'), { target: { value: 'Sentadilla' } });
  fireEvent.change(screen.getByLabelText('Zona muscular'), { target: { value: 'QUADS' } });
  const view = await screen.findByRole('button', { name: 'Ver Sentadilla' });
  const results = view.closest('ul')!; results.scrollTop = 120;
  fireEvent.click(view); await screen.findByRole('dialog', { name: 'Sentadilla' });
  expect(picked).toBe('');
  fireEvent.keyDown(screen.getByRole('dialog', { name: 'Sentadilla' }), { key: 'Escape' });
  expect(closed).toBe(false); expect(view).toHaveFocus();
  expect(screen.getByPlaceholderText('Buscar por nombre, músculo o equipo…')).toHaveValue('Sentadilla');
  expect(screen.getByLabelText('Zona muscular')).toHaveValue('QUADS');
  expect(results.scrollTop).toBe(120);
  fireEvent.click(screen.getByRole('button', { name: 'Agregar Sentadilla' })); expect(picked).toBe('squat');
  fireEvent.click(screen.getByRole('button', { name: 'Ver indicaciones' }));
  expect(await screen.findByRole('tabpanel', { name: 'Indicaciones' })).toHaveTextContent('Desciende con control.');
});

it('keeps history errors distinct from an empty result and retries independently', async () => {
  answer = async request => new URL(request.url).pathname.includes('/progress/') ? Response.json({}, { status: 503 }) : Response.json(detail);
  show(); await open(); fireEvent.click(screen.getByRole('tab', { name: 'Historial' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el historial');
  expect(screen.queryByText('No hay sesiones registradas para este ejercicio.')).not.toBeInTheDocument();
  answer = async () => Response.json({ ...progress, history: { ...progress.history, items: [], total: 0, hasMore: false, nextCursor: null } });
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar historial' }));
  expect(await screen.findByText('No hay sesiones registradas para este ejercicio.')).toBeInTheDocument();
});

it('cancels old progress on period changes and cancels history when the dialog closes', async () => {
  answer = async request => new URL(request.url).pathname.includes('/progress/') ? new Promise(() => {}) : Response.json(detail);
  show(); await open(); fireEvent.click(screen.getByRole('tab', { name: 'Progreso' }));
  await waitFor(() => expect(requests).toHaveLength(2));
  fireEvent.change(screen.getByLabelText('Periodo del ejercicio'), { target: { value: '6m' } });
  await waitFor(() => expect(requests).toHaveLength(3));
  expect(requests[1].signal.aborted).toBe(true);
  fireEvent.click(screen.getByRole('tab', { name: 'Historial' }));
  await waitFor(() => expect(requests).toHaveLength(4));
  expect(requests[2].signal.aborted).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }));
  expect(requests[3].signal.aborted).toBe(true);
});

it('retains sessions and identifies a failed background history refresh', async () => {
  show(); await open(); fireEvent.click(screen.getByRole('tab', { name: 'Historial' }));
  await screen.findByText('Primera sesión');
  answer = async () => Response.json({}, { status: 503 });
  await act(async () => { await client.invalidateQueries({ queryKey: ['exercise-detail-history'] }); });
  expect(screen.getByText('Primera sesión')).toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos actualizar el historial');
});
