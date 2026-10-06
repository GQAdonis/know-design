import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  brandCliText,
  defaultDaemonPort,
  defaultMcpServerName,
  daemonCliBin,
} from '../src/brand.js';
import { VERCEL_PROVIDER_ID, deployConfigPath } from '../src/deploy.js';
import { parseDaemonCliStartupArgs } from '../src/daemon-startup.js';
import { DEFAULT_DAEMON_URL, defaultDaemonUrl, resolveDaemonUrl } from '../src/daemon-url.js';
import { localAgentProfilesFile } from '../src/runtimes/local-profiles.js';
import {
  PROJECT_MANIFEST_RELATIVE_PATH,
  manifestPath,
  projectManifestRelativePath,
  readProjectManifest,
  writeProjectManifest,
} from '../src/project-locations.js';
import {
  resolveSandboxRuntimeConfig,
  sandboxAgentProfilesConfigPath,
} from '../src/sandbox-mode.js';
import {
  applyJsonInstall,
  planAgentInstall,
  removeJsonInstall,
  type JsonInstallPlan,
} from '../src/mcp-agent-install.js';

const OD_ENV: NodeJS.ProcessEnv = {};
const KD_ENV: NodeJS.ProcessEnv = { OD_BUILD_PROFILE: 'knowdesign' };
const HERE = path.dirname(fileURLToPath(import.meta.url));

describe('item 1: per-user state directory', () => {
  it('keeps ~/.open-design for Open Design and uses ~/.knowdesign for KnowDesign', () => {
    const home = os.homedir();
    expect(deployConfigPath(VERCEL_PROVIDER_ID, OD_ENV)).toBe(path.join(home, '.open-design', 'vercel.json'));
    expect(deployConfigPath(VERCEL_PROVIDER_ID, KD_ENV)).toBe(path.join(home, '.knowdesign', 'vercel.json'));
    expect(deployConfigPath(VERCEL_PROVIDER_ID, KD_ENV)).not.toBe(deployConfigPath(VERCEL_PROVIDER_ID, OD_ENV));
  });

  it('lets OD_USER_STATE_DIR override either brand', () => {
    const override = path.join(os.tmpdir(), 'state-override');
    expect(deployConfigPath(VERCEL_PROVIDER_ID, { OD_USER_STATE_DIR: override })).toBe(path.join(override, 'vercel.json'));
    expect(deployConfigPath(VERCEL_PROVIDER_ID, { ...KD_ENV, OD_USER_STATE_DIR: override })).toBe(
      path.join(override, 'vercel.json'),
    );
  });

  it('derives the agent profiles file from the brand', () => {
    const home = os.homedir();
    expect(localAgentProfilesFile(OD_ENV)).toBe(path.join(home, '.open-design', 'agents.local.json'));
    expect(localAgentProfilesFile(KD_ENV)).toBe(path.join(home, '.knowdesign', 'agents.local.json'));
  });

  it('derives the sandbox agent profiles file from the brand', () => {
    const config = resolveSandboxRuntimeConfig(true, path.join(os.tmpdir(), 'sandbox-data'));
    expect(sandboxAgentProfilesConfigPath(config, OD_ENV)).toBe(
      path.join(config.roots.agentHomeDir, '.open-design', 'agents.local.json'),
    );
    expect(sandboxAgentProfilesConfigPath(config, KD_ENV)).toBe(
      path.join(config.roots.agentHomeDir, '.knowdesign', 'agents.local.json'),
    );
  });
});

describe('item 2: project manifest directory', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'od-brand-manifest-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('keeps .open-design/project.json for Open Design and uses .knowdesign for KnowDesign', () => {
    expect(PROJECT_MANIFEST_RELATIVE_PATH).toBe(path.join('.open-design', 'project.json'));
    expect(projectManifestRelativePath(OD_ENV)).toBe(path.join('.open-design', 'project.json'));
    expect(projectManifestRelativePath(KD_ENV)).toBe(path.join('.knowdesign', 'project.json'));
    expect(manifestPath(dir, KD_ENV)).toBe(path.join(dir, '.knowdesign', 'project.json'));
  });

  it('a KnowDesign daemon neither reads nor writes the original manifest directory', async () => {
    const manifest = {
      schemaVersion: 1 as const,
      id: 'p1',
      name: 'Original',
      createdAt: 1,
      updatedAt: 1,
    };
    await mkdir(path.join(dir, '.open-design'), { recursive: true });
    await writeFile(path.join(dir, '.open-design', 'project.json'), JSON.stringify(manifest), 'utf8');

    expect(await readProjectManifest(dir, KD_ENV)).toBeNull();
    expect((await readProjectManifest(dir, OD_ENV))?.id).toBe('p1');

    await writeProjectManifest(dir, { ...manifest, name: 'Mine' }, KD_ENV);
    const original = JSON.parse(await readFile(path.join(dir, '.open-design', 'project.json'), 'utf8'));
    expect(original.name).toBe('Original');
    const written = JSON.parse(await readFile(path.join(dir, '.knowdesign', 'project.json'), 'utf8'));
    expect(written.name).toBe('Mine');
  });
});

