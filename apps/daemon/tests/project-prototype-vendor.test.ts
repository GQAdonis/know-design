import { mkdtempSync, rmSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildProjectArchive, listFiles, listProjectFolders } from '../src/projects.js';

// htmx + Alpine prototypes (design-templates/htmx-alpine-prototype) ship their
// runtime in a project-level `vendor/` folder that the page loads directly.
// `vendor` stays an ignored directory for dependency trees (PHP, Go, Ruby), but
// a prototype runtime folder — recognised by its MANIFEST.json and od-mock.js —
// is part of the design and must be visible, listed, and exported.

const PROJECT_ID = 'proto-vendor-test';

async function writePrototype(root: string): Promise<void> {
  await writeFile(path.join(root, 'index.html'), '<!doctype html><script src="vendor/htmx.min.js"></script>');
  await mkdir(path.join(root, 'vendor', 'ext'), { recursive: true });
  await writeFile(path.join(root, 'vendor', 'MANIFEST.json'), '{"files":[]}');
  await writeFile(path.join(root, 'vendor', 'htmx.min.js'), '/* htmx */');
  await writeFile(path.join(root, 'vendor', 'od-mock.js'), '/* od-mock */');
  await writeFile(path.join(root, 'vendor', 'ext', 'response-targets.min.js'), '/* ext */');
}

describe('prototype runtime vendor folder', () => {
  let root = '';
  let control = '';

  beforeEach(async () => {
    root = mkdtempSync(path.join(tmpdir(), 'od-proto-vendor-'));
    control = mkdtempSync(path.join(tmpdir(), 'od-plain-vendor-'));
    await writePrototype(root);
    await writeFile(path.join(control, 'index.php'), '<?php');
    await mkdir(path.join(control, 'vendor', 'monolog'), { recursive: true });
    await writeFile(path.join(control, 'vendor', 'autoload.php'), '<?php');
    await writeFile(path.join(control, 'vendor', 'monolog', 'Logger.php'), '<?php');
  });

  afterEach(() => {
    for (const dir of [root, control]) if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('lists the runtime files in the file panel', async () => {
    const files = await listFiles('/unused', PROJECT_ID, { metadata: { baseDir: root } });
    const paths = files.map((f: { path: string }) => f.path);
    expect(paths).toEqual(expect.arrayContaining([
      'vendor/MANIFEST.json',
      'vendor/htmx.min.js',
      'vendor/od-mock.js',
      'vendor/ext/response-targets.min.js',
    ]));
  });

  it('lists the runtime folders', async () => {
    const folders = await listProjectFolders('/unused', PROJECT_ID, { metadata: { baseDir: root } });
    const paths = folders.map((f: { path: string }) => f.path);
    expect(paths).toEqual(expect.arrayContaining(['vendor', 'vendor/ext']));
  });

  it('includes the runtime in the project zip', async () => {
    const { buffer } = await buildProjectArchive('/unused', PROJECT_ID, '', { baseDir: root });
    expect(buffer.includes(Buffer.from('vendor/od-mock.js'))).toBe(true);
    expect(buffer.includes(Buffer.from('vendor/ext/response-targets.min.js'))).toBe(true);
  });

  it('keeps hiding a dependency vendor folder without the runtime marker', async () => {
    const files = await listFiles('/unused', PROJECT_ID, { metadata: { baseDir: control } });
    const folders = await listProjectFolders('/unused', PROJECT_ID, { metadata: { baseDir: control } });
    expect(files.map((f: { path: string }) => f.path)).toEqual(['index.php']);
    expect(folders.some((f: { path: string }) => f.path.startsWith('vendor'))).toBe(false);
  });
});
