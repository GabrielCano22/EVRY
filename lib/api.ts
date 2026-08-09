'use client';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'evry_access';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return null;
        const data = await res.json();
        setAccessToken(data.accessToken);
        return data.accessToken as string;
      } catch {
        return null;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  opts: RequestInit & { json?: unknown; auth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const { json, auth = true, headers, timeoutMs = 15000, ...rest } = opts;
  const h = new Headers(headers);
  if (json !== undefined) h.set('Content-Type', 'application/json');
  if (auth) {
    const token = getAccessToken();
    if (token) h.set('Authorization', `Bearer ${token}`);
  }

  const doFetch = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${BASE}${path}`, {
        ...rest,
        headers: h,
        credentials: 'include',
        body: json !== undefined ? JSON.stringify(json) : rest.body,
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        throw new ApiError(0, 'Tiempo de espera agotado. ¿Está corriendo el servidor?');
      }
      throw new ApiError(0, 'No se pudo conectar al servidor. Verifica que el backend esté activo en localhost:4000.');
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await doFetch();
  if (res.status === 401 && auth) {
    const newTok = await tryRefresh();
    if (newTok) {
      h.set('Authorization', `Bearer ${newTok}`);
      res = await doFetch();
    }
  }

  const ct = res.headers.get('content-type') ?? '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : String(msg), data);
  }
  return data as T;
}
