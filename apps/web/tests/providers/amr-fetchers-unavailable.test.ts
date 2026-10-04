// The AMR/billing fetchers must resolve to null (not throw) when the daemon
// reports AMR as unavailable, as it does under the knowdesign profile.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAmrModels,
  fetchAmrWalletSnapshot,
  fetchVelaLoginStatus,
} from '../../src/providers/daemon';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AMR fetchers when the daemon answers 503', () => {
  it('returns null for status, wallet and models', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'amr_not_available' }), { status: 503 })),
    );
    expect(await fetchVelaLoginStatus()).toBeNull();
    expect(await fetchAmrWalletSnapshot()).toBeNull();
    expect(await fetchAmrModels()).toBeNull();
  });
});
