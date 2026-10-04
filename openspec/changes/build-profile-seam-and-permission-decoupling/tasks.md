## 1. Seam

- [ ] 1.1 Add `apps/daemon/src/runtimes/build-profile.ts` (`getBuildProfile(env)`, `isKnowdesignProfile(env)`) reusing `isTruthyEnvFlag`-style parsing.
- [ ] 1.2 Add `BuildProfile` type and a profile-aware optional parameter to `buildWorkspacePermissions` in `packages/contracts/src/api/collab.ts` (pure TypeScript).

## 2. Decouple

- [ ] 2.1 Normalise lifecycle, billing and seat inputs in daemon `workspace-context.ts`, daemon `vela-workspace-context.ts` and web `useWorkspaceContext.ts`.
- [ ] 2.2 Override Vela-supplied permissions and the direct lifecycleState gates (server.ts, collab helpers, web `collab-session.ts`) under the profile.
- [ ] 2.3 Expose the profile on the daemon health response for web.

## 3. Tests

- [ ] 3.1 New tests: contracts permissions under the profile for every lifecycle state, role and memberStatus; daemon mapper with `lifecycleState: 'locked'`; profile-off parity.
