/**
 * Provider-kind selector for the workspace-context source.
 *
 * `OD_WORKSPACE_CONTEXT_SOURCE` names the provider kind. Call sites ask this
 * module what the selected kind can do instead of comparing the env value to a
 * literal, so a new source needs only an additive registry entry.
 */
export interface WorkspaceContextSourceCapabilities {
  /** The source supplies a workspace directory the daemon must verify against. */
  readonly directoryAuthority: boolean;
  /** The source has a hub-events endpoint the daemon can subscribe to. */
  readonly hubEvents: boolean;
}

export type WorkspaceContextSourceRegistry = Readonly<
  Record<string, WorkspaceContextSourceCapabilities>
>;

/** Every kind without a registry entry (including `dev`) resolves to this. */
export const DEFAULT_WORKSPACE_CONTEXT_SOURCE_CAPABILITIES: WorkspaceContextSourceCapabilities =
  { directoryAuthority: false, hubEvents: false };

export const WORKSPACE_CONTEXT_SOURCE_REGISTRY: WorkspaceContextSourceRegistry = {
  vela: { directoryAuthority: true, hubEvents: true },
};

export function resolveWorkspaceContextSourceKind(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.OD_WORKSPACE_CONTEXT_SOURCE?.trim() ?? '';
}

export function workspaceContextSourceCapabilities(
  env: NodeJS.ProcessEnv = process.env,
  registry: WorkspaceContextSourceRegistry = WORKSPACE_CONTEXT_SOURCE_REGISTRY,
): WorkspaceContextSourceCapabilities {
  const kind = resolveWorkspaceContextSourceKind(env);
  return Object.hasOwn(registry, kind)
    ? registry[kind]!
    : DEFAULT_WORKSPACE_CONTEXT_SOURCE_CAPABILITIES;
}
