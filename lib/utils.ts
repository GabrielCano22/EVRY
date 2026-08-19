import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { civilDate, formatCivilDate } from './civil-date';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatearFecha(valor: string | Date) {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return formatCivilDate(civilDate(valor), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  const fecha = typeof valor === 'string' ? new Date(valor) : valor;
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(fecha);
}

export function formatearFechaHora(valor: string | Date) {
  const fecha = typeof valor === 'string' ? new Date(valor) : valor;
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

// Aliases en inglés para compatibilidad con código antiguo
export const formatDate = formatearFecha;
export const formatDateTime = formatearFechaHora;
