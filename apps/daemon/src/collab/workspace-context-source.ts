import { isKnowdesignProfile } from '../runtimes/build-profile.js';
import type { HubEventsEndpoint } from './hub-events-subscriber.js';
import type { VelaControlApiContext } from '../integrations/vela.js';
import { velaWorkspaceContextSource } from './vela-workspace-context-source.js';
import {
  createDevWorkspaceContextProvider,
  type WorkspaceContextProvider,
} from './workspace-context.js';
import type {
  VelaWorkspaceContextOptions,
  WorkspaceDirectoryFetchResult,
} from './vela-workspace-context.js';

/**
 * Provider-kind selector for the workspace-context source.
 *
 * `OD_WORKSPACE_CONTEXT_SOURCE` names the provider kind. The registry maps a
 * kind to a `WorkspaceContextSource`: its capabilities AND the implementations
 * behind them. Call sites dispatch through the selected source and never
 * import a backend's functions for these purposes, so a new source is one
 * additive file plus one registry entry.
 */
export interface WorkspaceContextSourceCapabilities {
  /** The source supplies a workspace directory the daemon must verify against. */
  readonly directoryAuthority: boolean;
  /** The source has a hub-events endpoint the daemon can subscribe to. */
  readonly hubEvents: boolean;
}

/** A request for the cheap "did anything change?" probe, ready to send. */
export interface WorkspaceSyncDigestRequest {
  /** Account half of the snapshot key. Never empty. */
  readonly accountId: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
}

export interface WorkspaceContextSource {
  readonly capabilities: WorkspaceContextSourceCapabilities;
  /** Read the workspace directory (call sites gate on `directoryAuthority`). */
  fetchDirectory(options: {
    configuredEnv?: Record<string, string>;
  }): Promise<WorkspaceDirectoryFetchResult>;
  /** Resolve the hub-events endpoint (call sites gate on `hubEvents`). */
  resolveHubEventsEndpoint(
    workspaceId: string,
    env: NodeJS.ProcessEnv,
    configuredEnv: Record<string, string>,
  ): HubEventsEndpoint | null;
  /** Build the sync-digest request (call sites gate on `hubEvents`); null when unauthenticated. */
  syncDigestRequest(input: {
    env: NodeJS.ProcessEnv;
    workspaceId: string;
    /** Injectable session read for tests. */
    readSession?: ((env: NodeJS.ProcessEnv) => VelaControlApiContext | null) | undefined;
  }): WorkspaceSyncDigestRequest | null;
  /** Construct the workspace-context provider backed by this source. */
  createContextProvider(
    options: Pick<
      VelaWorkspaceContextOptions,
      | 'configuredEnv'
      | 'fetchWorkspaceDirectory'
      | 'getActiveWorkspaceId'
      | 'replaceLocalSelection'
    >,
  ): WorkspaceContextProvider;
}

export type WorkspaceContextSourceRegistry = Readonly<
  Record<string, WorkspaceContextSource>
>;

/** Every kind without a registry entry (including `dev`) resolves to this. */
export const DEFAULT_WORKSPACE_CONTEXT_SOURCE_CAPABILITIES: WorkspaceContextSourceCapabilities =
  { directoryAuthority: false, hubEvents: false };

export const WORKSPACE_CONTEXT_SOURCE_REGISTRY: WorkspaceContextSourceRegistry = {
  vela: velaWorkspaceContextSource,
};

export function resolveWorkspaceContextSourceKind(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.OD_WORKSPACE_CONTEXT_SOURCE?.trim() ?? '';
}

function registeredSource(
  env: NodeJS.ProcessEnv,
  registry: WorkspaceContextSourceRegistry,
): WorkspaceContextSource | null {
  const kind = resolveWorkspaceContextSourceKind(env);
  return Object.hasOwn(registry, kind) ? registry[kind]! : null;
}

/**
 * The selected source, or null (dev / unset / unknown kind). knowdesign has no
 * external backend: a leftover OD_WORKSPACE_CONTEXT_SOURCE must not revive one.
 */
export function workspaceContextSource(
  env: NodeJS.ProcessEnv = process.env,
  registry: WorkspaceContextSourceRegistry = WORKSPACE_CONTEXT_SOURCE_REGISTRY,
): WorkspaceContextSource | null {
  if (isKnowdesignProfile(env)) return null;
  return registeredSource(env, registry);
}

export function workspaceContextSourceCapabilities(
  env: NodeJS.ProcessEnv = process.env,
  registry: WorkspaceContextSourceRegistry = WORKSPACE_CONTEXT_SOURCE_REGISTRY,
): WorkspaceContextSourceCapabilities {
  return workspaceContextSource(env, registry)?.capabilities
    ?? DEFAULT_WORKSPACE_CONTEXT_SOURCE_CAPABILITIES;
}

/**
 * Select the workspace-context provider for this run. A registered kind builds
 * its backed provider; every other value keeps the dev stub, so demo and
 * tools-dev runs — which have no backend and drive the context via the dev
 * PUT — are unaffected. Under knowdesign the dev stub is always used.
 */
export function createWorkspaceContextProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  options: Parameters<WorkspaceContextSource['createContextProvider']>[0] = {},
  registry: WorkspaceContextSourceRegistry = WORKSPACE_CONTEXT_SOURCE_REGISTRY,
): WorkspaceContextProvider {
  // knowdesign has no external backend: a leftover OD_WORKSPACE_CONTEXT_SOURCE must not construct one.
  const source = workspaceContextSource(env, registry);
  return source ? source.createContextProvider(options) : createDevWorkspaceContextProvider();
}

/**
 * Read the workspace directory through the selected source.
 *
 * - registered source with `directoryAuthority`: its own implementation;
 * - registered source without one: an authoritative empty directory (never
 *   another backend's);
 * - knowdesign: an authoritative empty directory, whatever the configured kind;
 * - no registered kind (dev / unset / unknown): the historical behaviour of
 *   asking the Vela implementation, which answers an empty directory when no
 *   Vela session exists.
 */
export function fetchWorkspaceDirectoryFromSource(
  options: { configuredEnv?: Record<string, string> },
  env: NodeJS.ProcessEnv = process.env,
  registry: WorkspaceContextSourceRegistry = WORKSPACE_CONTEXT_SOURCE_REGISTRY,
): Promise<WorkspaceDirectoryFetchResult> {
  // knowdesign has no cloud workspace directory: nothing to ask any backend for.
  if (isKnowdesignProfile(env)) return Promise.resolve({ ok: true, items: [] });
  const source = workspaceContextSource(env, registry);
  if (!source) return velaWorkspaceContextSource.fetchDirectory(options);
  if (!source.capabilities.directoryAuthority) {
    return Promise.resolve({ ok: true, items: [] });
  }
  return source.fetchDirectory(options);
}
