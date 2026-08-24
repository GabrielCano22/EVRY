import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl, resolveApiOrigin } from './api-origin';

describe('origen de API', () => {
  it('usa exclusivamente la variable pública canónica y normaliza espacios y barra final', () => {
    const environment = {
      NEXT_PUBLIC_API_BASE_URL: '  https://api.example.test/api/  ',
    };

    expect(resolveApiBaseUrl(environment)).toBe('https://api.example.test/api');
    expect(resolveApiOrigin(environment)).toBe('https://api.example.test');
  });

  it('usa el origen local de respaldo cuando falta la variable canónica', () => {
    expect(resolveApiBaseUrl({})).toBe('http://localhost:4000/api');
    expect(resolveApiOrigin({})).toBe('http://localhost:4000');
  });

  it('usa el respaldo cuando la variable canónica solo contiene espacios', () => {
    expect(resolveApiBaseUrl({ NEXT_PUBLIC_API_BASE_URL: '   ' })).toBe('http://localhost:4000/api');
  });
});
