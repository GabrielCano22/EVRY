import { resolveMobileApiBaseUrl } from './api-config';

describe('mobile API configuration', () => {
  it('uses the Android emulator fallback only during development', () => {
    expect(resolveMobileApiBaseUrl(undefined, true)).toBe('http://10.0.2.2:4000/api/v1');
    expect(() => resolveMobileApiBaseUrl(undefined, false)).toThrow(
      'EXPO_PUBLIC_API_BASE_URL es obligatoria en builds de release.',
    );
  });

  it('allows an explicit HTTP endpoint in development but rejects it in release', () => {
    expect(resolveMobileApiBaseUrl(' http://192.168.1.20:4000/api/v1/ ', true))
      .toBe('http://192.168.1.20:4000/api/v1');
    for (const endpoint of [
      'http://api.example.com/api/v1',
      'http://127.0.0.1:4000/api/v1',
      'http://10.0.2.2:4000/api/v1',
    ]) {
      expect(() => resolveMobileApiBaseUrl(endpoint, false)).toThrow(
        'EXPO_PUBLIC_API_BASE_URL debe usar HTTPS en builds de release.',
      );
    }
  });

  it('normalizes a secure release URL to the canonical API prefix', () => {
    expect(resolveMobileApiBaseUrl('HTTPS://API.Example.com:443/api/v1/', false))
      .toBe('https://api.example.com/api/v1');
  });

  it.each([
    'https://api.example.com',
    'https://api.example.com/api/v2',
    'https://api.example.com/api/v1/workouts',
    'https://api.example.com/api/v1?tenant=private',
    'https://api.example.com/api/v1#fragment',
    'https://user:secret@api.example.com/api/v1',
    'not-a-url',
  ])('rejects an endpoint outside the exact /api/v1 boundary: %s', (configured) => {
    expect(() => resolveMobileApiBaseUrl(configured, false)).toThrow();
  });
});
