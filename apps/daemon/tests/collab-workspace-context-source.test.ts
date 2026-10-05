import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/collab/vela-workspace-context.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/collab/vela-workspace-context.js')>();
  return {
    ...actual,
    fetchVelaWorkspaceDirectory: vi.fn(async () => ({ ok: true, items: [] })),
    resolveVelaWorkspaceHubEventsEndpoint: vi.fn(() => null),
    createVelaWorkspaceContextProvider: vi.fn(() => ({ kind: 'vela-provider' })),
  };
});

import {
  createVelaWorkspaceContextProvider,
  fetchVelaWorkspaceDirectory,
  resolveVelaWorkspaceHubEventsEndpoint,
} from '../src/collab/vela-workspace-context.js';
import {
  createWorkspaceContextProviderFromEnv,
  fetchWorkspaceDirectoryFromSource,
  workspaceContextSource,
  workspaceContextSourceCapabilities,
  type WorkspaceContextSource,
  type WorkspaceContextSourceRegistry,
} from '../src/collab/workspace-context-source.js';
import { createSyncDigestReader } from '../src/collab/sync-digest.js';

afterEach(() => vi.clearAllMocks());

function acmeSource(overrides: Partial<WorkspaceContextSource> = {}) {
  const acmeProvider = { kind: 'acme-provider' } as never;
  const source: WorkspaceContextSource = {
    capabilities: { directoryAuthority: true, hubEvents: true },
    fetchDirectory: vi.fn(async () => ({ ok: true, items: [] })),
    resolveHubEventsEndpoint: vi.fn(() => null),
    syncDigestRequest: vi.fn(() => ({
      accountId: 'acme-user',
      url: 'https://acme.example/digest',
      headers: { authorization: 'Bearer acme' },
    })),
    createContextProvider: vi.fn(() => acmeProvider),
    ...overrides,
  };
  return { source, acmeProvider };
}

function expectVelaUntouched() {
  expect(fetchVelaWorkspaceDirectory).not.toHaveBeenCalled();
  expect(resolveVelaWorkspaceHubEventsEndpoint).not.toHaveBeenCalled();
  expect(createVelaWorkspaceContextProvider).not.toHaveBeenCalled();
}

describe('workspaceContextSourceCapabilities', () => {
  it('resolves vela to directory authority and hub events', () => {
    expect(
      workspaceContextSourceCapabilities({ OD_WORKSPACE_CONTEXT_SOURCE: ' vela ' }),
    ).toEqual({ directoryAuthority: true, hubEvents: true });
  });

  it('resolves dev, unset and unknown kinds to no capabilities', () => {
    const none = { directoryAuthority: false, hubEvents: false };
    expect(workspaceContextSourceCapabilities({ OD_WORKSPACE_CONTEXT_SOURCE: 'dev' })).toEqual(none);
    expect(workspaceContextSourceCapabilities({})).toEqual(none);
    expect(workspaceContextSourceCapabilities({ OD_WORKSPACE_CONTEXT_SOURCE: 'toString' })).toEqual(none);
  });

  it('returns no source under knowdesign even when a kind is configured', () => {
    const env = { OD_WORKSPACE_CONTEXT_SOURCE: 'vela', OD_BUILD_PROFILE: 'knowdesign' };
    expect(workspaceContextSource(env)).toBeNull();
    expect(workspaceContextSourceCapabilities(env)).toEqual({
      directoryAuthority: false,
      hubEvents: false,
    });
  });

  it('lets a registered third kind decide capabilities; inert against the default registry', () => {
    const { source } = acmeSource({ capabilities: { directoryAuthority: true, hubEvents: false } });
    const registry: WorkspaceContextSourceRegistry = { acme: source };
    const env = { OD_WORKSPACE_CONTEXT_SOURCE: 'acme' };
    expect(workspaceContextSourceCapabilities(env, registry)).toEqual({
      directoryAuthority: true,
      hubEvents: false,
    });
    expect(workspaceContextSourceCapabilities(env)).toEqual({
      directoryAuthority: false,
      hubEvents: false,
    });
  });
});

