import type { BuildProfile, BuildProfileHealthField } from '@open-design/contracts';

// The web cannot read daemon env, so the profile is learned once from the
// daemon's `/api/health` (optional `buildProfile` field). Until it lands, or if
// the daemon omits it, the profile is 'default' (stock behaviour).
let cachedProfile: BuildProfile = 'default';
let inflight: Promise<BuildProfile> | null = null;

export function getWebBuildProfile(): BuildProfile {
  return cachedProfile;
}

export function primeWebBuildProfile(): Promise<BuildProfile> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response || !response.ok) return cachedProfile;
      const body = (await response.json()) as BuildProfileHealthField | null;
      cachedProfile = body?.buildProfile === 'knowdesign' ? 'knowdesign' : 'default';
    } catch {
      // Keep the current profile; health is best-effort for this field.
    }
    return cachedProfile;
  })();
  return inflight;
}

export function resetWebBuildProfileForTests(): void {
  cachedProfile = 'default';
  inflight = null;
}
