import { expect, it } from 'vitest';
import { registrationPasswordError } from './registration-password';

it.each([
  '', 'a'.repeat(7), '🙂'.repeat(7), 'a'.repeat(73), 'é'.repeat(37),
  '🙂'.repeat(19), '€'.repeat(25), 'valid-pass\ud800', 'valid-pass\udc00',
  'é'.repeat(35) + 'aé',
])('rejects unusable new secrets without throwing: %s', password => {
  expect(registrationPasswordError(password)).toEqual(expect.any(String));
});

it.each([
  'a'.repeat(8), '🙂'.repeat(8), 'a'.repeat(72), 'é'.repeat(36),
  '€'.repeat(24), '🙂'.repeat(18), 'a'.repeat(71) + ' ', ' '.repeat(8),
  'e\u0301'.repeat(24),
])('accepts a complete Unicode secret within both boundaries: %s', password => {
  expect(registrationPasswordError(password)).toBeNull();
});
