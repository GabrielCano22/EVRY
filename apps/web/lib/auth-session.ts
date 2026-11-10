import { cancelDocumentRefresh } from './document-refresh';

let generation = 0;

export function currentSessionGeneration(): number {
  return generation;
}

export function beginNewSession(): number {
  cancelDocumentRefresh();
  generation += 1;
  return generation;
}

export function invalidateSession(): number {
  cancelDocumentRefresh();
  generation += 1;
  return generation;
}

export function isCurrentSessionGeneration(value: number): boolean {
  return value === generation;
}
