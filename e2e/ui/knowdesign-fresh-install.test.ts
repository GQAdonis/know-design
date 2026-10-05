import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { Browser, BrowserContext, Page, Request, TestInfo } from '@playwright/test';

import { clusterTest as test, expect } from '@/playwright/suite';
import { settingsSurface } from '@/playwright/amr';
import { seedCampaignDismissals } from '@/playwright/campaign-dismissals';
import { createFakeAgentRuntimes } from '@/playwright/fake-agents';
import { suppressWhatsNew } from '@/playwright/mock-factory';
import { forbiddenUpstreamHits, startRecordingProxy } from '@/net/proxy-recorder';
import type { ProxyRecorder } from '@/net/proxy-recorder';
import { createToolsDevSuite, e2eWorkspaceRoot } from '@/tools-dev/runtime';
import type { ToolsDevSuite } from '@/tools-dev/types';
import { T } from '@/timeouts';

/**
 * Plan acceptance for `stub-amr-and-billing`: with OD_BUILD_PROFILE=knowdesign a
 * FRESH install starts a local agent run with no sign-in prompt, no balance
 * dialog, and no network call to *.open-design.ai.
 *
 * Why this owns its runtime instead of using the worker `toolsDev` fixture: the
 * build profile is read from the daemon's process env at start, and the worker
 * fixture starts one runtime with a fixed env for every file. The profile-off
 * control needs a second runtime with a different env, so both cases allocate
 * their own isolated tools-dev runtime through the sanctioned
 * `createToolsDevSuite(...).startWeb(env)` path (the same one the collab
 * cluster uses).
 *
 * Egress is denied and witnessed at both ends, because neither alone is
 * enough: the browser context aborts and records every non-loopback request,
 * and the daemon/web processes are pointed at a recording proxy via
 * NODE_USE_ENV_PROXY, so a daemon-side call cannot leave the machine unseen.
 * The profile-off control proves both witnesses can actually see traffic.
 */

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const FRESH_PROMPT = 'Create a deterministic smoke artifact';

type FreshRuntime = {
  browserEgress: () => string[];
  daemonProxy: ProxyRecorder;
  context: BrowserContext;
  page: Page;
  runtime: ToolsDevSuite;
  close: (options: { preserve: boolean }) => Promise<void>;
};

function isLoopback(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:' || parsed.protocol === 'about:') return true;
    return LOOPBACK_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

async function startFreshRuntime(
  browser: Browser,
  testInfo: TestInfo,
  profile: 'knowdesign' | null,
): Promise<FreshRuntime> {
  const label = profile ?? 'stock';
  const root = join(
    e2eWorkspaceRoot(),
    '.tmp',
    'e2e',
    `fresh-install-${label}-${process.pid}-${testInfo.workerIndex}-${testInfo.parallelIndex}`,
  );
  await rm(root, { force: true, recursive: true });
  const scratch = join(root, 'scratch');
  await mkdir(scratch, { recursive: true });

  const fakeRuntimes = await createFakeAgentRuntimes({
    root: join(scratch, 'fake-agent-runtimes'),
    runtimeIds: ['codex'],
  });
  const daemonProxy = await startRecordingProxy();
  const runtime = createToolsDevSuite({
    codexHomeDir: join(scratch, 'codex-home'),
    dataDir: join(scratch, 'data'),
    namespace: `fresh-${label}-${process.pid}-${testInfo.workerIndex}-${testInfo.parallelIndex}`,
    root,
    toolsDevRoot: join(scratch, 'tools-dev'),
  });
  const env: Record<string, string | undefined> = {
    ...(profile ? { OD_BUILD_PROFILE: profile } : {}),
    // The fake local agent is discovered by the daemon itself, exactly like a
    // CLI installed on the user's PATH: nothing is written into app-config.
    ...fakeRuntimes.codex.env,
    OD_CODEX_TRANSPORT: 'exec-json',
    // A developer's real ~/.amr login must never leak into a fresh install.
    AMR_HOME: join(scratch, 'amr-home'),
    // Every outbound daemon/web request goes to the recorder; loopback stays direct.
    HTTP_PROXY: daemonProxy.url,
    HTTPS_PROXY: daemonProxy.url,
    http_proxy: daemonProxy.url,
    https_proxy: daemonProxy.url,
    NODE_USE_ENV_PROXY: '1',
    NO_PROXY: '127.0.0.1,localhost,::1',
    no_proxy: '127.0.0.1,localhost,::1',
    // Real upstream configuration the profile must neutralise.
    OD_RELEASE_CHANNEL: 'stable',
    POSTHOG_KEY: 'phc_e2e_recorder_key',
    LANGFUSE_PUBLIC_KEY: 'pk-lf-e2e',
    LANGFUSE_SECRET_KEY: 'sk-lf-e2e',
    OPEN_DESIGN_TELEMETRY_RELAY_URL: 'https://telemetry.open-design.ai/api/langfuse',
    OPEN_DESIGN_OBJECT_RELAY_URL: 'https://telemetry.open-design.ai/api/objects/batch',
  };

  let context: BrowserContext | null = null;
  const browserEgress: string[] = [];
  try {
    await runtime.startWeb(env);
    context = await browser.newContext({ baseURL: runtime.url.web() });
    await seedCampaignDismissals(context);
    // Browser-side egress denial: abort and record anything that is not loopback.
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (isLoopback(url)) {
        await route.fallback();
        return;
      }
      browserEgress.push(new URL(url).hostname);
      await route.abort('blockedbyclient');
    });
    context.on('request', (request: Request) => {
      if (!isLoopback(request.url())) browserEgress.push(new URL(request.url()).hostname);
    });
    const page = await context.newPage();
    // The release card is unrelated to this spec's subject; keep it off the page.
    await suppressWhatsNew(page);
    return {
      browserEgress: () => [...new Set(browserEgress)],
      close: async ({ preserve }) => {
        await context?.close().catch(() => undefined);
        await runtime.stopWeb(env).catch(() => undefined);
        await daemonProxy.close();
        if (!preserve) await rm(root, { force: true, recursive: true }).catch(() => undefined);
      },
      context,
      daemonProxy,
      page,
      runtime,
    };
  } catch (error) {
    await context?.close().catch(() => undefined);
    await runtime.stopWeb(env).catch(() => undefined);
    await daemonProxy.close();
    throw error;
  }
}

