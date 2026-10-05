import { readVelaControlApiContext } from '../integrations/vela.js';
import {
  createVelaWorkspaceContextProvider,
  fetchVelaWorkspaceDirectory,
  resolveVelaWorkspaceHubEventsEndpoint,
} from './vela-workspace-context.js';
import type { WorkspaceContextSource } from './workspace-context-source.js';

/** The Vela implementation of the workspace-context source. */
export const velaWorkspaceContextSource: WorkspaceContextSource = {
  capabilities: { directoryAuthority: true, hubEvents: true },
  fetchDirectory: (options) => fetchVelaWorkspaceDirectory(options),
  resolveHubEventsEndpoint: (workspaceId, env, configuredEnv) =>
    resolveVelaWorkspaceHubEventsEndpoint(workspaceId, env, configuredEnv),
  syncDigestRequest: ({ env, workspaceId, readSession = readVelaControlApiContext }) => {
    const session = readSession(env);
    if (!session?.controlKey || !session.apiUrl) return null;
    const accountId = session.user?.id?.trim() ?? '';
    // No account or no workspace means no safe cache key. Reporting null keeps
    // the caller on a real fetch instead of letting it invent a shared key.
    if (!accountId || !workspaceId) return null;
    return {
      accountId,
      url: new URL('/api/v1/collab/sync-digest', session.apiUrl).toString(),
      headers: {
        authorization: `Bearer ${session.controlKey}`,
        'x-vela-workspace-id': workspaceId,
        accept: 'application/json',
      },
    };
  },
  createContextProvider: (options) => createVelaWorkspaceContextProvider(options),
};
