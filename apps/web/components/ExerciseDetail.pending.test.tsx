import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ExerciseDetailButton, ExerciseDetailProvider } from './ExerciseDetail';
import { useAutenticacion } from '@/lib/auth-store';
import { account, detail } from '@/tests/fixtures/exercise-detail';

// Delay only module delivery; render the real content once delivery completes.
const delivery = vi.hoisted(() => {
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  let delivered!: () => void;
  const done = new Promise<void>(resolve => { delivered = resolve; });
  return { ready, release, done, delivered };
});
vi.mock('./exercise-detail/DetailContent', async () => {
  await delivery.ready;
  const actualExports = await vi.importActual('./exercise-detail/DetailContent');
  delivery.delivered();
  return actualExports;
});

it('keeps keyboard close available during chunk delivery and preserves the frame on completion', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useAutenticacion.setState({ usuario: account, estado: 'authenticated' });
  vi.stubGlobal('fetch', () => Promise.resolve(Response.json(detail)));
  const originalOverflow = document.body.style.overflow;
  try {
    render(<QueryClientProvider client={client}><ExerciseDetailProvider>
      <ExerciseDetailButton exerciseId="squat" tab="instructions">Ver indicaciones</ExerciseDetailButton>
    </ExerciseDetailProvider></QueryClientProvider>);
    const trigger = screen.getByRole('button', { name: 'Ver indicaciones' });
    trigger.focus(); fireEvent.click(trigger);
    const close = screen.getByRole('button', { name: 'Cerrar ficha' });
    expect(close).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando ejercicio');
    fireEvent.keyDown(close, { key: 'Tab' }); expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true }); expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus(); expect(document.body.style.overflow).toBe(originalOverflow);
    await act(async () => { delivery.release(); await delivery.done; });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    const reopenedClose = screen.getByRole('button', { name: 'Cerrar ficha' });
    await screen.findByText('Desciende con control.');
    expect(screen.getByRole('dialog', { name: 'Sentadilla' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar ficha' })).toBe(reopenedClose);
    expect(reopenedClose).toHaveFocus(); expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(reopenedClose);
    expect(trigger).toHaveFocus(); expect(document.body.style.overflow).toBe(originalOverflow);
  } finally {
    delivery.release(); cleanup(); client.clear(); vi.unstubAllGlobals();
    useAutenticacion.setState({ usuario: null });
  }
});
