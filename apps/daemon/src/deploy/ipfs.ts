// IPFS (Kubo RPC) deploy provider for KnowDesign.
//
// Kept in its own module so the upstream-owned deploy files only gain
// one-line dispatch branches (see docs/knowdesign-upstream-sync.md).
//
// Security invariants (scenario IPFS-2 in the phase contract):
//   - the RPC password is stored only in the provider config file (mode 0600);
//   - it is never logged, never returned to a client, and never written into
//     an uploaded file;
//   - basic auth is only sent over https, or http to a loopback host.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { userStateDirName } from '../brand.js';
import { checkDeploymentUrl, DeployError } from '../deploy.js';

export const IPFS_KUBO_PROVIDER_ID = 'ipfs-kubo';
export const SAVED_IPFS_PASSWORD_MASK = 'saved-ipfs-password';
export const DEFAULT_IPFS_RPC_URL = 'https://rpc.prometheusags.ai/api/v0';
export const DEFAULT_IPFS_GATEWAY_URL = 'https://ipfs.prometheusags.ai';
export const IPFS_ENV_USER = 'IPFS_RPC_USER';
export const IPFS_ENV_PASSWORD = 'IPFS_RPC_PASSWORD';

/** Root directory name of every upload; the site CID is this entry's hash. */
const SITE_ROOT = 'site';
/** Separates the probe output from anything a login profile prints. */
const SHELL_PROBE_SENTINEL = '__KD_IPFS_ENV__';
const SHELL_PROBE_SCRIPT =
  `printf '${SHELL_PROBE_SENTINEL}%s\\0%s\\0' "\${${IPFS_ENV_USER}-}" "\${${IPFS_ENV_PASSWORD}-}"`;
const ERROR_BODY_EXCERPT_CHARS = 300;

export interface IpfsDeployConfig {
  rpcUrl: string;
  username: string;
  password: string;
  gatewayUrl: string;
  ipnsDefault: boolean;
}

export interface IpfsDeployConfigInput {
  rpcUrl?: unknown;
  username?: unknown;
  password?: unknown;
  gatewayUrl?: unknown;
  ipnsDefault?: unknown;
}

export interface IpfsDeployFile {
  file: string;
  data: Buffer | Uint8Array | string;
  contentType?: string | undefined;
}

export interface IpfsProviderMetadata {
  cid: string;
  gatewayUrl: string;
  ipnsKey?: string;
  ipnsName?: string;
  ipnsUrl?: string;
  ipnsError?: string;
}

export interface IpfsEnvCredentials {
  username: string;
  password: string;
}

type FetchImpl = typeof fetch;
type ShellReader = (env: NodeJS.ProcessEnv) => Promise<IpfsEnvCredentials | null>;

const EMPTY_CONFIG: IpfsDeployConfig = {
  rpcUrl: DEFAULT_IPFS_RPC_URL,
  username: '',
  password: '',
  gatewayUrl: DEFAULT_IPFS_GATEWAY_URL,
  ipnsDefault: false,
};

export function ipfsConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.OD_USER_STATE_DIR || path.join(os.homedir(), userStateDirName(env));
  return path.join(base, 'ipfs-kubo.json');
}

export async function readIpfsConfig(env: NodeJS.ProcessEnv = process.env): Promise<IpfsDeployConfig> {
  let raw: string;
  try {
    raw = await readFile(ipfsConfigPath(env), 'utf8');
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...EMPTY_CONFIG };
    }
    throw err;
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    rpcUrl: stringOr(parsed.rpcUrl, DEFAULT_IPFS_RPC_URL),
    username: stringOr(parsed.username, ''),
    password: stringOr(parsed.password, ''),
    gatewayUrl: stringOr(parsed.gatewayUrl, DEFAULT_IPFS_GATEWAY_URL),
    ipnsDefault: parsed.ipnsDefault === true,
  };
}

