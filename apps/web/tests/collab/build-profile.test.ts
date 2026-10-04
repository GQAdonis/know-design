import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldRouteToFirstRunOnboarding } from '../../src/App';
import {
  getWebBuildProfile,
  learnBuildProfileFromResponse,
  resetWebBuildProfileForTests,
  setWebBuildProfile,
} from '../../src/collab/build-profile';
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL, defaultImageModelId } from '../../src/media/models';
import { daemonIsLive } from '../../src/providers/registry';
import type { AppConfig } from '../../src/types';

afterEach(() => {
  resetWebBuildProfileForTests();
  vi.unstubAllGlobals();
});

describe('web build profile', () => {
  it('stays default unless a response names knowdesign', async () => {
    await learnBuildProfileFromResponse(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    expect(getWebBuildProfile()).toBe('default');
    await learnBuildProfileFromResponse(new Response('not json', { status: 200 }));
    expect(getWebBuildProfile()).toBe('default');
    await learnBuildProfileFromResponse(new Response(JSON.stringify({ buildProfile: 'knowdesign' }), { status: 200 }));
    expect(getWebBuildProfile()).toBe('knowdesign');
  });

  it('learns the profile from the existing boot health check without an extra request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, buildProfile: 'knowdesign' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(daemonIsLive()).resolves.toBe(true);
    expect(getWebBuildProfile()).toBe('knowdesign');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers only when the profile changes', () => {
    setWebBuildProfile('knowdesign');
    expect(getWebBuildProfile()).toBe('knowdesign');
    setWebBuildProfile('something-else');
    expect(getWebBuildProfile()).toBe('default');
  });

  it('skips first-run onboarding under knowdesign only', () => {
    const fresh = { onboardingCompleted: false } as AppConfig;
    expect(shouldRouteToFirstRunOnboarding(fresh, '/')).toBe(true);
    expect(shouldRouteToFirstRunOnboarding(fresh, '/', 'default')).toBe(true);
    expect(shouldRouteToFirstRunOnboarding(fresh, '/', 'knowdesign')).toBe(false);
  });

  it('starts image projects on a non-Vela model under knowdesign', () => {
    expect(defaultImageModelId('default')).toBe(DEFAULT_IMAGE_MODEL);
    const model = IMAGE_MODELS.find((m) => m.id === defaultImageModelId('knowdesign'));
    expect(model).toBeDefined();
    expect(model?.provider).not.toBe('vela');
  });
});
