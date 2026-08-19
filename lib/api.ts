'use client';

import { currentSessionGeneration, isCurrentSessionGeneration } from './auth-session';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'evry_access';
const DEFAULT_TIMEOUT_MS = 15_000;

export interface ApiFailure {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
  fieldErrors?: Record<string, string[]>;
  details?: unknown;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null, generation?: number): boolean {
  if (generation !== undefined && !isCurrentSessionGeneration(generation)) return false;
  if (typeof window === 'undefined') return false;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  return true;
}

export class ApiError extends Error implements ApiFailure {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string[]>;
  readonly details?: unknown;

  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = 'ApiError';
    this.status = failure.status;
    this.code = failure.code;
    this.retryable = failure.retryable;
    this.fieldErrors = failure.fieldErrors;
    this.details = failure.details;
  }
}

const refreshing = new Map<number, Promise<ApiResult<string>>>();

async function tryRefresh(generation: number): Promise<ApiResult<string>> {
  let shared = refreshing.get(generation);
  if (!shared) {
    shared = (async () => {
      try {
        const result = await requestInternal<unknown>('/auth/refresh', {
          method: 'POST',
          auth: false,
          timeoutMs: DEFAULT_TIMEOUT_MS,
        }, false, generation);
        if (!result.ok) return result;
        if (!isRecord(result.data) || typeof result.data.accessToken !== 'string' || !result.data.accessToken) {
          return {
            ok: false,
            error: { status: 200, code: 'invalid_response', message: 'El servidor devolvió una respuesta inválida.', retryable: false },
          };
        }
        return { ok: true, data: result.data.accessToken };
      } finally {
        refreshing.delete(generation);
      }
    })();
    refreshing.set(generation, shared);
  }
  return shared;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function defaultMessage(status: number): string {
  if (status === 0) return 'No se pudo conectar al servidor. Inténtalo de nuevo.';
  if (status === 401) return 'Tu sesión no es válida. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'No se encontró el recurso solicitado.';
  if (status === 408) return 'La solicitud tardó demasiado. Inténtalo de nuevo.';
  if (status === 429) return 'Hay demasiadas solicitudes. Inténtalo de nuevo en unos minutos.';
  if (status >= 500) return 'El servicio no está disponible. Inténtalo de nuevo.';
  return 'No se pudo completar la solicitud.';
}

function defaultCode(status: number): string {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'too_many_requests';
  if (status >= 500) return 'server_error';
  if (status === 0) return 'network_error';
  return 'request_failed';
}

function isSafeMessage(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const message = value.trim();
  return (
    message.length > 0 &&
    message.length <= 240 &&
    !/[<>`{}\[\]]/.test(message) &&
    !/\b(select|insert|update|delete|drop|from|where|join|sql|prisma|postgres|mysql|stack|trace)\b/i.test(message)
  );
}

function safeMessage(value: unknown, fallback: string): string {
  if (isSafeMessage(value)) return value.trim();
  if (Array.isArray(value)) {
    const messages = value.filter(isSafeMessage).map((message) => message.trim());
    if (messages.length > 0) return messages.join(', ');
  }
  return fallback;
}

function safeCode(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,64}$/.test(value) ? value : fallback;
}

function validFieldErrors(value: unknown): Record<string, string[]> | undefined {
  if (!isRecord(value)) return undefined;
  const fieldErrors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(value)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(field) || !Array.isArray(messages)) continue;
    const safeMessages = messages.filter(isSafeMessage).map((message) => message.trim());
    if (safeMessages.length > 0) fieldErrors[field] = safeMessages;
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function httpFailure(response: Response, payload: unknown): ApiFailure {
  const record = isRecord(payload) ? payload : undefined;
  return {
    status: response.status,
    code: safeCode(record?.code, defaultCode(response.status)),
    message: safeMessage(record?.message, defaultMessage(response.status)),
    retryable: response.status === 429 || response.status >= 500,
    fieldErrors: validFieldErrors(record?.fieldErrors),
  };
}

function abortedFailure(timedOut: boolean): ApiFailure {
  return timedOut
    ? { status: 0, code: 'timeout', message: 'La solicitud tardó demasiado. Inténtalo de nuevo.', retryable: true }
    : { status: 0, code: 'aborted', message: 'Solicitud cancelada.', retryable: false };
}

function networkFailure(): ApiFailure {
  return { status: 0, code: 'network_error', message: defaultMessage(0), retryable: true };
}

function encodeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof body === 'string' || body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob) return body;
  return JSON.stringify(body);
}

async function fetchWithControls(url: string, init: RequestInit, options: RequestOptions): Promise<ApiResult<Response>> {
  const controller = new AbortController();
  let timedOut = false;
  let externallyAborted = false;
  const onExternalAbort = () => {
    externallyAborted = true;
    controller.abort();
  };
  const externalSignal = options.signal;
  if (externalSignal?.aborted) onExternalAbort();
  else externalSignal?.addEventListener('abort', onExternalAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return { ok: true, data: response };
  } catch (error) {
    const isAbort = error instanceof DOMException ? error.name === 'AbortError' : (error as { name?: string })?.name === 'AbortError';
    if (timedOut) return { ok: false, error: abortedFailure(true) };
    if (externallyAborted || isAbort) return { ok: false, error: abortedFailure(false) };
    return { ok: false, error: networkFailure() };
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

async function parseResponse(response: Response): Promise<ApiResult<unknown>> {
  if (response.status === 204 || response.status === 205) return { ok: true, data: undefined };

  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  if (!text.trim()) return response.ok ? { ok: true, data: undefined } : { ok: false, error: httpFailure(response, undefined) };

  let body: unknown;
  if (contentType.includes('application/json')) {
    try {
      body = JSON.parse(text);
    } catch {
      if (response.ok) {
        return {
          ok: false,
          error: { status: response.status, code: 'invalid_response', message: 'El servidor devolvió una respuesta inválida.', retryable: false },
        };
      }
      return { ok: false, error: httpFailure(response, undefined) };
    }
  } else {
    body = text;
  }

  return response.ok ? { ok: true, data: body } : { ok: false, error: httpFailure(response, body) };
}

async function waitForRefresh(
  shared: Promise<ApiResult<string>>,
  options: RequestOptions,
): Promise<ApiResult<string>> {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort();
  if (options.signal?.aborted) onAbort();
  else options.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await Promise.race([
      shared,
      new Promise<ApiResult<string>>((resolve) => controller.signal.addEventListener('abort', () => resolve({
        ok: false,
        error: timedOut ? abortedFailure(true) : abortedFailure(false),
      }), { once: true })),
    ]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

async function requestInternal<T>(path: string, options: RequestOptions, allowRefresh: boolean, generation = currentSessionGeneration()): Promise<ApiResult<T>> {
  const { auth = true, body, headers: suppliedHeaders, method = 'GET' } = options;
  const headers = new Headers(suppliedHeaders);
  if (body instanceof URLSearchParams && !headers.has('Content-Type')) headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
  else if (body !== undefined && !(body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (auth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let encodedBody: BodyInit | undefined;
  try {
    encodedBody = encodeBody(body);
  } catch {
    return { ok: false, error: { status: 0, code: 'invalid_request', message: 'No se pudo preparar la solicitud.', retryable: false } };
  }
  const execute = () => fetchWithControls(`${BASE}${path}`, { method, headers, credentials: 'include', body: encodedBody }, options);

  let fetched = await execute();
  if (!fetched.ok) return fetched;
  if (fetched.data.status === 401 && auth && allowRefresh) {
    const refreshed = await waitForRefresh(tryRefresh(generation), options);
    if (!refreshed.ok) return refreshed as ApiResult<T>;
    if (!setAccessToken(refreshed.data, generation)) return { ok: false, error: abortedFailure(false) };
    headers.set('Authorization', `Bearer ${refreshed.data}`);
    fetched = await execute();
    if (!fetched.ok) return fetched;
  }
  return parseResponse(fetched.data) as Promise<ApiResult<T>>;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  return requestInternal<T>(path, options, true);
}

export async function requestOrThrow<T>(path: string, options?: RequestOptions): Promise<T> {
  const result = await request<T>(path, options);
  if (!result.ok) throw new ApiError(result.error);
  return result.data;
}

/** Compatibilidad para consumidores existentes mientras migran a ApiResult. */
export async function api<T = unknown>(
  path: string,
  options: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'> & {
    method?: RequestOptions['method'];
    body?: BodyInit | null;
    headers?: HeadersInit;
    signal?: AbortSignal;
    json?: unknown;
    auth?: boolean;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const { json, body, headers, ...rest } = options;
  const normalizedHeaders = Object.fromEntries(new Headers(headers).entries());
  return requestOrThrow<T>(path, { ...rest, body: json === undefined ? body : json, headers: normalizedHeaders });
}
