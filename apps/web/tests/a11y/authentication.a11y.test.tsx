import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PaginaIngreso from '@/app/(auth)/login/page';
import PaginaRegistro from '@/app/(auth)/register/page';
import { useAutenticacion } from '@/lib/auth-store';

// Navigation needs a Next router; the forms, auth store and UI stay real.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  localStorage.clear();
  useAutenticacion.setState({ usuario: null, cargando: false, error: null });
});
afterEach(() => { cleanup(); localStorage.clear(); });

// Explicit semantic scan, not browser contrast/layout or screen-reader evidence.
const semanticRules = ['link-name', 'button-name', 'label', 'aria-valid-attr',
  'aria-valid-attr-value', 'aria-required-attr'];

it('gives registration navigation and controls accessible names', async () => {
  const { container } = render(<PaginaRegistro />);
  const result = await axe(container, { runOnly: { type: 'rule', values: semanticRules } });
  expect(result.violations).toHaveLength(0);
  expect(screen.getByRole('link', { name: 'Volver al menú principal' })).toHaveAttribute('href', '/');
  expect(screen.getByLabelText('Nombre')).toBeRequired();
  expect(screen.getByLabelText('Correo electrónico')).toBeRequired();
  expect(screen.getByLabelText('Contraseña (mín. 8 caracteres)')).toBeRequired();
});

it('names the registration preference group', () => {
  render(<PaginaRegistro />);
  expect(screen.getByRole('group', { name: 'Sexo biológico' })).toBeInTheDocument();
});

it('exposes the selected registration preference and updates it exclusively', () => {
  render(<PaginaRegistro />);
  const female = screen.getByRole('button', { name: 'Femenino' });
  const other = screen.getByRole('button', { name: 'Otro' });
  expect(female).toHaveAttribute('aria-pressed', 'false');
  expect(other).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(female);
  expect(female).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(other);
  expect(other).toHaveAttribute('aria-pressed', 'true');
  expect(female).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('checkbox', { name: 'Activar seguimiento del ciclo' })).not.toBeChecked();
});

it('announces registration validation instead of leaving a silent visual error', () => {
  const { container } = render(<PaginaRegistro />);
  fireEvent.submit(container.querySelector('form')!);
  expect(screen.getByRole('alert')).toHaveTextContent('Selecciona una opción de sexo biológico.');
  fireEvent.click(screen.getByRole('button', { name: 'Prefiero no decir' }));
  fireEvent.submit(container.querySelector('form')!);
  expect(screen.getByRole('alert')).toHaveTextContent('La contraseña debe tener al menos 8 caracteres.');
});

it('keeps the real login controls labelled and recovery message announced', async () => {
  useAutenticacion.setState({ error: 'No se pudo ingresar. Inténtalo de nuevo.' });
  const { container } = render(<PaginaIngreso />);
  expect(screen.getByLabelText('Correo electrónico')).toBeRequired();
  expect(screen.getByLabelText('Contraseña')).toBeRequired();
  expect(screen.getByRole('alert')).toHaveTextContent('No se pudo ingresar.');
  const result = await axe(container, { runOnly: { type: 'rule', values: semanticRules } });
  expect(result.violations).toHaveLength(0);
});
