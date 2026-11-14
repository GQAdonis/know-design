import http from 'node:http';
import { mkdtemp, readFile, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  IPFS_KUBO_PROVIDER_ID,
  SAVED_IPFS_PASSWORD_MASK,
  ipfsConfigPath,
  ipnsKeyNameForProject,
} from '../src/deploy/ipfs.js';
import { ensureProject } from '../src/projects.js';
import { startServer } from '../src/server.js';

// Scenarios IPFS-1 and IPFS-2 (phase htmx-prototypes-and-ipfs-deploy).

const USER = 'kd-test-user';
const PASSWORD = 'SENTINEL-ipfs-password-7f3a';
const ROOT_CID = 'bafybeigdyrztktestrootcidforsite000000000000000000000000000';
const IPNS_ID = 'k51qzi5uqu5dtestipnskeyid';

interface RecordedPart { filename: string; type: string; body: string }
interface RecordedRequest { method: string; path: string; query: URLSearchParams; authorization: string; parts: RecordedPart[] }

/** Minimal Kubo RPC + path gateway double that records what it receives. */
function startFakeKubo() {
  const requests: RecordedRequest[] = [];
  const keys = new Map<string, string>();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://fake');
    if (url.pathname.startsWith('/ipfs/') || url.pathname.startsWith('/ipns/')) {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(req.method === 'HEAD' ? undefined : '<!doctype html>');
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks);
    const parts: RecordedPart[] = [];
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.startsWith('multipart/form-data')) {
      const form = await new Response(raw, { headers: { 'content-type': contentType } }).formData();
      for (const value of form.getAll('file')) {
        const file = value as File;
        parts.push({ filename: file.name, type: file.type, body: await file.text() });
      }
    }
    const authorization = String(req.headers.authorization ?? '');
    requests.push({ method: req.method ?? '', path: url.pathname, query: url.searchParams, authorization, parts });
    const expected = `Basic ${Buffer.from(`${USER}:${PASSWORD}`).toString('base64')}`;
    if (authorization !== expected) {
      res.writeHead(401, { 'content-type': 'text/plain' });
      res.end('unauthorized');
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    switch (url.pathname) {
      case '/api/v0/add':
        res.end(parts
          .map((part) => JSON.stringify({ Name: part.filename, Hash: part.filename === 'site' ? ROOT_CID : `bafkfile${part.filename.length}`, Size: '1' }))
          .join('\n') + '\n');
        return;
      case '/api/v0/key/list':
        res.end(JSON.stringify({ Keys: [...keys].map(([Name, Id]) => ({ Name, Id })) }));
        return;
      case '/api/v0/key/gen': {
        const name = url.searchParams.get('arg') ?? '';
        keys.set(name, IPNS_ID);
        res.end(JSON.stringify({ Name: name, Id: IPNS_ID }));
        return;
      }
      case '/api/v0/name/publish':
        res.end(JSON.stringify({ Name: IPNS_ID, Value: url.searchParams.get('arg') }));
        return;
      default:
        res.end('{}');
    }
  });
  return new Promise<{ url: string; requests: RecordedRequest[]; close: () => Promise<void> }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        requests,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

