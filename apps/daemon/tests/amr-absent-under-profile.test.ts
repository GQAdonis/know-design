// knowdesign profile: the `amr` agent is not shipped, so every AMR/billing
// surface must degrade to "unavailable" (non-2xx, which the web fetchers map to
// null) instead of reaching the AMR cloud. Profile OFF keeps the stock registry.

import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadRegistry(profile: string | undefined) {
  vi.resetModules();
  if (profile === undefined) vi.unstubAllEnvs();
  else vi.stubEnv('OD_BUILD_PROFILE', profile);
  return import('../src/runtimes/registry.js');
}

async function serveVelaRoutes(profile: string | undefined) {
  const { registerVelaRoutes } = await import('../src/routes/vela.js');
  const app = express();
  app.use(express.json());
  registerVelaRoutes(app, {
    paths: { RUNTIME_DATA_DIR: '/nonexistent-od-data' },
    appConfig: { readAppConfig: async () => ({}) as never },
    http: {},
    env: profile ? { OD_BUILD_PROFILE: profile } : {},
  });
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

describe('amr agent registry seam', () => {
  it('ships amr when the profile is off', async () => {
    const registry = await loadRegistry(undefined);
    expect(registry.SHIPPED_AGENT_DEFS.some((d) => d.id === 'amr')).toBe(true);
    expect(registry.getAgentDef('amr')).not.toBeNull();
  });

  it('omits amr under the knowdesign profile and leaves other agents', async () => {
    const registry = await loadRegistry('knowdesign');
    expect(registry.SHIPPED_AGENT_DEFS.some((d) => d.id === 'amr')).toBe(false);
    expect(registry.getAgentDef('amr')).toBeNull();
    expect(registry.getAgentDef('claude')).not.toBeNull();
  });
});

describe('billing fetchers degrade when amr is absent (knowdesign profile)', () => {
  it('answers status, wallet, models and login with 503 and never signs in', async () => {
    await loadRegistry('knowdesign');
    const srv = await serveVelaRoutes('knowdesign');
    try {
      for (const path of [
        '/api/integrations/vela/status',
        '/api/integrations/vela/wallet',
        '/api/amr/models',
      ]) {
        const res = await fetch(`${srv.base}${path}`);
        expect(res.status, path).toBe(503);
      }
      const login = await fetch(`${srv.base}/api/integrations/vela/login`, { method: 'POST' });
      expect(login.status).toBe(503);
      const logout = await fetch(`${srv.base}/api/integrations/vela/logout`, { method: 'POST' });
      expect(logout.status).toBe(200);
    } finally {
      await srv.close();
    }
  });
});
