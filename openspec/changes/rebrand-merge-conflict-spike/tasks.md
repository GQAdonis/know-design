## 1. Spike setup

- [x] 1.1 Create a throwaway worktree at a scratch path on a new local branch `spike/rebrand-merge-30` based on `upstream/main~30` (about 9 days of upstream); record the base SHA and the commits-ahead count to `upstream/main`.
- [x] 1.2 Confirm `pnpm install` succeeds in the worktree (frozen lockfile) so `pnpm guard`/`pnpm typecheck` can run there.

## 2. Prototype the layer

- [x] 2.1 Prototype the build-profile stub for the billing surface (daemon billing/wallet modules and the web balance gate) using aliasing/conditional registration, with no file deletions. Record exactly which mechanism was used and which files were touched.
- [x] 2.2 Prototype the brand codemod over a representative slice (display strings, i18n values, README, tools/pack app identity) with an allowlist and an idempotency check (second run produces no diff). Record files touched.
- [x] 2.3 Commit both as ONE commit on the spike branch.

## 3. Measure

- [x] 3.1 `git merge upstream/main` into the spike branch with `rerere` enabled; record conflict count, conflicted file list, and whether any are modify/delete.
- [x] 3.2 Resolve by the proposed policy (prefer upstream, re-run codemod); record residual manual-resolution effort.
- [x] 3.3 Repeat 1.1–3.2 on a base of `upstream/main~100` to stress-test; record the same metrics.
- [x] 3.4 Run `pnpm guard` and `pnpm typecheck` on the merged prototype; record pass/fail and whether aliasing violated any boundary rule.

## 4. Report and cleanup

- [x] 4.1 Write the spike report (conflicts per base, hotspot files, guard/typecheck result, GO/NO-GO with rationale and fallback if NO-GO) to the child phase directory.
- [x] 4.2 Delete the spike branches and worktree; verify `git branch` and `git worktree list` show neither and that `main` is untouched.