export async function writeIpfsConfig(
  input: IpfsDeployConfigInput = {},
  env: NodeJS.ProcessEnv = process.env,
) {
  const current = await readIpfsConfig(env);
  const passwordInput = typeof input.password === 'string' ? input.password : '';
  const next: IpfsDeployConfig = {
    rpcUrl: typeof input.rpcUrl === 'string' && input.rpcUrl.trim()
      ? normalizeEndpoint(input.rpcUrl, 'RPC URL', 'IPFS_RPC_URL_INVALID')
      : current.rpcUrl,
    username: typeof input.username === 'string' ? input.username.trim() : current.username,
    password: passwordInput && passwordInput !== SAVED_IPFS_PASSWORD_MASK ? passwordInput : current.password,
    gatewayUrl: typeof input.gatewayUrl === 'string' && input.gatewayUrl.trim()
      ? normalizeEndpoint(input.gatewayUrl, 'gateway URL', 'IPFS_GATEWAY_URL_INVALID')
      : current.gatewayUrl,
    ipnsDefault: typeof input.ipnsDefault === 'boolean' ? input.ipnsDefault : current.ipnsDefault,
  };
  await writeConfigFile(ipfsConfigPath(env), next);
  return publicIpfsConfig(next);
}

export function publicIpfsConfig(config: Partial<IpfsDeployConfig> = {}) {
  return {
    providerId: IPFS_KUBO_PROVIDER_ID,
    configured: isIpfsConfigured(config),
    tokenMask: '',
    teamId: '',
    teamSlug: '',
    rpcUrl: config.rpcUrl || DEFAULT_IPFS_RPC_URL,
    username: config.username || '',
    passwordMask: config.password ? SAVED_IPFS_PASSWORD_MASK : '',
    gatewayUrl: config.gatewayUrl || DEFAULT_IPFS_GATEWAY_URL,
    ipnsDefault: config.ipnsDefault === true,
    target: 'production' as const,
  };
}

export function isIpfsConfigured(config: Partial<IpfsDeployConfig>): boolean {
  return Boolean(config.rpcUrl && config.username && config.password);
}

/**
 * Import `IPFS_RPC_USER` / `IPFS_RPC_PASSWORD`. The daemon's own environment
 * wins; a Finder-launched desktop app has neither, so the values are then read
 * from a non-interactive login shell. Only those two names are read, and the
 * values never leave this function except into the 0600 config file.
 */
export async function importIpfsEnv(
  env: NodeJS.ProcessEnv = process.env,
  readShell: ShellReader = readLoginShellIpfsEnv,
) {
  const fromDaemon = credentialsFrom(env[IPFS_ENV_USER], env[IPFS_ENV_PASSWORD]);
  const found = fromDaemon ?? await readShell(env);
  if (!found) {
    throw new DeployError(
      `${IPFS_ENV_USER} and ${IPFS_ENV_PASSWORD} were not found in the app environment or your login shell profile.`,
      400,
      undefined,
      'IPFS_ENV_NOT_FOUND',
    );
  }
  const config = await writeIpfsConfig({ username: found.username, password: found.password }, env);
  return {
    config,
    source: fromDaemon ? 'daemon-env' as const : 'login-shell' as const,
    imported: [IPFS_ENV_USER, IPFS_ENV_PASSWORD],
  };
}

/**
 * Reads the two variables from `$SHELL -lc`, then `/bin/bash -lc` when the
 * user's shell is not bash (the operator keeps them in `~/.bash_profile`).
 * stdin is closed so a profile that waits for input ends instead of blocking.
 */
export async function readLoginShellIpfsEnv(env: NodeJS.ProcessEnv = process.env): Promise<IpfsEnvCredentials | null> {
  const shells = loginShellCandidates(env);
  for (const shell of shells) {
    const output = await runLoginShell(shell, env);
    const parsed = parseShellProbe(output);
    if (parsed) return parsed;
  }
  return null;
}

export function loginShellCandidates(env: NodeJS.ProcessEnv): string[] {
  const candidates: string[] = [];
  const userShell = env.SHELL;
  if (userShell && path.isAbsolute(userShell) && fs.existsSync(userShell)) candidates.push(userShell);
  if (!candidates.some((s) => path.basename(s) === 'bash') && fs.existsSync('/bin/bash')) candidates.push('/bin/bash');
  return candidates;
}

export function parseShellProbe(output: string): IpfsEnvCredentials | null {
  const at = output.lastIndexOf(SHELL_PROBE_SENTINEL);
  if (at < 0) return null;
  const [username, password] = output.slice(at + SHELL_PROBE_SENTINEL.length).split('\0');
  return credentialsFrom(username, password);
}

