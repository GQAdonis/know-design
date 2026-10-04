import type { BuildProfile } from '@open-design/contracts';

/**
 * Resolve the build profile from `OD_BUILD_PROFILE`. A function (not a
 * module-load constant) so callers and tests can inject `env`. Unknown or
 * missing values resolve to `'default'`.
 */
export function getBuildProfile(env: NodeJS.ProcessEnv = process.env): BuildProfile {
  const normalized = String(env.OD_BUILD_PROFILE ?? '').trim().toLowerCase();
  return normalized === 'knowdesign' ? 'knowdesign' : 'default';
}

export function isKnowdesignProfile(env: NodeJS.ProcessEnv = process.env): boolean {
  return getBuildProfile(env) === 'knowdesign';
}
