import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';

/**
 * Hosts a knowdesign-profile runtime must never contact: the upstream cloud,
 * product analytics, trace relay, and the GitHub/Discord metadata hosts.
 */
export const FORBIDDEN_UPSTREAM_HOST_PATTERNS: readonly RegExp[] = [
  /(^|\.)open-design\.ai$/i,
  /^us\.i\.posthog\.com$/i,
  /(^|\.)posthog\.com$/i,
  /^us\.cloud\.langfuse\.com$/i,
  /(^|\.)langfuse\.com$/i,
  /^api\.github\.com$/i,
  /(^|\.)github\.com$/i,
  /(^|\.)githubusercontent\.com$/i,
  /^discord\.com$/i,
  /(^|\.)discord\.com$/i,
];

export type ProxyRecorder = {
  /** Every destination host the proxy was asked to reach, in arrival order. */
  hosts: () => string[];
  port: number;
  url: string;
  close: () => Promise<void>;
};

export function hostnameOf(target: string | undefined): string {
  if (!target) return '';
  try {
    return new URL(target.includes('://') ? target : `http://${target}`).hostname;
  } catch {
    return target;
  }
}

/**
 * A local HTTP(S) proxy that records each destination and refuses to forward
 * it (HTTP 502). Point a process at it with HTTP(S)_PROXY plus Node's
 * NODE_USE_ENV_PROXY=1 and any proxy-aware outbound attempt becomes visible
 * here without ever leaving the machine.
 */
export async function startRecordingProxy(): Promise<ProxyRecorder> {
  const seen: string[] = [];
  const sockets = new Set<Duplex>();
  const server: Server = createServer((req: IncomingMessage, res) => {
    seen.push(hostnameOf(req.url?.startsWith('http') ? req.url : req.headers.host));
    res.statusCode = 502;
    res.end('recorded');
  });
  server.on('connect', (req, socket) => {
    seen.push(hostnameOf(req.url));
    sockets.add(socket);
    socket.on('error', () => {}); // a client reset is expected when the daemon tears down
    socket.on('close', () => sockets.delete(socket));
    socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const port = (server.address() as AddressInfo).port;
  return {
    close: () =>
      new Promise<void>((resolveClose) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolveClose());
      }),
    hosts: () => [...seen],
    port,
    url: `http://127.0.0.1:${port}`,
  };
}

export function forbiddenUpstreamHits(hosts: readonly string[]): string[] {
  return hosts.filter((host) => FORBIDDEN_UPSTREAM_HOST_PATTERNS.some((pattern) => pattern.test(host)));
}
