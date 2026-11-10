import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ModuleContent } from './ModuleContent';
import { account, progress } from '@/tests/fixtures/exercise-detail';

type Activity = typeof import('./Activity');
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function content(client: QueryClient, load: () => Promise<Activity>) {
  return <QueryClientProvider client={client}>
    <button type="button" id="module-close">Cerrar ficha</button>
    <ModuleContent load={load} loading="Cargando progreso…" failure="No pudimos cargar el progreso." beforeRetry={() => document.getElementById('module-close')?.focus()}>
      {module => <module.ExerciseDetailProgress accountId={account.id} exerciseId="squat" onContentRetry={() => document.getElementById('module-close')?.focus()} />}
    </ModuleContent>
  </QueryClientProvider>;
}

it('retries failed delivery and renders actual progress after the module becomes available', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  vi.stubGlobal('fetch', () => Promise.resolve(Response.json(progress)));
  let attempts = 0;
  const load = () => ++attempts === 1 ? Promise.reject(new Error('synthetic-temporary-delivery')) : import('./Activity');
  try {
    render(content(client, load));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el progreso');
    const retry = screen.getByRole('button', { name: 'Reintentar contenido' });
    retry.focus(); fireEvent.click(retry);
    expect(screen.getByRole('button', { name: 'Cerrar ficha' })).toHaveFocus();
    expect(await screen.findByText('2 sesiones · 2 series de trabajo · 100 kg de volumen')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(attempts).toBe(2);
  } finally {
    cleanup(); client.clear();
  }
});

it('does not let a superseded delivery failure replace the current real content', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  vi.stubGlobal('fetch', () => Promise.resolve(Response.json(progress)));
  let rejectOld!: (error: Error) => void;
  const pending = new Promise<Activity>((_, reject) => { rejectOld = reject; });
  const oldLoad = () => pending;
  const newLoad = () => import('./Activity');
  try {
    const view = render(content(client, oldLoad));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando progreso');
    // Flush the original effect so this exercises a genuinely in-flight request.
    await act(async () => { await Promise.resolve(); });
    view.rerender(content(client, newLoad));
    await screen.findByText('2 sesiones · 2 series de trabajo · 100 kg de volumen');
    await act(async () => { rejectOld(new Error('synthetic-superseded-delivery')); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('2 sesiones · 2 series de trabajo · 100 kg de volumen')).toBeInTheDocument();
  } finally { cleanup(); client.clear(); }
});