async function waitForLoadingToClear(page: Page): Promise<void> {
  await page.getByText('Loading OpenDesign…').waitFor({ state: 'hidden', timeout: T.long });
}

/** Every Cloud sign-in / billing surface the profile must keep off the page. */
async function expectNoCloudSurfaces(page: Page): Promise<void> {
  for (const testId of [
    'entry-cloud-signin-tip',
    'entry-rail-account-sync-tip',
    'entry-rail-account-recovery-tip',
    'amr-balance-dialog',
    'amr-artifact-upgrade-dialog',
    'amr-artifact-upgrade-home-card',
  ]) {
    await expect(page.getByTestId(testId), testId).toHaveCount(0);
  }
  await expect(page.locator('.amr-account-control')).toHaveCount(0);
  await expect(page.locator('.onboarding-cloud__primary')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Sign in \/ Sign up|登录 \/ 注册/i })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: /balance|credits|upgrade|top.?up/i })).toHaveCount(0);
}

// Each case boots its own web + daemon (a cold daemon build can dominate), so the
// per-test budget covers runtime start-up, not just the browser flow.
const RUNTIME_CASE_TIMEOUT_MS = 540_000;
// Agent detection probes every known CLI; a cold, loaded runner can take a while.
const AGENT_DETECTION_TIMEOUT_MS = 150_000;
// Run creation and completion on a loaded runner (the daemon is busy spawning).
const RUN_TIMEOUT_MS = 120_000;
test.describe.configure({ timeout: RUNTIME_CASE_TIMEOUT_MS });

