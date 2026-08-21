import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, vi, describe, expect, it } from 'vitest';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ request }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null,
}));
import { ExerciseChart } from './ExerciseChart';

beforeEach(() => request.mockReset());

describe('ExerciseChart remote state', () => {
  it('shows loading, exposes an error, retries, then renders success', async () => {
    let resolve!: (value: unknown) => void;
    request.mockReturnValueOnce(new Promise((done) => { resolve = done; }))
      .mockResolvedValueOnce({ ok: true, data: [{ weightKg: 10, reps: 8, rpe: 7, completedAt: '2026-08-19T12:00:00Z' }] });
    render(<ExerciseChart exerciseId="e1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando evolución');
    resolve({ ok: false, error: { status: 0, code: 'network_error', message: 'Temporal', retryable: true } });
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la evolución');
    expect(screen.queryByText('Sin datos para graficar.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.queryByText('Sin datos para graficar.')).not.toBeInTheDocument();
  });

  it('keeps the newer success when an older request resolves later', async () => {
    let resolveOld!: (value: unknown) => void;
    request.mockReturnValueOnce(new Promise((done) => { resolveOld = done; }))
      .mockResolvedValueOnce({ ok: true, data: [{ weightKg: 20, reps: 5, rpe: 7, completedAt: '2026-08-19T12:00:00Z' }] });
    const view = render(<ExerciseChart exerciseId="old" />);
    view.rerender(<ExerciseChart exerciseId="new" />);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    resolveOld({ ok: false, error: { status: 0, code: 'network_error', message: 'Viejo', retryable: true } });
    await Promise.resolve();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