describe('ipfs-kubo deploy provider', () => {
  let daemon: http.Server;
  let baseUrl: string;
  let kubo: Awaited<ReturnType<typeof startFakeKubo>>;
  let stateRoot: string;
  let priorStateRoot: string | undefined;
  let logged: string[];

  beforeAll(async () => {
    const started = await startServer({ port: 0, returnServer: true }) as { url: string; server: http.Server };
    baseUrl = started.url;
    daemon = started.server;
  });

  afterAll(() => new Promise<void>((resolve) => daemon.close(() => resolve())));

  beforeEach(async () => {
    kubo = await startFakeKubo();
    stateRoot = await mkdtemp(path.join(os.tmpdir(), 'od-ipfs-deploy-'));
    priorStateRoot = process.env.OD_USER_STATE_DIR;
    process.env.OD_USER_STATE_DIR = stateRoot;
    logged = [];
    for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        logged.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
      });
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await kubo.close();
    if (priorStateRoot === undefined) delete process.env.OD_USER_STATE_DIR;
    else process.env.OD_USER_STATE_DIR = priorStateRoot;
    await rm(stateRoot, { recursive: true, force: true });
  });

  async function saveConfig(password = PASSWORD) {
    const resp = await fetch(`${baseUrl}/api/deploy/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: IPFS_KUBO_PROVIDER_ID,
        rpcUrl: `${kubo.url}/api/v0`,
        username: USER,
        password,
        gatewayUrl: kubo.url,
      }),
    });
    return { status: resp.status, text: await resp.text() };
  }

  async function createProject(extraFiles: Record<string, string> = {}) {
    const dataDir = process.env.OD_DATA_DIR;
    if (!dataDir) throw new Error('OD_DATA_DIR is required for daemon route tests');
    const projectId = `ipfs-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const dir = await ensureProject(path.join(dataDir, 'projects'), projectId);
    await mkdir(path.join(dir, 'assets'), { recursive: true });
    await mkdir(path.join(dir, 'vendor'), { recursive: true });
    await writeFile(
      path.join(dir, 'index.html'),
      '<!doctype html><link rel="stylesheet" href="/assets/app.css"><script src="vendor/htmx.min.js"></script><h1>Proto</h1>',
    );
    await writeFile(path.join(dir, 'assets', 'app.css'), 'h1{color:red}');
    await writeFile(path.join(dir, 'vendor', 'htmx.min.js'), '/* htmx */');
    for (const [name, body] of Object.entries(extraFiles)) await writeFile(path.join(dir, name), body);
    const created = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, name: 'IPFS test', skillId: null, designSystemId: null }),
    });
    expect(created.status).toBe(200);
    return projectId;
  }

  async function deploy(projectId: string, body: Record<string, unknown> = {}) {
    const resp = await fetch(`${baseUrl}/api/projects/${projectId}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'index.html', providerId: IPFS_KUBO_PROVIDER_ID, ...body }),
    });
    return { status: resp.status, text: await resp.text() };
  }

  it('saves config with the password masked and stored only in the 0600 file', async () => {
    const saved = await saveConfig();
    expect(saved.status).toBe(200);
    expect(JSON.parse(saved.text)).toMatchObject({
      providerId: IPFS_KUBO_PROVIDER_ID,
      configured: true,
      username: USER,
      passwordMask: SAVED_IPFS_PASSWORD_MASK,
    });
    const read = await fetch(`${baseUrl}/api/deploy/config?providerId=${IPFS_KUBO_PROVIDER_ID}`);
    const readText = await read.text();
    expect(readText).not.toContain(PASSWORD);
    expect(JSON.parse(readText)).toMatchObject({ configured: true, passwordMask: SAVED_IPFS_PASSWORD_MASK });

    // Sending the mask back keeps the stored password.
    const remasked = await fetch(`${baseUrl}/api/deploy/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: IPFS_KUBO_PROVIDER_ID, password: SAVED_IPFS_PASSWORD_MASK, ipnsDefault: true }),
    });
    expect(await remasked.text()).not.toContain(PASSWORD);
    const file = JSON.parse(await readFile(ipfsConfigPath(), 'utf8'));
    expect(file).toMatchObject({ username: USER, password: PASSWORD, ipnsDefault: true });
    expect((await stat(ipfsConfigPath())).mode & 0o777).toBe(0o600);
  });

  it('rejects plain-http RPC endpoints that are not loopback', async () => {
    const resp = await fetch(`${baseUrl}/api/deploy/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: IPFS_KUBO_PROVIDER_ID, rpcUrl: 'http://rpc.example.com/api/v0' }),
    });
    expect(resp.status).toBe(400);
    expect(JSON.parse(await resp.text())).toMatchObject({ error: { code: 'IPFS_RPC_URL_INVALID' } });
  });

  it('pins the site as one directory and publishes a reusable IPNS key (IPFS-1)', async () => {
    await saveConfig();
    const projectId = await createProject();

    const first = await deploy(projectId, { ipns: true });
    expect(first.status).toBe(200);
    const body = JSON.parse(first.text);
    expect(body).toMatchObject({
      providerId: IPFS_KUBO_PROVIDER_ID,
      url: `${kubo.url}/ipfs/${ROOT_CID}/`,
      status: 'ready',
      ipfs: {
        cid: ROOT_CID,
        gatewayUrl: `${kubo.url}/ipfs/${ROOT_CID}/`,
        ipnsKey: ipnsKeyNameForProject(projectId),
        ipnsName: IPNS_ID,
        ipnsUrl: `${kubo.url}/ipns/${IPNS_ID}/`,
      },
    });
    expect(body.providerMetadata).toBeUndefined();

    const add = kubo.requests.find((r) => r.path === '/api/v0/add')!;
    expect(add.query.get('pin')).toBe('true');
    expect(add.query.get('cid-version')).toBe('1');
    expect(add.query.get('raw-leaves')).toBe('true');
    const names = add.parts.map((part) => part.filename);
    expect(names.slice(0, 3)).toEqual(['site', 'site/assets', 'site/vendor']);
    expect(names).toEqual(expect.arrayContaining(['site/index.html', 'site/assets/app.css', 'site/vendor/htmx.min.js']));
    expect(add.parts.filter((p) => p.type === 'application/x-directory').map((p) => p.filename))
      .toEqual(['site', 'site/assets', 'site/vendor']);
    // Root-absolute asset URLs are rewritten so the site works under /ipfs/<cid>/.
    const index = add.parts.find((p) => p.filename === 'site/index.html')!;
    expect(index.body).not.toContain('href="/assets/app.css"');
    expect(index.body).toContain('assets/app.css');

    const publish = kubo.requests.find((r) => r.path === '/api/v0/name/publish')!;
    expect(publish.query.get('arg')).toBe(`/ipfs/${ROOT_CID}`);
    expect(publish.query.get('key')).toBe(ipnsKeyNameForProject(projectId));

    const second = await deploy(projectId, { ipns: true });
    expect(second.status).toBe(200);
    expect(kubo.requests.filter((r) => r.path === '/api/v0/key/gen')).toHaveLength(1);
    expect(kubo.requests.filter((r) => r.path === '/api/v0/name/publish')).toHaveLength(2);
    expect(JSON.parse(second.text)).toMatchObject({ deploymentCount: 2 });
  });

  it('skips IPNS when not requested and the saved default is off', async () => {
    await saveConfig();
    const projectId = await createProject();
    const result = await deploy(projectId);
    expect(result.status).toBe(200);
    expect(JSON.parse(result.text).ipfs.ipnsName).toBeUndefined();
    expect(kubo.requests.some((r) => r.path.startsWith('/api/v0/key/'))).toBe(false);
  });

  it('reports rejected credentials with IPFS_AUTH_FAILED and records no deployment (IPFS-1 negative)', async () => {
    await saveConfig('wrong-password');
    const projectId = await createProject();
    const result = await deploy(projectId, { ipns: true });
    expect(result.status).toBe(400);
    expect(JSON.parse(result.text)).toMatchObject({ error: { code: 'IPFS_AUTH_FAILED' } });
    const listed = await fetch(`${baseUrl}/api/projects/${projectId}/deployments`);
    expect(JSON.parse(await listed.text()).deployments).toEqual([]);
  });

  it('keeps the password out of responses, logs, uploads and the deployments list (IPFS-2)', async () => {
    const surfaces: Record<string, string> = {};
    surfaces.configPut = (await saveConfig()).text;
    surfaces.configGet = await (await fetch(`${baseUrl}/api/deploy/config?providerId=${IPFS_KUBO_PROVIDER_ID}`)).text();
    const projectId = await createProject();
    surfaces.deploy = (await deploy(projectId, { ipns: true })).text;
    surfaces.deployments = await (await fetch(`${baseUrl}/api/projects/${projectId}/deployments`)).text();
    surfaces.failedDeployLog = '';
    await saveConfig('wrong-password');
    surfaces.failedDeploy = (await deploy(projectId)).text;
    surfaces.logs = logged.join('\n');
    surfaces.uploads = kubo.requests.flatMap((r) => r.parts.map((p) => p.body)).join('\n');
    for (const [name, text] of Object.entries(surfaces)) {
      expect(text.includes(PASSWORD), `${name} must not contain the password`).toBe(false);
    }
  });

  it('negative control: the upload scan does find the sentinel when a project file contains it', async () => {
    await saveConfig();
    const projectId = await createProject({ 'leak.txt': `oops ${PASSWORD}` });
    expect((await deploy(projectId)).status).toBe(200);
    const uploads = kubo.requests.flatMap((r) => r.parts.map((p) => p.body)).join('\n');
    expect(uploads.includes(PASSWORD)).toBe(true);
  });
});