test('[P1] knowdesign fresh install lands on home and runs a local agent with no cloud sign-in, no balance dialog and no egress', async ({ browser }, testInfo) => {
  const fresh = await startFreshRuntime(browser, testInfo, 'knowdesign');
  let failed = true;
  try {
    const { page } = fresh;

    // The runtime really is the knowdesign build and really has fresh state.
    const health = await page.request.get('/api/health');
    expect((await health.json()).buildProfile).toBe('knowdesign');
    const initial = await page.request.get('/api/app-config');
    expect((await initial.json()).config?.onboardingCompleted ?? false).toBe(false);

    // 1. Fresh launch: no first-run onboarding / Cloud sign-in wizard.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForLoadingToClear(page);
    await expect(page.getByTestId('home-hero')).toBeVisible({ timeout: T.long });
    // Hold the observation across a settle window: the onboarding redirect is a
    // one-shot boot pass that a late config/profile fetch could still trigger.
    await page.waitForTimeout(2_000);
    await expect(page).not.toHaveURL(/\/onboarding/);
    await expect(page.getByTestId('home-hero')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Welcome to OpenDesign|欢迎使用 OpenDesign/i })).toHaveCount(0);
    await expectNoCloudSurfaces(page);

    // 2. A local agent is discoverable and no managed Cloud agent is offered.
    const agentsResponse = await page.request.get('/api/agents', { timeout: AGENT_DETECTION_TIMEOUT_MS });
    const agents = (await agentsResponse.json()) as { agents: Array<{ id: string; available?: boolean }> };
    expect(agents.agents.some((agent) => agent.id === 'amr')).toBe(false);
    expect(agents.agents.find((agent) => agent.id === 'codex')?.available).toBe(true);

    // 3. Pick the local agent the way a fresh knowdesign user must (there is no
    //    onboarding to do it): Home's execution pill -> Settings -> Local CLI.
    //    The managed Cloud agent must not be offered there.
    await page.getByTestId('inline-model-switcher-chip').first().click();
    await expect(page.getByTestId('inline-model-switcher-popover')).toBeVisible();
    await page.getByTestId('inline-model-switcher-open-settings').click();
    const settings = settingsSurface(page);
    await expect(settings).toBeVisible({ timeout: T.long });
    await settings.getByRole('tab', { name: /Local CLI/i }).click();
    await expect(settings.getByTestId('settings-agent-card-amr')).toHaveCount(0);
    await expect(settings.getByTestId('settings-agent-card-codex')).toBeVisible({ timeout: T.long });
    await settings.getByTestId('settings-agent-select-codex').click();
    await expect(settings.getByTestId('settings-agent-card-codex')).toHaveClass(/active/);
    await page.keyboard.press('Escape');
    await expect(settings).toBeHidden();
    await expect
      .poll(async () => (await (await page.request.get('/api/app-config')).json()).config?.agentId, {
        timeout: T.long,
      })
      .toBe('codex');

    // 4. Start a real run in a project from the composer.
    const projectId = `fresh-knowdesign-${Date.now()}`;
    const created = await page.request.post('/api/projects', {
      data: {
        id: projectId,
        name: 'Fresh knowdesign run',
        skillId: null,
        designSystemId: null,
        pendingPrompt: null,
        metadata: { kind: 'prototype' },
      },
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    const { conversationId } = (await created.json()) as { conversationId: string };
    await page.goto(`/projects/${projectId}/conversations/${conversationId}`, { waitUntil: 'domcontentloaded' });
    await waitForLoadingToClear(page);
    await expect(page.getByTestId('chat-composer-input')).toBeVisible({ timeout: T.long });
    await expect(page).not.toHaveURL(/\/onboarding/);

    const input = page.getByTestId('chat-composer-input');
    const send = page.getByTestId('chat-send');
    await input.click();
    await input.fill(FRESH_PROMPT);
    await expect(send).toBeEnabled();
    const [createRun] = await Promise.all([
      page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/api/runs' && response.request().method() === 'POST',
        { timeout: RUN_TIMEOUT_MS },
      ),
      send.click(),
    ]);
    expect(createRun.ok(), await createRun.text()).toBeTruthy();

    // 5. The run completes and produces its artifact, with no billing surface.
    //    (The file only exists once the fake agent has run to completion.)
    await expect
      .poll(
        async () => {
          const response = await page.request.get(`/api/projects/${projectId}/files`);
          return JSON.stringify(await response.json());
        },
        { timeout: RUN_TIMEOUT_MS },
      )
      .toContain('real-daemon-smoke.html');
    await expectNoCloudSurfaces(page);

    // 6. Effective egress denial: neither witness saw a single upstream call,
    //    and the browser made no non-loopback request at all.
    await page.waitForTimeout(3_000);
    expect(forbiddenUpstreamHits(fresh.daemonProxy.hosts()), 'daemon/web egress').toEqual([]);
    expect(forbiddenUpstreamHits(fresh.browserEgress()), 'browser egress').toEqual([]);
    expect(fresh.browserEgress(), 'browser attempted non-loopback requests').toEqual([]);
    failed = false;
  } finally {
    await fresh.close({ preserve: failed });
  }
});

test('[P1] control: the stock profile on a fresh install routes to Cloud onboarding and the same recorders see upstream traffic', async ({ browser }, testInfo) => {
  const fresh = await startFreshRuntime(browser, testInfo, null);
  let failed = true;
  try {
    const { page } = fresh;
    const health = await page.request.get('/api/health');
    expect((await health.json()).buildProfile ?? 'default').not.toBe('knowdesign');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForLoadingToClear(page);
    // Stock behaviour: a fresh install is sent to first-run onboarding, whose
    // landing is the Cloud sign-in surface the knowdesign case must never show.
    await expect(page).toHaveURL(/\/onboarding/, { timeout: T.long });
    await expect(page.getByRole('heading', { name: /Welcome to OpenDesign|欢迎使用 OpenDesign/i })).toBeVisible();
    await expect(page.locator('.onboarding-cloud__primary')).toBeVisible();

    // Same recorders, same upstream surfaces the vitest control exercises: the
    // daemon recorder must see forbidden hosts, so a green profile-on run is
    // evidence rather than a blind spot.
    for (const path of [
      '/api/analytics/config',
      '/api/whats-new',
      '/api/github/open-design',
      '/api/github/open-design/releases/latest',
      '/api/community/discord',
    ]) {
      await page.request.get(path).catch(() => null);
    }
    await expect
      .poll(() => forbiddenUpstreamHits(fresh.daemonProxy.hosts()).length, { timeout: T.medium })
      .toBeGreaterThan(0);
    // The browser witness is live too: the stock UI tries to reach non-loopback hosts.
    expect(fresh.browserEgress().length, 'browser witness saw no stock egress').toBeGreaterThan(0);
    failed = false;
  } finally {
    await fresh.close({ preserve: failed });
  }
});
