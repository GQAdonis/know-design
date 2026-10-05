## Why

Every later change in this phase edits daemon or web source. The parent phase recorded the daemon test baseline as UNKNOWN (a 540s timeout). Without a recorded baseline, failures cannot be attributed to a change.

## What Changes

Run `pnpm guard`, `pnpm typecheck`, the daemon package tests and the web package tests on the current tree, record duration and counts, and list pre-existing failures by name in `baseline.md`. No source changes.

## Non-goals

Fixing any pre-existing failure. Running e2e or Playwright suites (separate, heavier lane).

## Impact

Later changes diff their results against `baseline.md`.
