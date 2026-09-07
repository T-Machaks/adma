import { describe, it, expect, vi, beforeEach } from 'vitest';

// getPoolBalance() caches successful reads for 30s in module-level state, so each test
// needs a fresh module instance — otherwise a later test's mock response would never
// actually get hit, since the cache from an earlier test would still be "fresh".
describe('getPoolBalance', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('parses pool.balance from a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ pool: { balance: 4200 } }),
    }));
    const { getPoolBalance } = await import('./omniflexReseller.js');
    await expect(getPoolBalance()).resolves.toBe(4200);
  });

  it('returns null on a 500 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
    const { getPoolBalance } = await import('./omniflexReseller.js');
    await expect(getPoolBalance()).resolves.toBeNull();
  });

  it('returns null when fetch itself throws (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const { getPoolBalance } = await import('./omniflexReseller.js');
    await expect(getPoolBalance()).resolves.toBeNull();
  });

  it('returns null when the response shape is unexpected (no pool.balance)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ something: 'else' }),
    }));
    const { getPoolBalance } = await import('./omniflexReseller.js');
    await expect(getPoolBalance()).resolves.toBeNull();
  });
});
