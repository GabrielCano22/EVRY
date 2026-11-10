import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Input } from './Input';

afterEach(cleanup);

it('exposes an invalid field with its own error description and stable label', () => {
  render(<Input label="Correo electrónico" error="Correo inválido." />);
  const input = screen.getByRole('textbox', { name: /Correo electrónico/ });
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription('Correo inválido.');
  expect(input).toHaveAccessibleName('Correo electrónico');
});

it('preserves caller help text and removes the stale error on recovery', () => {
  const view = render(<><p id="email-help">Usa tu correo personal.</p>
    <Input id="email" label="Correo" aria-describedby="email-help" error="Revisa el correo." />
  </>);
  const input = screen.getByRole('textbox', { name: /Correo/ });
  expect(input).toHaveAccessibleDescription('Usa tu correo personal. Revisa el correo.');
  const originalId = input.id;
  view.rerender(<><p id="email-help">Usa tu correo personal.</p>
    <Input id="email" label="Correo" aria-describedby="email-help" />
  </>);
  expect(input.id).toBe(originalId);
  expect(input).not.toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAttribute('aria-describedby', 'email-help');
  expect(input).toHaveAccessibleDescription('Usa tu correo personal.');
  expect(screen.queryByText('Revisa el correo.')).not.toBeInTheDocument();
});

it('keeps same-labelled fields and errors isolated with distinct fallback ids', () => {
  render(<><Input label="Nombre" error="Revisa el primer nombre." />
    <Input label="Nombre" error="Revisa el segundo nombre." /></>);
  const [first, second] = screen.getAllByRole('textbox');
  expect(first.id).not.toBe(second.id);
  expect(first).toHaveAccessibleName('Nombre');
  expect(second).toHaveAccessibleName('Nombre');
  expect(first).toHaveAccessibleDescription('Revisa el primer nombre.');
  expect(second).toHaveAccessibleDescription('Revisa el segundo nombre.');
});

it('does not turn validation text into part of the field name', () => {
  render(<Input label="Nombre" error="Revisa el nombre." />);
  expect(screen.getByRole('textbox')).toHaveAccessibleName('Nombre');
});

it('retains explicit caller accessibility metadata, id and forwarded ref', () => {
  const ref = createRef<HTMLInputElement>();
  render(<><span id="external-label">Nombre público</span><p id="external-help">Ayuda externa</p>
    <Input ref={ref} id="public-name" label="Nombre" aria-labelledby="external-label"
      aria-describedby="external-help" aria-invalid="grammar" autoComplete="name" />
  </>);
  const input = screen.getByRole('textbox', { name: 'Nombre público' });
  expect(input).toBe(ref.current);
  expect(input).toHaveAttribute('id', 'public-name');
  expect(input).toHaveAttribute('autocomplete', 'name');
  expect(input).toHaveAttribute('aria-invalid', 'grammar');
  expect(input).toHaveAccessibleDescription('Ayuda externa');
});

it('preserves caller aria-label instead of replacing it with the visible label', () => {
  render(<Input label="Buscar" aria-label="Buscar ejercicios" />);
  expect(screen.getByRole('textbox', { name: 'Buscar ejercicios' })).toBeInTheDocument();
});
