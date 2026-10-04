// @vitest-environment node

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';

import { describe, expect, test } from 'vitest';

import { requestJson } from '@/vitest/http';
import { createSmokeSuite } from '@/vitest/suite';

// Under OD_BUILD_PROFILE=knowdesign the daemon must not offer AMR sign-in,
// wallet or models, and must not reach *.open-design.ai while doing nothing.
//
// Network-denied witness: HTTP(S)_PROXY points at a local recorder, so any
// proxy-aware outbound attempt shows up as a CONNECT/absolute-URL request. The
// daemon's own `fetch` is not proxy-aware by default, so the primary assertions
// are the inert API surface; the recorder is a best-effort second witness.

type Recorder = { hosts: string[]; close: () => Promise<void>; url: string };

async function startProxyRecorder(): Promise<Recorder> {
  const hosts: string[] = [];
  const sockets = new Set<Duplex>();
  const server: Server = createServer((req, res) => {
    hosts.push(req.headers.host ?? req.url ?? '');
    res.statusCode = 403;
    res.end();
  });
  server.on('connect', (req, socket) => {
    hosts.push(req.url ?? '');
    sockets.add(socket);
    socket.on('error', () => {}); // a client reset is expected when the daemon tears down
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    hosts,
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}

describe('knowdesign profile: no AMR cloud surface', () => {
  test('AMR login/wallet/models are inert and nothing reaches open-design.ai', { timeout: 180_000 }, async () => {
    const suite = await createSmokeSuite('amr-knowdesign-no-cloud');
    const recorder = await startProxyRecorder();
    try {
      await suite.with.env(
        {
          HTTP_PROXY: recorder.url,
          HTTPS_PROXY: recorder.url,
          http_proxy: recorder.url,
          https_proxy: recorder.url,
          NO_PROXY: '127.0.0.1,localhost',
          no_proxy: '127.0.0.1,localhost',
        },
        async () => {
          await suite.with.toolsDev(
            async ({ webUrl }) => {
              const agents = await requestJson<{ agents: Array<{ id: string }> }>(webUrl, '/api/agents');
              expect(agents.agents.some((agent) => agent.id === 'amr')).toBe(false);

              for (const path of [
                '/api/integrations/vela/status',
                '/api/integrations/vela/wallet',
                '/api/amr/models',
              ]) {
                const response = await fetch(`${webUrl}${path}`);
                expect(response.status, path).toBe(503);
              }

              const health = await requestJson<{ buildProfile?: string }>(webUrl, '/api/health');
              expect(health.buildProfile).toBe('knowdesign');

              expect(recorder.hosts.filter((host) => host.includes('open-design.ai'))).toEqual([]);
            },
            { env: { OD_BUILD_PROFILE: 'knowdesign' } },
          );
        },
      );
    } finally {
      await recorder.close();
    }
  });
});
