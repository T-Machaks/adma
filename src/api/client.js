import { EVENT_CONFIG } from '@/lib/eventConfig';

export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const p = await res.json().catch(() => ({}));
    throw new Error(p.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const client = { appId: EVENT_CONFIG.appId, isAuthenticated: () => true };
