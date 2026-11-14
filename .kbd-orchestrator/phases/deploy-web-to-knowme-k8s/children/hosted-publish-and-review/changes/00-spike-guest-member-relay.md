# Change 00 finding: can the relay receive comments from non-workspace guest authors?

Read-only. 2026-10-19. Code: `apps/daemon/src/collab/collab-cloud-service.ts`, `routes/project/comments.ts`, `server.ts` (~4413-4535), `db.ts` (`mergeSyncedPreviewComment`, ~4294), `integrations/collab-cloud.ts`, `packages/contracts/src/api/collab.ts`.

## Answer

**The merge is author-agnostic, but the poller will never run for a solo author.** Guests can be re-homed with no change to the merge. The work is in who polls and who is allowed to relay.

## What works as-is
- `mergeSyncedPreviewComment` stores `author_member_id = comment.memberId` verbatim and dedups by comment id. It never checks the member directory, so a hub-minted guest id merges fine.
- Wire fields already carry selector, label, htmlHint, position, status, tombstones and `seq`, so anchor comments from the reviewer page need no new fields.
- `pin_seq` is taken from the wire `seq`, so hub-assigned seq is authoritative (matches plan change 04).

## What blocks a personal-project author (all need change 08)
1. **Poll gate.** `pollOnce` iterates open projects, then calls `resolveBoundProjectWorkspaceContext`. That needs a workspace binding and an active *team* membership in the workspace directory; otherwise it returns null and the project is skipped (`if (!context || !identity) continue`). A knowdesign desktop user has neither. Needs a second poll source: projects with a publication record, using a publish-scoped identity.
2. **Scope key.** Team id comes from `explicitTeamIdentity(context)`. For publications the hub should use a stable scope (e.g. the publication or author id) as `teamId`; the hub is free to define it since it owns the server (D3).
3. **Conversation precondition.** `pollProject` returns early when `getProjectCommentAnchorConversationId` is null (no local chat yet). A published project may have none; guest comments would wait silently. Decide: create an anchor conversation on publish, or relax the precondition for published projects.
4. **Single global client.** One client from `OD_COLLAB_CLOUD_URL`/`OD_COLLAB_CLOUD_TOKEN`. Hub auth must work with the author's publish credential; per-publication auth is a hub concern, not a daemon one.
5. **Outbound (replies, resolve, delete).** `isLocalTeamRelayCandidate` (comments.ts:303, used at 454/567/722) is false unless the workspace is a team and the binding visibility is `team`. Author replies and status changes on published projects will not be pushed. Extend eligibility to "has an active publication".
6. **Member display.** `GET /teams/:t/members` is how author names resolve. The hub can register guests itself, but `CollabMemberRole` is the existing enum; "commenter/guest" is not a role. Prefer mapping guests to `member` and carrying "guest" in `displayName`, avoiding a contract change in an upstream-owned file. The enum is `'owner' | 'admin' | 'member'` (`collab.ts:18`), so no contract change is needed.
7. **Permissions.** `callerMayMutate` lets the comment author or project owner mutate. Guests never call the daemon, so no change; just don't give guest ids a daemon-side identity.

## Decisions this confirms
- **D7 holds** (extend relay eligibility to published projects), with one revision: guests are role `member` plus a "guest" display marker, not `role: commenter`.
- No change to `mergeSyncedPreviewComment` is needed.

## Feeds
- Change 01: scope key and guest-as-member convention go into the OpenAPI contract and threat list.
- Change 06: persist publications in SQLite so the poller can enumerate them.
- Change 08: three code changes (poll source, anchor conversation, outbound eligibility).
- Change 04: hub registers guests via its own member store; seq is hub-assigned.

## Not verified
- Behaviour of the outbox with `callbackConfigured` true but no team context (read, not run).
