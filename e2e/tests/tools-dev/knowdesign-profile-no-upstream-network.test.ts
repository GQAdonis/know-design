// @vitest-environment node

/**
 * Why this lives in `e2e/tests/`: the invariant is "with OD_BUILD_PROFILE=knowdesign
 * the daemon contacts none of the upstream hosts", which only holds across the
 * harness (env + egress), the daemon env gates, and the HTTP routes that drive
 * them. A local HTTP(S) proxy records every outbound request the daemon makes;
 * the daemon is pointed at it with Node's built-in env-proxy support.
 *
 * The profile-off control proves the recorder can actually see upstream
 * traffic, so a green profile-on run is evidence and not a blind spot.
 */

import { describe, expect, test } from 'vitest';

import { forbiddenUpstreamHits as forbiddenHits, startRecordingProxy } from '@/net/proxy-recorder';
import { requestJson } from '@/vitest/http';
import { createSmokeSuite } from '@/vitest/suite';

function upstreamEnv(proxyPort: number, profile: 'knowdesign' | null): Record<string, string | undefined> {
  const proxy = `http://127.0.0.1:${proxyPort}`;
  return {
    // Explicitly unset for the control: an inherited knowdesign environment must not leak into it.
    OD_BUILD_PROFILE: profile ?? undefined,
    // Route every outbound daemon request through the recorder; keep loopback direct.
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    NODE_USE_ENV_PROXY: '1',
    NO_PROXY: '127.0.0.1,localhost,::1',
    // Real upstream configuration that the profile must neutralise.
    OD_RELEASE_CHANNEL: 'stable',
    POSTHOG_KEY: 'phc_e2e_recorder_key',
    LANGFUSE_PUBLIC_KEY: 'pk-lf-e2e',
    LANGFUSE_SECRET_KEY: 'sk-lf-e2e',
    OPEN_DESIGN_TELEMETRY_RELAY_URL: 'https://telemetry.open-design.ai/api/langfuse',
    OPEN_DESIGN_OBJECT_RELAY_URL: 'https://telemetry.open-design.ai/api/objects/batch',
  };
}

async function exerciseUpstreamSurfaces(webUrl: string): Promise<void> {
  // Consent granted on purpose: the profile, not the consent gate, must be what
  // keeps telemetry quiet.
  await requestJson(webUrl, '/api/app-config', {
    body: {
      agentId: null,
      designSystemId: null,
      onboardingCompleted: true,
      skillId: null,
      telemetry: { artifactManifest: true, content: true, metrics: true },
    },
    method: 'PUT',
  });
  await requestJson(webUrl, '/api/health').catch(() => null);
  await requestJson(webUrl, '/api/analytics/config').catch(() => null);
  await requestJson(webUrl, '/api/whats-new').catch(() => null);
  for (const path of [
    '/api/github/open-design',
    '/api/github/open-design/releases/latest',
    '/api/community/discord',
  ]) {
    await fetch(new URL(path, webUrl)).catch(() => null);
  }
  // Give any fire-and-forget background work (telemetry flush, metadata prefetch) a window.
  await new Promise((resolveWait) => setTimeout(resolveWait, 3_000));
}

describe('knowdesign build profile: no upstream network', () => {
  test('profile ON: zero requests to open-design.ai, PostHog, Langfuse, GitHub or Discord metadata hosts', async () => {
    const suite = await createSmokeSuite('knowdesign-no-upstream');
    const recorder = await startRecordingProxy();
    try {
      await suite.with.toolsDev(
        async ({ webUrl }) => {
          const health = await requestJson<{ buildProfile?: string }>(webUrl, '/api/health');
          expect(health.buildProfile).toBe('knowdesign');

          const analytics = await requestJson<{ enabled: boolean; key: string | null }>(
            webUrl,
            '/api/analytics/config',
          );
          expect(analytics.enabled).toBe(false);
          expect(analytics.key).toBeNull();

          await exerciseUpstreamSurfaces(webUrl);

          expect(forbiddenHits(recorder.hosts())).toEqual([]);
        },
        { env: upstreamEnv(recorder.port, 'knowdesign') },
      );
      await suite.finalize({ success: true });
    } catch (error) {
      await suite.finalize({ diagnostics: { recordedHosts: recorder.hosts() }, error, success: false });
      throw error;
    } finally {
      await recorder.close();
    }
  }, 240_000);

  test('profile OFF (control): the same recorder sees upstream metadata traffic', async () => {
    const suite = await createSmokeSuite('knowdesign-no-upstream-control');
    const recorder = await startRecordingProxy();
    try {
      await suite.with.toolsDev(
        async ({ webUrl }) => {
          await exerciseUpstreamSurfaces(webUrl);
          expect(forbiddenHits(recorder.hosts()).length).toBeGreaterThan(0);
        },
        { env: upstreamEnv(recorder.port, null) },
      );
      await suite.finalize({ success: true });
    } catch (error) {
      await suite.finalize({ diagnostics: { recordedHosts: recorder.hosts() }, error, success: false });
      throw error;
    } finally {
      await recorder.close();
    }
  }, 240_000);
});
