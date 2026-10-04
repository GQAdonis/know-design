import { describe, expect, it } from 'vitest';
import { parseWorkspaceCollabContext } from '../src/collab/workspace-context.js';
import { getBuildProfile } from '../src/runtimes/build-profile.js';

const lockedPayload = {
  workspaceMemberId: 'member-1',
  workspaceType: 'team',
  role: 'member',
  memberStatus: 'active',
  lifecycleState: 'locked',
};

describe('build profile and workspace context', () => {
  it('resolves the profile from injected env, unknown values to default', () => {
    expect(getBuildProfile({ OD_BUILD_PROFILE: 'knowdesign' })).toBe('knowdesign');
    expect(getBuildProfile({ OD_BUILD_PROFILE: ' KnowDesign ' })).toBe('knowdesign');
    expect(getBuildProfile({ OD_BUILD_PROFILE: 'other' })).toBe('default');
    expect(getBuildProfile({})).toBe('default');
  });

  it('treats a locked workspace as writable under knowdesign', () => {
    const ctx = parseWorkspaceCollabContext(lockedPayload, { OD_BUILD_PROFILE: 'knowdesign' });
    expect(ctx?.lifecycleState).toBe('active');
    expect(ctx?.billingState).toBe('active');
    expect(ctx?.permissions.canWriteSyncedFiles).toBe(true);
    expect(ctx?.permissions.canShareProjects).toBe(true);
  });

  it('keeps a locked workspace read-only with the profile off', () => {
    const ctx = parseWorkspaceCollabContext(lockedPayload, {});
    expect(ctx?.lifecycleState).toBe('locked');
    expect(ctx?.billingState).toBe('locked');
    expect(ctx?.permissions.canWriteSyncedFiles).toBe(false);
    expect(ctx?.permissions.canShareProjects).toBe(false);
  });

  it('keeps a deleted workspace denied under knowdesign', () => {
    const ctx = parseWorkspaceCollabContext(
      { ...lockedPayload, lifecycleState: 'deleted' },
      { OD_BUILD_PROFILE: 'knowdesign' },
    );
    expect(ctx?.lifecycleState).toBe('deleted');
    expect(ctx?.permissions.canWriteSyncedFiles).toBe(false);
    expect(ctx?.permissions.canViewWorkspaceSettings).toBe(false);
  });
});
