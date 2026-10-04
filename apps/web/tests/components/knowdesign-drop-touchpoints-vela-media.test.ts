// @vitest-environment jsdom
// Profile-on assertions for `drop-touchpoints-marketplace-vela-media` (web half).
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  primeWebBuildProfile,
  resetWebBuildProfileForTests,
} from '../../src/collab/build-profile';
import { loadProductionTouchpointDecision } from '../../src/components/production-touchpoint-loader';
import { supportedModels } from '../../src/components/NewProjectPanel';
import { IMAGE_MODELS } from '../../src/media/models';

async function enterKnowdesignProfile() {
  resetWebBuildProfileForTests();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, buildProfile: 'knowdesign' }), { status: 200 })),
  );
  await primeWebBuildProfile();
}

afterEach(() => {
  resetWebBuildProfileForTests();
  vi.unstubAllGlobals();
});

describe('knowdesign profile: web touchpoints', () => {
  it('never requests /api/touchpoints* from the production loader', async () => {
    await enterKnowdesignProfile();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await loadProductionTouchpointDecision(
      'opend.home.account-badge',
      'en-US',
      new AbortController().signal,
    );
    expect(result).toEqual({ kind: 'no-decision' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still requests the production runtime with the profile off', async () => {
    resetWebBuildProfileForTests();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    await loadProductionTouchpointDecision('opend.home.account-badge', 'en-US', new AbortController().signal);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/touchpoints/production-runtime'),
      expect.anything(),
    );
  });
});

describe('knowdesign profile: web media model picker', () => {
  it('drops vela/* models and keeps the others', async () => {
    await enterKnowdesignProfile();
    const models = supportedModels('image', IMAGE_MODELS);
    expect(models.some((m) => m.provider === 'vela' || m.id.startsWith('vela/'))).toBe(false);
    expect(models.length).toBeGreaterThan(0);
  });

  it('keeps vela/* models with the profile off', () => {
    resetWebBuildProfileForTests();
    expect(supportedModels('image', IMAGE_MODELS).some((m) => m.provider === 'vela')).toBe(true);
  });
});
