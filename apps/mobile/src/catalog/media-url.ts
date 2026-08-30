export function mediaUrl(
  path: string | null | undefined,
  apiBaseUrl: string,
): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.trim().replace(/^\/+/, '');
  try {
    return `${new URL(apiBaseUrl).origin}/${normalizedPath}`;
  } catch {
    return `${apiBaseUrl.replace(/\/api\/v\d+\/?$/i, '').replace(/\/+$/, '')}/${normalizedPath}`;
  }
}
