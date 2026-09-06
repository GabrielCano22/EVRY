export const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';

type PublicEnvironment = Record<string, string | undefined>;

export function resolveApiBaseUrl(environment: PublicEnvironment = {
  // Next.js only inlines public configuration referenced directly at build time.
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
}): string {
  const configuredBaseUrl = environment.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '');
  return configuredBaseUrl || DEFAULT_API_BASE_URL;
}

export function resolveApiOrigin(environment?: PublicEnvironment): string {
  return resolveApiBaseUrl(environment).replace(/\/api(?:\/.*)?$/, '');
}
