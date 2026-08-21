import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ request }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/components/EditorRutina', () => ({ EditorRutina: ({ titulo }: { titulo: string }) => <div>{titulo}</div> }));
import EditarRutina from './page';

const routine = { id: 'r2', name: 'Rutina nueva', exercises: [] };
const failure = { ok: false as const, error: { status: 0, code: 'network_error', message: 'Temporal', retryable: true } };
function resolvedParams(id: string): Promise<{ id: string }> {
  const params = Promise.resolve({ id }) as Promise<{ id: string }> & { status?: string; value?: { id: string } };
  params.status = 'fulfilled';
  params.value = { id };
  return params;
}

beforeEach(() => request.mockReset());

describe('EditarRutina remote state', () => {
  it('retries from error through loading to success', async () => {
    request.mockResolvedValueOnce(failure).mockResolvedValueOnce({ ok: true, data: routine });
    render(<EditarRutina params={resolvedParams('r1')} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la rutina');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Cargando');
    await waitFor(() => expect(screen.getByText('Editar: Rutina nueva')).toBeInTheDocument());
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('ignores an older response after a newer route load succeeds', async () => {
    let resolveOld!: (value: unknown) => void;
    request.mockReturnValueOnce(new Promise((done) => { resolveOld = done; }))
      .mockResolvedValueOnce({ ok: true, data: routine });
    const view = render(<EditarRutina params={resolvedParams('old')} />);
    view.rerender(<EditarRutina params={resolvedParams('new')} />);
    await waitFor(() => expect(screen.getByText('Editar: Rutina nueva')).toBeInTheDocument());
    resolveOld(failure);
    await Promise.resolve();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
