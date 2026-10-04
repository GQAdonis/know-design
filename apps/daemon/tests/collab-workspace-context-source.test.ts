import { describe, expect, it } from 'vitest';
import {
  workspaceContextSourceCapabilities,
  type WorkspaceContextSourceRegistry,
} from '../src/collab/workspace-context-source.js';

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

  it('lets a registered third provider kind decide behaviour without touching call sites', () => {
    const registry: WorkspaceContextSourceRegistry = {
      vela: { directoryAuthority: true, hubEvents: true },
      acme: { directoryAuthority: true, hubEvents: false },
    };
    const env = { OD_WORKSPACE_CONTEXT_SOURCE: 'acme' };
    expect(workspaceContextSourceCapabilities(env, registry)).toEqual({
      directoryAuthority: true,
      hubEvents: false,
    });
    // The same kind is inert against the default registry.
    expect(workspaceContextSourceCapabilities(env)).toEqual({
      directoryAuthority: false,
      hubEvents: false,
    });
  });
});
