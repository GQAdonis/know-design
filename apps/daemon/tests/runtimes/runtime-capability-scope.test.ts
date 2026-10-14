import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { agentCapabilities } from '../../src/runtimes/capabilities.js';
import { ensureDetectedRuntimeCapabilities } from '../../src/runtimes/detection.js';

// A stand-in OpenCode whose `run --help` output is chosen per call. The 1.x
// text advertises `--dir`; the 2.x text does not.
const HELP_1X = 'FLAGS\n  --dir string  Directory\n  --pure  Skip plugins\n';
const HELP_2X = 'FLAGS\n  --auto  Auto-approve permissions\n  --standalone  Private server\n';

function fakeOpenCode(dir: string, body: string): string {
  const bin = path.join(dir, 'opencode');
  writeFileSync(bin, `#!/usr/bin/env node\n${body}`);
  chmodSync(bin, 0o755);
  return bin;
}

function helpScript(help: string): string {
  return `
const args = process.argv.slice(2);
if (args.includes('--version')) { console.log('opencode fake'); process.exit(0); }
if (args.includes('--help')) { console.error(${JSON.stringify(help)}); process.exit(0); }
process.exit(0);
`;
}

describe('OpenCode capability cache', () => {
  const dirs: string[] = [];
  afterEach(() => {
    agentCapabilities.delete('opencode');
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('re-probes after the binary at the same path changes (in-place upgrade)', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'od-opencode-scope-'));
    dirs.push(dir);
    const bin = fakeOpenCode(dir, helpScript(HELP_1X));
    const env = { OPENCODE_BIN: bin };

    await expect(ensureDetectedRuntimeCapabilities('opencode', env))
      .resolves.toMatchObject({ workspaceDir: true, autoApprove: false });

    // OpenCode self-updates in place: same path, new bytes.
    fakeOpenCode(dir, helpScript(HELP_2X));

    await expect(ensureDetectedRuntimeCapabilities('opencode', env))
      .resolves.toMatchObject({ workspaceDir: false, autoApprove: true });
  });

  it('does not keep a failed --help probe as the final answer', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'od-opencode-probe-'));
    dirs.push(dir);
    const ready = path.join(dir, 'ready');
    // Same bytes on disk throughout; behaviour flips on a side file, so the
    // cache scope cannot tell the two calls apart.
    const bin = fakeOpenCode(dir, `
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args.includes('--version')) { console.log('opencode fake'); process.exit(0); }
if (args.includes('--help')) {
  if (!fs.existsSync(${JSON.stringify(ready)})) process.exit(1);
  console.error(${JSON.stringify(HELP_2X)});
  process.exit(0);
}
process.exit(0);
`);
    const env = { OPENCODE_BIN: bin };

    // A transient failure (timeout, crash during a cold start) yields no
    // flags at all, which buildArgs reads as "unknown".
    await expect(ensureDetectedRuntimeCapabilities('opencode', env)).resolves.toEqual({});

    writeFileSync(ready, '');
    expect(existsSync(ready)).toBe(true);
    await expect(ensureDetectedRuntimeCapabilities('opencode', env))
      .resolves.toMatchObject({ workspaceDir: false, autoApprove: true });
  });
});
