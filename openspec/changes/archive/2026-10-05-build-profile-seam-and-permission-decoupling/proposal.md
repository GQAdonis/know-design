## Why

KnowDesign removes billing, AMR login and cloud services. Workspace write authority is currently derived from billing lifecycle (`buildWorkspacePermissions`: `writable = memberStatus==='active' && lifecycleState==='active'`). Removing billing without decoupling this would leave workspaces permanently non-writable. Every later change in this phase also needs one switch that selects the KnowDesign behaviour.

## What Changes

- Add `OD_BUILD_PROFILE=knowdesign` read through an injectable-env helper (`apps/daemon/src/runtimes/build-profile.ts`). Unknown values mean the default profile. Explicit profile checks, not bundler or TS aliasing (spike amendment, D-007, D-014c).
- Under the profile, normalise lifecycle and billing state to `active` and supply sane seat and provider defaults at the mapper entry points (daemon `parseWorkspaceCollabContext`, daemon Vela mappers, web `workspaceContextFromDirectoryItem`), and override Vela-supplied permissions.
- `packages/contracts` stays pure: a `BuildProfile` type and an optional pure parameter on `buildWorkspacePermissions`; the profile-off branch is the existing code unchanged.
- Expose the active profile on the daemon health response so web can read it.

## Non-goals

Removing AMR, billing UI, telemetry or Vela media (later changes). Dropping the `amr` registry entry is change 2.

## Impact

Profile off must be byte-identical to `main`; the existing daemon, web and contracts suites are the proof, compared against `baseline.md` by name.
