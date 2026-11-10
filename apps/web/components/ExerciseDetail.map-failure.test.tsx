import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ExerciseDetailButton, ExerciseDetailProvider } from './ExerciseDetail';
import { useAutenticacion } from '@/lib/auth-store';
import { account, detail } from '@/tests/fixtures/exercise-detail';

vi.mock('./MapaMuscular', () => { throw new Error('synthetic-map-delivery-failure'); });

it('keeps metadata and explicit close usable when the muscle-map module fails', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  useAutenticacion.setState({ usuario: account, estado: 'authenticated' });
  vi.stubGlobal('fetch', () => Promise.resolve(Response.json(detail)));
  try {
    render(<QueryClientProvider client={client}><ExerciseDetailProvider>
      <ExerciseDetailButton exerciseId="squat">Ver Sentadilla</ExerciseDetailButton>
    </ExerciseDetailProvider></QueryClientProvider>);
    const trigger = screen.getByRole('button', { name: 'Ver Sentadilla' });
    trigger.focus(); fireEvent.click(trigger);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el mapa muscular');
    expect(screen.getByText('Ejercicio de piernas.')).toBeInTheDocument();
    expect(screen.queryByText('synthetic-map-delivery-failure')).not.toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Reintentar contenido' });
    retry.focus(); fireEvent.click(retry);
    expect(screen.getByRole('button', { name: 'Cerrar ficha' })).toHaveFocus();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el mapa muscular');
    expect(screen.getByText('Ejercicio de piernas.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  } finally {
    cleanup(); client.clear(); vi.unstubAllGlobals(); useAutenticacion.setState({ usuario: null });
  }
});
