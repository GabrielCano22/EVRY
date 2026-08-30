import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ingresar = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth-store', () => ({ useAutenticacion: () => ({ ingresar, cargando: false, error: null }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('@/components/ui/Button', () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock('@/components/ui/Input', () => ({ Input: ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => <label>{label}<input {...props} /></label> }));
vi.mock('@/components/ui/Icon', () => ({ Icon: () => null }));
import PaginaIngreso from './page';

beforeEach(() => { ingresar.mockReset(); push.mockReset(); localStorage.clear(); });

describe('PaginaIngreso', () => {
  it('shows a rejected login without navigating or persisting the email', async () => {
    ingresar.mockRejectedValueOnce(new Error('Credenciales inválidas'));
    render(<PaginaIngreso />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'eva@example.test' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto' } });
    fireEvent.click(screen.getByLabelText('Recordar usuario en este dispositivo'));
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(push).not.toHaveBeenCalled();
    expect(localStorage.getItem('evry_email_recordado')).toBeNull();
  });
});
