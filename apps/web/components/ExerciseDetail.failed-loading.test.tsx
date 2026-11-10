import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ExerciseDetailButton, ExerciseDetailProvider } from './ExerciseDetail';
import { useAutenticacion } from '@/lib/auth-store';
import { account, detail } from '@/tests/fixtures/exercise-detail';

// Fault injection at module transport, not a replacement visual component.
vi.mock('./exercise-detail/DetailContent', () => {
  throw new Error('synthetic-module-transport-failure');
});

it('offers a safe retry and keyboard close when content delivery repeatedly fails', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useAutenticacion.setState({ usuario: account, estado: 'authenticated' });
  vi.stubGlobal('fetch', () => Promise.resolve(Response.json(detail)));
  const originalOverflow = document.body.style.overflow;
  try {
    render(<QueryClientProvider client={client}><ExerciseDetailProvider>
      <ExerciseDetailButton exerciseId="squat">Ver Sentadilla</ExerciseDetailButton>
    </ExerciseDetailProvider></QueryClientProvider>);
    const trigger = screen.getByRole('button', { name: 'Ver Sentadilla' });
    trigger.focus(); fireEvent.click(trigger);
    const close = screen.getByRole('button', { name: 'Cerrar ficha' });
    expect(close).toHaveFocus();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la ficha');
    expect(screen.queryByText('synthetic-module-transport-failure')).not.toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Reintentar ficha' });
    retry.focus(); expect(retry).toHaveFocus();
    fireEvent.click(retry);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando ejercicio');
    expect(close).toHaveFocus();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la ficha');
    expect(screen.getByRole('button', { name: 'Cerrar ficha' })).toBe(close);
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus(); expect(document.body.style.overflow).toBe(originalOverflow);
  } finally {
    cleanup(); client.clear(); vi.unstubAllGlobals(); useAutenticacion.setState({ usuario: null });
  }
});