describe('workspace context source dispatch', () => {
  const env = { OD_WORKSPACE_CONTEXT_SOURCE: 'acme' };

  it('dispatches the directory fetch to the third provider, never Vela', async () => {
    const { source } = acmeSource();
    const result = await fetchWorkspaceDirectoryFromSource(
      { configuredEnv: { A: 'b' } },
      env,
      { acme: source },
    );
    expect(result).toEqual({ ok: true, items: [] });
    expect(source.fetchDirectory).toHaveBeenCalledWith({ configuredEnv: { A: 'b' } });
    expectVelaUntouched();
  });

  it('answers an empty directory for a registered source without directory authority', async () => {
    const { source } = acmeSource({ capabilities: { directoryAuthority: false, hubEvents: false } });
    await expect(
      fetchWorkspaceDirectoryFromSource({}, env, { acme: source }),
    ).resolves.toEqual({ ok: true, items: [] });
    expect(source.fetchDirectory).not.toHaveBeenCalled();
    expectVelaUntouched();
  });

  it('keeps the historical Vela directory read for unregistered kinds and vela', async () => {
    await fetchWorkspaceDirectoryFromSource({}, { OD_WORKSPACE_CONTEXT_SOURCE: 'dev' });
    await fetchWorkspaceDirectoryFromSource({}, { OD_WORKSPACE_CONTEXT_SOURCE: 'vela' });
    expect(fetchVelaWorkspaceDirectory).toHaveBeenCalledTimes(2);
  });

  it('reads no directory at all under the knowdesign profile, whatever the kind', async () => {
    const { source } = acmeSource();
    for (const kind of ['vela', 'dev', '', 'acme']) {
      await expect(
        fetchWorkspaceDirectoryFromSource(
          {},
          { OD_BUILD_PROFILE: 'knowdesign', OD_WORKSPACE_CONTEXT_SOURCE: kind },
          { acme: source },
        ),
      ).resolves.toEqual({ ok: true, items: [] });
    }
    expect(source.fetchDirectory).not.toHaveBeenCalled();
    expectVelaUntouched();
  });

  it('dispatches the hub endpoint to the third provider, never Vela', () => {
    const endpoint = { url: 'https://acme.example/hub' } as never;
    const { source } = acmeSource({ resolveHubEventsEndpoint: vi.fn(() => endpoint) });
    const selected = workspaceContextSource(env, { acme: source });
    expect(selected?.resolveHubEventsEndpoint('ws-1', env, {})).toBe(endpoint);
    expect(source.resolveHubEventsEndpoint).toHaveBeenCalledWith('ws-1', env, {});
    expectVelaUntouched();
  });

  it('builds the context provider from the third provider, never Vela', () => {
    const { source, acmeProvider } = acmeSource();
    const options = { configuredEnv: { A: 'b' } };
    expect(createWorkspaceContextProviderFromEnv(env, options, { acme: source })).toBe(acmeProvider);
    expect(source.createContextProvider).toHaveBeenCalledWith(options);
    expectVelaUntouched();
  });

  it('routes vela through the Vela implementation and dev/unset to the dev stub', () => {
    createWorkspaceContextProviderFromEnv({ OD_WORKSPACE_CONTEXT_SOURCE: 'vela' });
    expect(createVelaWorkspaceContextProvider).toHaveBeenCalledTimes(1);
    const dev = createWorkspaceContextProviderFromEnv({});
    expect(createVelaWorkspaceContextProvider).toHaveBeenCalledTimes(1);
    expect(dev).toBeDefined();
  });

  it('builds the sync digest request through the selected provider, never Vela', async () => {
    const readSession = vi.fn(() => {
      throw new Error('vela session must not be read');
    });
    const digest = {
      catalogToken: 'c',
      membersToken: 'm',
      contextToken: 'x',
      billingToken: '',
    };
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(digest), { status: 200 }));
    const { source } = acmeSource();
    const reading = await createSyncDigestReader({
      env,
      getWorkspaceId: () => ' ws-1 ',
      fetchImpl: fetchImpl as never,
      readSession: readSession as never,
      sourceRegistry: { acme: source },
    })();
    expect(reading).toEqual({ accountId: 'acme-user', workspaceId: 'ws-1', digest });
    expect(source.syncDigestRequest).toHaveBeenCalledWith(
      expect.objectContaining({ env, workspaceId: 'ws-1' }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://acme.example/digest',
      expect.objectContaining({ headers: { authorization: 'Bearer acme' } }),
    );
  });
});
