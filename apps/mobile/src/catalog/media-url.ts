export function mediaUrl(
  path: string | null | undefined,
  apiBaseUrl: string,
): string | null {
  const trimmed = path?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const relative = trimmed.replace(/^\/+/, '');
  const normalizedPath = relative.startsWith('media/exercises/') ? relative : `media/exercises/${relative}`;
  try {
    return `${new URL(apiBaseUrl).origin}/${normalizedPath}`;
  } catch {
    return `${apiBaseUrl.replace(/\/api\/v\d+\/?$/i, '').replace(/\/+$/, '')}/${normalizedPath}`;
  }
}
