import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dockerfile = readFileSync(path.join(repoRoot, 'deploy/Dockerfile'), 'utf8');

// The web UI learns its profile from the daemon's /api/health, so the image must
// carry the profile itself: nothing sets it in the environment of a web install.
describe('container image build profile', () => {
  it('bakes the knowdesign profile into the runtime image environment', () => {
    expect(dockerfile).toMatch(/^ARG OD_BUILD_PROFILE=knowdesign$/m);
    expect(dockerfile).toMatch(/^ENV OD_BUILD_PROFILE=\$\{OD_BUILD_PROFILE\}$/m);
  });

  it('sets the profile after the runtime stage starts, not only in the build stage', () => {
    const runtimeStart = dockerfile.lastIndexOf('FROM ');
    expect(dockerfile.indexOf('ENV OD_BUILD_PROFILE=')).toBeGreaterThan(runtimeStart);
  });
});
