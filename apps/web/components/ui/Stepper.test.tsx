import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from './Stepper';

describe('Stepper', () => {
  it('identifica la magnitud y el valor al operar con teclado o lector de pantalla', () => {
    const onChange = vi.fn();
    render(<Stepper label="Peso" value={20} step={2.5} onChange={onChange} suffix="kg" />);

    expect(screen.getByRole('status', { name: 'Peso: 20 kg' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar Peso' }));
    expect(onChange).toHaveBeenCalledWith(22.5);
    fireEvent.click(screen.getByRole('button', { name: 'Disminuir Peso' }));
    expect(onChange).toHaveBeenCalledWith(17.5);
  });
});
