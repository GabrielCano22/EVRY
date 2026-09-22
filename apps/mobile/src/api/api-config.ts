const DEVELOPMENT_API_BASE_URL = 'http://10.0.2.2:4000/api/v1';
const API_PREFIX = '/api/v1';

export function resolveMobileApiBaseUrl(configuredValue: string | undefined, isDevelopment: boolean): string {
  const configured = configuredValue?.trim();
  if (!configured) {
    if (isDevelopment) return DEVELOPMENT_API_BASE_URL;
    throw new Error('EXPO_PUBLIC_API_BASE_URL es obligatoria en builds de release.');
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL debe ser una URL absoluta válida.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL debe usar HTTP o HTTPS.');
  }
  if (!isDevelopment && url.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL debe usar HTTPS en builds de release.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL no admite credenciales, consultas ni fragmentos.');
  }

  const normalizedPath = url.pathname.replace(/\/+$/, '');
  if (normalizedPath !== API_PREFIX) {
    throw new Error(`EXPO_PUBLIC_API_BASE_URL debe apuntar exactamente a ${API_PREFIX}.`);
  }

  return `${url.origin}${API_PREFIX}`;
}
