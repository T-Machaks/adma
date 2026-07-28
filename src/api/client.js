import { EVENT_CONFIG } from '@/lib/eventConfig';

export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const p = await res.json().catch(() => ({}));
    // 401 here means the session cookie is missing/expired/revoked (login/signup/otp
    // endpoints use raw fetch(), not apiFetch, so this never fires for "wrong password"
    // type errors) — the stored user object is stale, so clear it either way. But only
    // force-navigate to /login when the 401 came from something the user actually did
    // (a save/submit) — a background GET (react-query refetch-on-focus, polling) hitting
    // a session that expired mid-session must not yank them out of an open dialog with
    // unsaved input; they'll find out they're signed out the next time they act.
    if (res.status === 401) {
      localStorage.removeItem(EVENT_CONFIG.storageUserKey);
      const method = (options.method || 'GET').toUpperCase();
      if (method !== 'GET' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    throw new Error(p.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const client = { appId: EVENT_CONFIG.appId, isAuthenticated: () => true };
