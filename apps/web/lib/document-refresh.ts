export type DocumentRefreshOutcome =
  | { kind: 'response'; response: Response }
  | { kind: 'network' | 'timeout' | 'cancelled' };

type DocumentRefresh = {
  base: string;
  pending: Promise<DocumentRefreshOutcome>;
  profile?: { token: string; pending: Promise<DocumentRefreshOutcome> };
  cancel(): void;
};

declare global {
  interface Window { __evryDocumentRefresh?: DocumentRefresh }
}

// Kept self-contained: the server emits this function into initial HTML, without
// importing React, a client bundle, tokens or per-user data into that document.
function startDocumentRefresh(base: string) {
  const roots = ['/dashboard', '/workout', '/progress', '/cycle', '/profile'];
  if (!roots.some(root => window.location.pathname === root || window.location.pathname.startsWith(`${root}/`))
    || window.__evryDocumentRefresh) return;
  let cancelled = false;
  const controllers = new Set<AbortController>();
  function perform(path: string, init: RequestInit): Promise<DocumentRefreshOutcome> {
    const controller = new AbortController();
    controllers.add(controller);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15_000);
    return fetch(`${base}${path}`, {
      ...init, credentials: 'include', cache: 'no-store', signal: controller.signal,
    }).then(response => response.text().then(body => ({
      kind: 'response' as const,
      response: new Response(response.status === 204 || response.status === 205 ? null : body, {
        status: response.status, statusText: response.statusText, headers: response.headers,
      }),
    }))).catch(() => ({ kind: timedOut ? 'timeout' as const : cancelled ? 'cancelled' as const : 'network' as const }))
      .finally(() => { clearTimeout(timer); controllers.delete(controller); });
  }
  const pending = perform('/auth/refresh', { method: 'POST' }).then(async outcome => {
    if (outcome.kind === 'response' && outcome.response.ok
      && outcome.response.headers.get('content-type')?.includes('application/json')) {
      try {
        const data: unknown = await outcome.response.clone().json();
        if (!cancelled && typeof data === 'object' && data !== null && !Array.isArray(data)
          && 'accessToken' in data && typeof data.accessToken === 'string' && data.accessToken) {
          entry.profile = { token: data.accessToken,
            pending: perform('/users/me', { method: 'GET', headers: { Authorization: `Bearer ${data.accessToken}` } }) };
        }
      } catch { /* The normal client preserves invalid refresh-response semantics. */ }
    }
    // The profile has its own deadline; never delay access-token restoration.
    return outcome;
  });
  // No storage or logging; the settled response remains only in document memory.
  const entry: DocumentRefresh = {
    base, pending,
    cancel() { cancelled = true; for (const controller of controllers) controller.abort(); },
  };
  window.__evryDocumentRefresh = entry;
}

export function buildDocumentRefreshScript(base: string): string {
  const literal = JSON.stringify(base).replaceAll('<', '\\u003c');
  return `(${startDocumentRefresh.toString()})(${literal});`;
}

let adopted: DocumentRefresh | null = null;
let profileEntry: DocumentRefresh | null = null;
let activeProfile: DocumentRefresh | null = null;

export function takeDocumentRefresh(base: string, generation: number): Promise<DocumentRefreshOutcome> | null {
  if (typeof window === 'undefined') return null;
  const entry = window.__evryDocumentRefresh;
  if (!entry) return null;
  delete window.__evryDocumentRefresh;
  if (entry.base !== base || generation !== 0) {
    entry.cancel();
    return null;
  }
  adopted = entry;
  return entry.pending.then(outcome => {
    if (adopted === entry && entry.profile) profileEntry = entry;
    return outcome;
  }).finally(() => { if (adopted === entry) adopted = null; });
}

export function takeDocumentProfile(base: string, token: string | null, generation: number): Promise<DocumentRefreshOutcome> | null {
  const entry = profileEntry;
  profileEntry = null;
  if (!entry) return null;
  if (entry.base !== base || generation !== 0 || entry.profile?.token !== token) {
    entry.cancel();
    return null;
  }
  activeProfile = entry;
  return entry.profile.pending.finally(() => { if (activeProfile === entry) activeProfile = null; });
}

export function cancelDocumentRefresh(): void {
  if (typeof window === 'undefined') return;
  const entry = window.__evryDocumentRefresh;
  delete window.__evryDocumentRefresh;
  for (const flight of new Set([entry, adopted, profileEntry, activeProfile])) flight?.cancel();
  adopted = profileEntry = activeProfile = null;
}
