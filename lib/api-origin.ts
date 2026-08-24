export const DEFAULT_API_BASE_URL = 'http://localhost:4000/api';

type PublicEnvironment = Record<string, string | undefined>;

export function resolveApiBaseUrl(environment: PublicEnvironment = process.env): string {
  const configuredBaseUrl = environment.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '');
  return configuredBaseUrl || DEFAULT_API_BASE_URL;
}

export function resolveApiOrigin(environment: PublicEnvironment = process.env): string {
  return resolveApiBaseUrl(environment).replace(/\/api(?:\/.*)?$/, '');
}
