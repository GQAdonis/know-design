import { describe, expect, it } from 'vitest';

import {
  buildInviteDeeplink,
  parseInviteDeeplink,
} from '../src/api/workspace-invites';

const payload = { workspaceId: 'w', memberId: 'm', inviteId: 'i', nonce: 'n' };

describe('invite deeplink scheme parameter', () => {
  it('defaults to the Open Design scheme', () => {
    const url = buildInviteDeeplink(payload);
    expect(url.startsWith('opendesign://workspace/invite/continue?')).toBe(true);
    expect(parseInviteDeeplink(url)).toEqual(payload);
  });

  it('builds and parses a link for another brand scheme', () => {
    const url = buildInviteDeeplink(payload, 'knowdesign');
    expect(url.startsWith('knowdesign://workspace/invite/continue?')).toBe(true);
    expect(parseInviteDeeplink(url, 'knowdesign')).toEqual(payload);
  });

  it('rejects the other brand scheme in both directions', () => {
    expect(parseInviteDeeplink(buildInviteDeeplink(payload), 'knowdesign')).toBeNull();
    expect(parseInviteDeeplink(buildInviteDeeplink(payload, 'knowdesign'))).toBeNull();
  });
});