function runLoginShell(shell: string, env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(shell, ['-lc', SHELL_PROBE_SCRIPT], {
      stdio: ['ignore', 'pipe', 'ignore'],
      env: {
        HOME: env.HOME || os.homedir(),
        USER: env.USER || '',
        LOGNAME: env.LOGNAME || env.USER || '',
        PATH: env.PATH || '/usr/bin:/bin',
        SHELL: shell,
        TERM: 'dumb',
      },
    });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.on('error', () => resolve(''));
    child.on('close', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

export function ipnsKeyNameForProject(projectId: string): string {
  const safe = projectId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return `kd-${safe || 'project'}`;
}

export async function deployToIpfs({
  config,
  files,
  projectId,
  ipns,
  fetchImpl = fetch,
}: {
  config: IpfsDeployConfig;
  files: IpfsDeployFile[];
  projectId: string;
  ipns?: boolean | undefined;
  fetchImpl?: FetchImpl;
}) {
  if (!isIpfsConfigured(config)) {
    throw new DeployError(
      'IPFS RPC URL, user name and password are required. Import them from your shell or enter them in deploy settings.',
      400,
      undefined,
      'IPFS_CONFIG_REQUIRED',
    );
  }
  const rpc = createKuboClient(config, fetchImpl);
  const cid = await rpc.addSite(files);
  const gatewayBase = config.gatewayUrl.replace(/\/+$/, '');
  const url = `${gatewayBase}/ipfs/${cid}/`;
  const metadata: IpfsProviderMetadata = { cid, gatewayUrl: url };

  const publishIpns = typeof ipns === 'boolean' ? ipns : config.ipnsDefault;
  if (publishIpns) {
    const keyName = ipnsKeyNameForProject(projectId);
    metadata.ipnsKey = keyName;
    try {
      const ipnsName = await rpc.ensureKey(keyName);
      await rpc.publishName(cid, keyName);
      metadata.ipnsName = ipnsName;
      metadata.ipnsUrl = `${gatewayBase}/ipns/${ipnsName}/`;
    } catch (err) {
      // The site is already pinned and reachable by CID; an IPNS failure must
      // not discard that result.
      metadata.ipnsError = err instanceof Error ? err.message : String(err);
    }
  }

  const link = await checkDeploymentUrl(url);
  const pinnedMessage = 'Pinned on your IPFS node.';
  return {
    providerId: IPFS_KUBO_PROVIDER_ID,
    url,
    deploymentId: cid,
    target: 'production' as const,
    status: link.reachable ? 'ready' as const : 'link-delayed' as const,
    statusMessage: metadata.ipnsError
      ? `${pinnedMessage} IPNS publish failed: ${metadata.ipnsError}`
      : link.reachable
        ? pinnedMessage
        : `${pinnedMessage} The gateway has not served it yet.`,
    reachableAt: link.reachable ? Date.now() : undefined,
    providerMetadata: metadata,
  };
}

/** Derives the public `ipfs` field of a deployment from stored provider metadata. */
export function publicIpfsDeploymentInfo(providerMetadata: unknown) {
  if (!providerMetadata || typeof providerMetadata !== 'object') return undefined;
  const meta = providerMetadata as Partial<IpfsProviderMetadata>;
  if (typeof meta.cid !== 'string' || typeof meta.gatewayUrl !== 'string') return undefined;
  return {
    cid: meta.cid,
    gatewayUrl: meta.gatewayUrl,
    ...(meta.ipnsKey ? { ipnsKey: meta.ipnsKey } : {}),
    ...(meta.ipnsName ? { ipnsName: meta.ipnsName } : {}),
    ...(meta.ipnsUrl ? { ipnsUrl: meta.ipnsUrl } : {}),
  };
}

// ---- Kubo RPC ---------------------------------------------------------------

function createKuboClient(config: IpfsDeployConfig, fetchImpl: FetchImpl) {
  const base = normalizeEndpoint(config.rpcUrl, 'RPC URL', 'IPFS_RPC_URL_INVALID');
  const authorization = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;

  async function call(pathAndQuery: string, body?: FormData): Promise<string> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}/${pathAndQuery}`, {
        method: 'POST',
        headers: { Authorization: authorization },
        ...(body ? { body } : {}),
      });
    } catch (err) {
      // Transport failures carry no code so the client buckets them by cause.
      throw new DeployError(`Could not reach the IPFS RPC endpoint: ${errorText(err)}`, 502);
    }
    const text = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new DeployError('The IPFS RPC endpoint rejected the saved credentials.', 400, undefined, 'IPFS_AUTH_FAILED');
    }
    if (!response.ok) {
      throw new DeployError(
        `IPFS RPC ${pathAndQuery.split('?')[0]} failed with HTTP ${response.status}: ${text.slice(0, ERROR_BODY_EXCERPT_CHARS)}`,
        502,
      );
    }
    return text;
  }

  return {
    async addSite(files: IpfsDeployFile[]): Promise<string> {
      const form = buildSiteForm(files);
      const out = await call('add?pin=true&cid-version=1&raw-leaves=true&quieter=false&progress=false', form);
      const root = parseNdjson(out).find((entry) => entry.Name === SITE_ROOT);
      if (!root || typeof root.Hash !== 'string') {
        throw new DeployError('The IPFS node did not return a CID for the uploaded site.', 502);
      }
      return root.Hash;
    },
    async ensureKey(keyName: string): Promise<string> {
      const listed = parseJsonObject(await call('key/list?ipns-base=base36'));
      const keys = Array.isArray(listed.Keys) ? listed.Keys as Array<Record<string, unknown>> : [];
      const existing = keys.find((key) => key.Name === keyName);
      if (existing && typeof existing.Id === 'string') return existing.Id;
      const created = parseJsonObject(
        await call(`key/gen?arg=${encodeURIComponent(keyName)}&type=ed25519&ipns-base=base36`),
      );
      if (typeof created.Id !== 'string') throw new Error('key/gen returned no key id');
      return created.Id;
    },
    async publishName(cid: string, keyName: string): Promise<void> {
      await call(
        `name/publish?arg=${encodeURIComponent(`/ipfs/${cid}`)}&key=${encodeURIComponent(keyName)}`
          + '&lifetime=8760h&ttl=1m&allow-offline=true&ipns-base=base36',
      );
    },
  };
}

/**
 * Kubo multipart directory upload: a root directory part, one part per parent
 * directory, then one part per file, all under `site/`. This is the layout the
 * operator's existing publish scripts use against the same node.
 */
export function buildSiteForm(files: IpfsDeployFile[]): FormData {
  const form = new FormData();
  const directories = new Set<string>();
  const entries = files.map((entry) => {
    const segments = entry.file.split('/');
    if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
      throw new DeployError(`Refusing to upload an unsafe path: ${entry.file}`, 400, undefined, 'INVALID_PATH');
    }
    for (let i = 1; i < segments.length; i += 1) directories.add(segments.slice(0, i).join('/'));
    return entry;
  });
  const directoryBlob = () => new Blob([], { type: 'application/x-directory' });
  form.append('file', directoryBlob(), SITE_ROOT);
  for (const dir of [...directories].sort()) form.append('file', directoryBlob(), `${SITE_ROOT}/${dir}`);
  for (const entry of entries) {
    const bytes = typeof entry.data === 'string' ? Buffer.from(entry.data, 'utf8') : Buffer.from(entry.data);
    form.append(
      'file',
      new Blob([bytes], { type: entry.contentType || 'application/octet-stream' }),
      `${SITE_ROOT}/${entry.file}`,
    );
  }
  return form;
}

// ---- helpers ----------------------------------------------------------------

function credentialsFrom(username: unknown, password: unknown): IpfsEnvCredentials | null {
  if (typeof username !== 'string' || typeof password !== 'string') return null;
  const user = username.trim();
  if (!user || !password) return null;
  return { username: user, password };
}

function normalizeEndpoint(raw: string, label: string, code: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new DeployError(`The IPFS ${label} is not a valid URL.`, 400, undefined, code);
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new DeployError(`The IPFS ${label} must use https (http is allowed only for localhost).`, 400, undefined, code);
  }
  return url.toString().replace(/\/+$/, '');
}

async function writeConfigFile(file: string, config: IpfsDeployConfig) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Best effort on filesystems that do not support chmod.
  }
}

function parseNdjson(text: string): Array<Record<string, unknown>> {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return {};
      }
    });
}

function parseJsonObject(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

function errorText(err: unknown): string {
  return err instanceof Error && err.message ? err.message : String(err);
}
