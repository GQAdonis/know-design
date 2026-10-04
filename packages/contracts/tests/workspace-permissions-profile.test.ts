import { describe, expect, it } from 'vitest';
import {
  buildWorkspacePermissions,
  isWorkspaceLifecycleWritable,
  profileLifecycleState,
} from '../src/api/collab';
import type {
  CollabMemberRole,
  WorkspaceLifecycleState,
  WorkspaceMemberStatus,
} from '../src/api/collab';

const LIFECYCLES: WorkspaceLifecycleState[] = [
  'active',
  'billing_past_due',
  'locked',
  'deleting',
  'deleted',
];
const ROLES: CollabMemberRole[] = ['owner', 'admin', 'member'];
const STATUSES: WorkspaceMemberStatus[] = ['active', 'removed'];

describe('buildWorkspacePermissions build profile', () => {
  it('maps only the billing-derived lifecycle states to active under knowdesign', () => {
    expect(profileLifecycleState('billing_past_due', 'knowdesign')).toBe('active');
    expect(profileLifecycleState('locked', 'knowdesign')).toBe('active');
    expect(profileLifecycleState('active', 'knowdesign')).toBe('active');
    expect(profileLifecycleState('deleting', 'knowdesign')).toBe('deleting');
    expect(profileLifecycleState('deleted', 'knowdesign')).toBe('deleted');
    for (const state of LIFECYCLES) {
      expect(profileLifecycleState(state, 'default')).toBe(state);
      expect(profileLifecycleState(state, undefined)).toBe(state);
    }
  });

  it('grants write for every billing lifecycle state and role under knowdesign', () => {
    for (const lifecycleState of ['active', 'billing_past_due', 'locked'] as const) {
      for (const role of ROLES) {
        const p = buildWorkspacePermissions({
          role,
          lifecycleState,
          memberStatus: 'active',
          profile: 'knowdesign',
        });
        expect(p.canWriteSyncedFiles, `${lifecycleState}/${role}`).toBe(true);
        expect(p.canShareProjects, `${lifecycleState}/${role}`).toBe(true);
        expect(p.canViewWorkspaceSettings).toBe(true);
        expect(p.canManageMembers).toBe(role !== 'member');
        expect(p.canManageBilling).toBe(role === 'owner');
      }
    }
  });

  it('keeps deleting and deleted workspaces denied under knowdesign', () => {
    for (const role of ROLES) {
      for (const lifecycleState of ['deleting', 'deleted'] as const) {
        const p = buildWorkspacePermissions({
          role,
          lifecycleState,
          memberStatus: 'active',
          profile: 'knowdesign',
        });
        expect(p.canWriteSyncedFiles, `${lifecycleState}/${role}`).toBe(false);
        expect(p.canShareProjects, `${lifecycleState}/${role}`).toBe(false);
        expect(p.canManageMembers).toBe(false);
      }
      const deleted = buildWorkspacePermissions({
        role,
        lifecycleState: 'deleted',
        memberStatus: 'active',
        profile: 'knowdesign',
      });
      expect(deleted.canViewWorkspaceSettings).toBe(false);
      expect(deleted.canManageBilling).toBe(false);
    }
  });

  it('still denies a removed member under knowdesign', () => {
    for (const lifecycleState of LIFECYCLES) {
      const p = buildWorkspacePermissions({
        role: 'owner',
        lifecycleState,
        memberStatus: 'removed',
        profile: 'knowdesign',
      });
      expect(p.canWriteSyncedFiles).toBe(false);
      expect(p.canShareProjects).toBe(false);
    }
  });

  it('is identical to the old behaviour when the profile is omitted or default', () => {
    for (const lifecycleState of LIFECYCLES) {
      for (const role of ROLES) {
        for (const memberStatus of STATUSES) {
          const base = buildWorkspacePermissions({ role, lifecycleState, memberStatus });
          expect(
            buildWorkspacePermissions({ role, lifecycleState, memberStatus, profile: 'default' }),
          ).toEqual(base);
          const writable =
            memberStatus === 'active' && isWorkspaceLifecycleWritable(lifecycleState);
          expect(base.canWriteSyncedFiles).toBe(writable);
          expect(base.canShareProjects).toBe(writable);
        }
      }
    }
  });
});
