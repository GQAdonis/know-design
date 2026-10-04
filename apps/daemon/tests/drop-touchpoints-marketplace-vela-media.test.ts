// Profile-on assertions for `drop-touchpoints-marketplace-vela-media`.
// With OD_BUILD_PROFILE=knowdesign the daemon must not serve /api/touchpoints*,
// must not fetch marketplace registries, must not list `vela/*` media models,
// and the CLI must not advertise or dispatch `od plugin login|publish` and
// `od marketplace login`. Profile off keeps the stock behaviour (control cases).

import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfigPrefs } from '../src/app-config.js';
import { registerVelaRoutes } from '../src/routes/vela.js';
import { createMarketplaceSeedHelpers } from '../src/plugins/marketplace-seed.js';

const exec = promisify(execFile);
const daemonRoot = fileURLToPath(new URL('..', import.meta.url));
const cliEntry = fileURLToPath(new URL('../src/cli.ts', import.meta.url));

describe('knowdesign profile: touchpoint routes', () => {
  let dataDir: string;
  let server: Server | undefined;

  beforeEach(() => {
    dataDir = mkdtempSync(path.join(tmpdir(), 'od-drop-touchpoints-'));
  });
  afterEach(async () => {
    if (server) await new Promise((resolve) => server!.close(resolve));
    server = undefined;
    rmSync(dataDir, { recursive: true, force: true });
  });

  async function boot(env: NodeJS.ProcessEnv): Promise<string> {
    const app = express();
    app.use(express.json());
    registerVelaRoutes(app, {
      paths: { RUNTIME_DATA_DIR: dataDir },
      appConfig: { readAppConfig: async () => ({ agentCliEnv: {} }) as AppConfigPrefs },
      http: {},
      env,
    });
    server = createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
  }

  it('does not register production or test touchpoint runtimes', async () => {
    const base = await boot({ OD_BUILD_PROFILE: 'knowdesign' });
    for (const url of [
      '/api/touchpoints/production-runtime?placementKey=opend.home.campaign-modal&locale=en-US',
      '/api/touchpoints/production-runtime/events',
      '/api/touchpoints/test-runtime/deployments',
    ]) {
      expect((await fetch(`${base}${url}`, { method: 'POST' })).status, url).toBe(404);
      expect((await fetch(`${base}${url}`)).status, url).toBe(404);
    }
  });

  it('keeps the touchpoint runtimes registered with the profile off', async () => {
    const base = await boot({});
    const response = await fetch(
      `${base}/api/touchpoints/production-runtime?placementKey=opend.home.campaign-modal&locale=en-US`,
    );
    // Registered: whatever the handler decides (401 without a control key, or an
    // inert 200), it is not the 404 an unregistered route returns.
    expect(response.status).not.toBe(404);
  });
});

describe('knowdesign profile: marketplace registry fetches', () => {
  const helpers = (fetchImpl: typeof fetch) =>
    createMarketplaceSeedHelpers({
      bundledPluginsDir: '/nonexistent/bundled',
      projectRoot: '/nonexistent/root',
      pluginRegistryDir: '/nonexistent/registry',
      marketplaceManifestUrlForRegistry: (id) => `https://example.invalid/${id}.json`,
      marketplaceRegistryIdFromUrl: () => null,
      fetchImpl,
    });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses outbound registry fetches under the profile', async () => {
    vi.stubEnv('OD_BUILD_PROFILE', 'knowdesign');
    const fetchImpl = vi.fn(async () => new Response('{}'));
    const response = await helpers(fetchImpl as unknown as typeof fetch)
      .createMarketplaceFetcher(null, [])('https://registry.example.com/open-design-marketplace.json');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('knowdesign profile: Vela media models', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('lists no vela provider or vela/* model, and keeps non-Vela models', async () => {
    vi.stubEnv('OD_BUILD_PROFILE', 'knowdesign');
    vi.resetModules();
    const models = await import('../src/media/models.js');
    expect(models.MEDIA_PROVIDERS.some((p) => p.id === 'vela')).toBe(false);
    const all = [
      ...models.IMAGE_MODELS,
      ...models.VIDEO_MODELS,
      ...models.AUDIO_MODELS_BY_KIND.music,
      ...models.AUDIO_MODELS_BY_KIND.speech,
      ...models.AUDIO_MODELS_BY_KIND.sfx,
    ];
    expect(all.some((m) => m.id.startsWith('vela/') || m.provider === 'vela')).toBe(false);
    expect(models.IMAGE_MODELS.some((m) => m.id === 'gpt-image-2' && m.provider === 'openai')).toBe(true);
    expect(models.findMediaModel('vela/gpt-image-2')).toBeNull();
  });

  it('keeps the vela models with the profile off', async () => {
    vi.resetModules();
    const models = await import('../src/media/models.js');
    expect(models.MEDIA_PROVIDERS.some((p) => p.id === 'vela')).toBe(true);
    expect(models.IMAGE_MODELS.some((m) => m.id === 'vela/gpt-image-2')).toBe(true);
  });
});

describe('knowdesign profile: CLI surface', () => {
  async function run(args: string[], profile: boolean) {
    try {
      const result = await exec(process.execPath, ['--import', 'tsx', cliEntry, ...args], {
        cwd: daemonRoot,
        timeout: 20_000,
        env: {
          ...process.env,
          NODE_OPTIONS: '',
          OD_DAEMON_URL: 'http://offline.invalid',
          OD_BUILD_PROFILE: profile ? 'knowdesign' : '',
        },
      });
      return { code: 0, stdout: result.stdout, stderr: result.stderr };
    } catch (error: any) {
      return { code: error.code as number, stdout: String(error.stdout ?? ''), stderr: String(error.stderr ?? '') };
    }
  }

  it('hides plugin login/publish from `od plugin --help` under the profile', async () => {
    const on = await run(['plugin', '--help'], true);
    expect(on.stdout).not.toContain('od plugin login');
    expect(on.stdout).not.toContain('od plugin publish ');
    expect(on.stdout).not.toContain('od plugin publish-repo');
    const off = await run(['plugin', '--help'], false);
    expect(off.stdout).toContain('od plugin login');
    expect(off.stdout).toContain('od plugin publish ');
  });

  it('rejects plugin login/publish as unknown subcommands under the profile', async () => {
    for (const sub of ['login', 'publish', 'publish-repo']) {
      const result = await run(['plugin', sub], true);
      expect(result.code).toBe(2);
      expect(result.stderr).toContain(`unknown subcommand: od plugin ${sub}`);
    }
  });

  it('hides `od marketplace login` under the profile', async () => {
    const on = await run(['marketplace', '--help'], true);
    expect(on.stdout).not.toContain('od marketplace login');
    expect(on.stdout).toContain('od marketplace add');
    const off = await run(['marketplace', '--help'], false);
    expect(off.stdout).toContain('od marketplace login');
    const rejected = await run(['marketplace', 'login', 'x'], true);
    expect(rejected.code).toBe(2);
    expect(rejected.stderr).toContain('unknown subcommand: od marketplace login');
  });
});
