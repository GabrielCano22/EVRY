let generation = 0;

export function currentSessionGeneration(): number {
  return generation;
}

export function beginNewSession(): number {
  generation += 1;
  return generation;
}

export function invalidateSession(): number {
  generation += 1;
  return generation;
}

export function isCurrentSessionGeneration(value: number): boolean {
  return value === generation;
}