describe('item 3: default daemon port', () => {
  it('uses 7456 for Open Design and the descriptor port for KnowDesign', () => {
    expect(defaultDaemonPort(OD_ENV)).toBe(7456);
    expect(defaultDaemonPort(KD_ENV)).toBe(7556);
    expect(DEFAULT_DAEMON_URL).toBe('http://127.0.0.1:7456');
    expect(defaultDaemonUrl(OD_ENV)).toBe('http://127.0.0.1:7456');
    expect(defaultDaemonUrl(KD_ENV)).toBe('http://127.0.0.1:7556');
  });

  it('daemon CLI startup defaults to the brand port and still honours OD_PORT', () => {
    const portOf = (env: NodeJS.ProcessEnv) => {
      const parsed = parseDaemonCliStartupArgs([], env);
      return parsed.ok ? parsed.config.port : null;
    };
    expect(portOf(OD_ENV)).toBe(7456);
    expect(portOf(KD_ENV)).toBe(7556);
    expect(portOf({ ...KD_ENV, OD_PORT: '9001' })).toBe(9001);
  });

  it('the CLI client falls back to the brand default URL, never the original port', async () => {
    const options = { connectInherited: (() => null) as never, timeoutMs: 50 };
    const emptyPath = await mkdtemp(path.join(os.tmpdir(), 'od-brand-path-'));
    try {
      expect(await resolveDaemonUrl({ ...options, env: { PATH: emptyPath } })).toBe('http://127.0.0.1:7456');
      expect(await resolveDaemonUrl({ ...options, env: { ...KD_ENV, PATH: emptyPath } })).toBe(
        'http://127.0.0.1:7556',
      );
    } finally {
      await rm(emptyPath, { recursive: true, force: true });
    }
  });
});

describe('item 4: MCP server name', () => {
  it('is open-design for Open Design and the descriptor name for KnowDesign', () => {
    expect(defaultMcpServerName(OD_ENV)).toBe('open-design');
    expect(defaultMcpServerName(KD_ENV)).toBe('knowdesign');
  });

  it('a KnowDesign install, refresh and uninstall leave an open-design entry untouched', () => {
    const spec = { command: 'node', args: ['/x/cli.js', 'mcp'], env: {} };
    const original = { command: 'node', args: ['/orig/cli.js', 'mcp'] };
    const existing = `${JSON.stringify({ mcpServers: { 'open-design': original, other: { command: 'x' } } })}\n`;
    const plan = planAgentInstall('cursor', spec, {
      home: '/home/u',
      platform: 'darwin',
      serverName: defaultMcpServerName(KD_ENV),
    }) as JsonInstallPlan;

    const installed = JSON.parse(applyJsonInstall(existing, plan));
    expect(installed.mcpServers['open-design']).toEqual(original);
    expect(installed.mcpServers.knowdesign).toBeDefined();
    expect(installed.mcpServers.other).toEqual({ command: 'x' });

    const removed = JSON.parse(removeJsonInstall(`${JSON.stringify(installed)}\n`, plan) as string);
    expect(removed.mcpServers['open-design']).toEqual(original);
    expect(removed.mcpServers.knowdesign).toBeUndefined();

    // Nothing of ours present: the original is not a candidate for removal.
    expect(removeJsonInstall(existing, plan)).toBeNull();
  });
});

describe('item 5: CLI command name', () => {
  it('is od for Open Design and knowdesign for KnowDesign', () => {
    expect(daemonCliBin(OD_ENV)).toBe('od');
    expect(daemonCliBin(KD_ENV)).toBe('knowdesign');
  });

  it('leaves help text untouched for od', () => {
    const text = 'Usage: od project list\n  od run --help\nRun `od daemon start`.';
    expect(brandCliText(text, 'od')).toBe(text);
  });

  it('rewrites command positions to the brand bin without touching data', () => {
    const text = [
      'Usage: od project list',
      '  od run --help',
      '$ od mcp install cursor',
      'Run `od daemon start` first, then use od plugin list.',
      '{"od": {"kind": "x"}}',
      'a node od-ish word',
    ].join('\n');
    expect(brandCliText(text, 'knowdesign')).toBe(
      [
        'Usage: knowdesign project list',
        '  knowdesign run --help',
        '$ knowdesign mcp install cursor',
        'Run `knowdesign daemon start` first, then use knowdesign plugin list.',
        '{"od": {"kind": "x"}}',
        'a node od-ish word',
      ].join('\n'),
    );
  });

  it('exposes both bins from the root and the daemon package, pointing at the same entry', () => {
    const root = JSON.parse(readFileSync(path.join(HERE, '..', '..', '..', 'package.json'), 'utf8'));
    const daemon = JSON.parse(readFileSync(path.join(HERE, '..', 'package.json'), 'utf8'));
    for (const pkg of [root, daemon]) {
      expect(pkg.bin.od).toBeTruthy();
      expect(pkg.bin.knowdesign).toBe(pkg.bin.od);
    }
  });
});
