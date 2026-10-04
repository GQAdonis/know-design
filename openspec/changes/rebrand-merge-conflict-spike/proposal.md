## Why

The KnowDesign program must rebrand and remove upstream hosted features while continuing to consume `nexu-io/open-design` via `git merge upstream/main`. Research says a committed mass rename conflicts on every sync and recommends a stub-swap seam plus a re-runnable codemod, but that is **inferred, not measured**. This spike measures it before ~20 later changes depend on it.

## What Changes

Nothing lands on `main`. On a throwaway worktree/branch: apply a prototype of (a) a build-profile stub for the billing surface and (b) a brand-string codemod over a representative slice, commit it as one commit on an older `upstream/main` base, merge `upstream/main` forward, and count conflicts. Produce a GO/NO-GO report.

## Non-goals

- No production code is kept; branch and worktree are deleted.
- No push of any spike ref.
- Not a full billing removal or full rename.

## Impact

Decides whether changes 1–5 and 19–22 of the child plan proceed as written (GO) or are re-planned onto a regenerated-branch / Vela-shim strategy (NO-GO).
