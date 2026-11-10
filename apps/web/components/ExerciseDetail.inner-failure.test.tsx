import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ExerciseDetailButton, ExerciseDetailProvider } from './ExerciseDetail';
import { useAutenticacion } from '@/lib/auth-store';
import { account, detail } from '@/tests/fixtures/exercise-detail';

vi.mock('./exercise-detail/Activity', () => {
  throw new Error('synthetic-activity-delivery-failure');
});

it('preserves the drawer, metadata and keyboard close after activity delivery fails', async () => {
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
    await screen.findByText('Ejercicio de piernas.');
    fireEvent.click(screen.getByRole('tab', { name: 'Progreso' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el progreso');
    expect(screen.getByRole('dialog', { name: 'Sentadilla' })).toBeInTheDocument();
    expect(screen.queryByText('synthetic-activity-delivery-failure')).not.toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Reintentar contenido' });
    retry.focus(); fireEvent.click(retry);
    expect(screen.getByRole('button', { name: 'Cerrar ficha' })).toHaveFocus();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el progreso');
    fireEvent.click(screen.getByRole('tab', { name: 'Historial' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el historial');
    fireEvent.click(screen.getByRole('tab', { name: 'Indicaciones' }));
    expect(screen.getByText('Desciende con control.')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe(originalOverflow);
  } finally {
    cleanup(); client.clear(); vi.unstubAllGlobals(); useAutenticacion.setState({ usuario: null });
  }
});
