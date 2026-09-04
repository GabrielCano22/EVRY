import { civilDate, type CivilDate } from './civil-date';

/** Cycle dates are civil dates serialized by the API at UTC midnight, not local instants. */
export function cycleCivilDate(value: string): CivilDate {
  return civilDate(value.replace(/T00:00:00(?:\.000)?Z$/, ''));
}
