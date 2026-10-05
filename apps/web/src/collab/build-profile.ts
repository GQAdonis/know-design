import { useSyncExternalStore } from 'react';
import type { BuildProfile } from '@open-design/contracts';

// The web cannot read daemon env, so the profile is learned from responses the
// app already receives: the boot-time `/api/health` liveness check and the
// workspace-directory response, each carrying an optional `buildProfile` that the
// daemon emits only under a non-default profile. Until one lands, or if the daemon
// omits it, the profile is 'default' (stock behaviour). No request is added.
let cachedProfile: BuildProfile = 'default';
const listeners = new Set<() => void>();

export function getWebBuildProfile(): BuildProfile {
  return cachedProfile;
}

export function setWebBuildProfile(value: unknown): void {
  const next: BuildProfile = value === 'knowdesign' ? 'knowdesign' : 'default';
  if (next === cachedProfile) return;
  cachedProfile = next;
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-renders the caller when the profile is learned after first render. */
export function useWebBuildProfile(): BuildProfile {
  return useSyncExternalStore(subscribe, getWebBuildProfile, getWebBuildProfile);
}

/** Best-effort: read an optional `buildProfile` from a health-shaped response. */
export async function learnBuildProfileFromResponse(response: Response): Promise<void> {
  try {
    const body: unknown = await response.clone().json();
    // A valid JSON object answers authoritatively: the daemon omits the field under the
    // default profile, so an absent `buildProfile` means 'default' (a reconnect to a
    // stock daemon must not keep the knowdesign UI).
    if (body && typeof body === 'object') {
      setWebBuildProfile((body as { buildProfile?: unknown }).buildProfile);
    }
  } catch {
    // Not a JSON body (or a mocked response): the profile stays as it was.
  }
}

export function resetWebBuildProfileForTests(): void {
  cachedProfile = 'default';
  listeners.clear();
}
