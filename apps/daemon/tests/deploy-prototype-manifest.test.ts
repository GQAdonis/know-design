import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { prepareDeployPreflight } from '../src/deploy.js';
import { prototypeManifestWarnings, prototypeRouteKeys } from '../src/deploy/prototype-manifest.js';
import { ensureProject } from '../src/projects.js';

// Scenario MAN-1 (phase htmx-prototypes-and-ipfs-deploy): preflight warns,
// never blocks, when od-prototype.json drifts from the page's routes.

const PAGE = `<!doctype html><body>
<template data-od-route="GET /api/tasks"><li>x</li></template>
<template data-od-route="POST /api/tasks" data-od-status="422"><p>err</p></template>
<template data-od-route='POST /api/tasks'><li>y</li></template>
<template data-od-route="DELETE /api/tasks/:id"></template>
</body>`;
const manifest = (routes: Array<[string, string]>, entry = 'index.html') => JSON.stringify({
  version: 1, entry, routes: routes.map(([method, p]) => ({ method, path: p, entity: 'tasks', kind: 'list' })),
});

describe('prototype manifest preflight', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'od-proto-manifest-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('extracts the route set, folding guarded duplicates', () => {
    expect([...prototypeRouteKeys(PAGE)]).toEqual(['GET /api/tasks', 'POST /api/tasks', 'DELETE /api/tasks/:id']);
  });

  it('is silent when the manifest matches, absent, or describes another entry', () => {
    const ok = manifest([['GET', '/api/tasks'], ['POST', '/api/tasks'], ['DELETE', '/api/tasks/:id']]);
    expect(prototypeManifestWarnings([{ file: 'od-prototype.json', data: ok }], 'index.html', PAGE)).toEqual([]);
    expect(prototypeManifestWarnings([], 'index.html', PAGE)).toEqual([]);
    expect(prototypeManifestWarnings([{ file: 'od-prototype.json', data: manifest([], 'other.html') }], 'index.html', PAGE)).toEqual([]);
  });

  it('names routes missing on either side', () => {
    const drifted = manifest([['GET', '/api/tasks'], ['PUT', '/api/tasks/:id']]);
    const [warning] = prototypeManifestWarnings([{ file: 'od-prototype.json', data: drifted }], 'index.html', PAGE);
    expect(warning?.code).toBe('prototype-manifest-mismatch');
    expect(warning?.message).toContain('not in the manifest: POST /api/tasks, DELETE /api/tasks/:id');
    expect(warning?.message).toContain('no route template in index.html: PUT /api/tasks/:id');
  });

  it('flags invalid JSON', () => {
    const [warning] = prototypeManifestWarnings([{ file: 'od-prototype.json', data: '{nope' }], 'index.html', PAGE);
    expect(warning?.message).toMatch(/not valid JSON/);
  });

  it('surfaces the warning through prepareDeployPreflight for a real project', async () => {
    const projectId = 'proto-manifest';
    const dir = await ensureProject(root, projectId);
    await writeFile(path.join(dir, 'index.html'), PAGE);
    await writeFile(path.join(dir, 'od-prototype.json'), manifest([['GET', '/api/tasks']]));
    const preflight = await prepareDeployPreflight(root, projectId, 'index.html', { includeProjectFiles: true });
    expect(preflight.warnings.filter((w) => w.code === 'prototype-manifest-mismatch')).toHaveLength(1);
    await writeFile(path.join(dir, 'od-prototype.json'), manifest([['GET', '/api/tasks'], ['POST', '/api/tasks'], ['DELETE', '/api/tasks/:id']]));
    const clean = await prepareDeployPreflight(root, projectId, 'index.html', { includeProjectFiles: true });
    expect(clean.warnings.filter((w) => w.code === 'prototype-manifest-mismatch')).toHaveLength(0);
  });
});
