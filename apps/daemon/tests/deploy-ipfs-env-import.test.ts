import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DeployError } from '../src/deploy.js';
import {
  importIpfsEnv,
  ipfsConfigPath,
  parseShellProbe,
  readLoginShellIpfsEnv,
} from '../src/deploy/ipfs.js';

// Scenario IPFS-3 (phase htmx-prototypes-and-ipfs-deploy): a Finder-launched
// app has no IPFS_RPC_* in its environment, so the values come from the
// user's login shell profile.

const USER = 'kd-env-user';
const PASSWORD = 'SENTINEL-env-password-91c2';

describe('ipfs env import', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'od-ipfs-env-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function baseEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return { OD_USER_STATE_DIR: path.join(root, 'state'), HOME: root, PATH: '/usr/bin:/bin', ...extra };
  }

  it('prefers the daemon environment and never returns the values', async () => {
    const env = baseEnv({ IPFS_RPC_USER: USER, IPFS_RPC_PASSWORD: PASSWORD });
    const result = await importIpfsEnv(env, async () => {
      throw new Error('login shell must not be consulted when the daemon env has the values');
    });
    expect(result.source).toBe('daemon-env');
    expect(result.imported).toEqual(['IPFS_RPC_USER', 'IPFS_RPC_PASSWORD']);
    expect(JSON.stringify(result)).not.toContain(PASSWORD);
    expect(result.config).toMatchObject({ configured: true, username: USER });
    expect(JSON.parse(await readFile(ipfsConfigPath(env), 'utf8'))).toMatchObject({ username: USER, password: PASSWORD });
  });

  it('falls back to the login shell when the daemon env lacks the values', async () => {
    const env = baseEnv();
    const result = await importIpfsEnv(env, async () => ({ username: USER, password: PASSWORD }));
    expect(result.source).toBe('login-shell');
    expect(JSON.stringify(result)).not.toContain(PASSWORD);
  });

  it('fails with IPFS_ENV_NOT_FOUND when neither source defines them (IPFS-3 negative)', async () => {
    const env = baseEnv();
    const error = await importIpfsEnv(env, async () => null).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(DeployError);
    expect((error as DeployError).code).toBe('IPFS_ENV_NOT_FOUND');
    expect(existsSync(ipfsConfigPath(env))).toBe(false);
  });

  it('reads the variables from a real bash login profile, ignoring profile output', async () => {
    if (!existsSync('/bin/bash')) return;
    await writeFile(
      path.join(root, '.bash_profile'),
      [
        'echo "welcome banner from profile"',
        `export IPFS_RPC_USER='${USER}'`,
        `export IPFS_RPC_PASSWORD='${PASSWORD}'`,
        '',
      ].join('\n'),
    );
    const found = await readLoginShellIpfsEnv({ HOME: root, SHELL: '/bin/bash', PATH: '/usr/bin:/bin' });
    expect(found).toEqual({ username: USER, password: PASSWORD });
  });

  it('returns null from a real login shell whose profile does not define them', async () => {
    if (!existsSync('/bin/bash')) return;
    await writeFile(path.join(root, '.bash_profile'), 'export SOMETHING_ELSE=1\n');
    expect(await readLoginShellIpfsEnv({ HOME: root, SHELL: '/bin/bash', PATH: '/usr/bin:/bin' })).toBeNull();
  });

  it('parses the probe only after the sentinel', () => {
    expect(parseShellProbe('noise __KD_IPFS_ENV__u\0p\0')).toEqual({ username: 'u', password: 'p' });
    expect(parseShellProbe('__KD_IPFS_ENV__\0\0')).toBeNull();
    expect(parseShellProbe('no sentinel')).toBeNull();
  });
});
