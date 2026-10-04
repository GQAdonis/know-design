# Test baseline — deploy-web-to-knowme-k8s › commerce-removal › capture-test-baseline

Measured on clean `main` (no source edits). Environment: `git a80bfeded3bc727c6e57f4c00abb48b28bcf55c3 node v24.21.0 pnpm 10.33.2`, macOS (Apple M1 Max), Node 24.21.0 via nvm (the shell default, Node 26.5.0, is **not** used: `engines.node` is `~24`). Raw logs: `.tmp/baseline/*.log` (gitignored).
Earlier session results for guard, typecheck and web were never persisted, so **everything below was re-measured in this run**, sequentially.

| Command | Exit | Duration | Result |
|---|---|---|---|
| `pnpm -r --filter "./packages/*" build` | 0 | 15s | pass |
| `pnpm guard` | 0 | 26s | pass |
| `pnpm typecheck` | 0 | 63s | pass |
| `pnpm --filter @open-design/web test` | 0 | 756s | Test Files 1250 passed (1250); Tests 12766 passed, 1 expected fail, 11 skipped (12778) |
| `pnpm --filter @open-design/daemon test` | 1 | 5947s | Test Files 33 failed, 879 passed, 3 skipped (915); Tests 44 failed, 11878 passed, 231 skipped (12153) |

## Web: no failures
All web test files pass. This is the clean comparison point.

## Daemon: pre-existing failures (33 files, 44 failing tests, by name)
The daemon suite runs its 915 files **serially** (`fileParallelism: false`) and takes ~99 minutes here (an earlier 540s timeout was a tool limit, not a suite failure). Each failing file was then rerun alone with a 90s cap to classify it. **Compare later changes against the sets below, not against a raw "N failed" count.**

### A. Fail even when run alone (deterministic here: 5 files)
- `tests/acp-stdio-mcp-wiring.test.ts` (isolated rerun: exit 1, 76s)
  - ACP stdio MCP servers are withheld from runtimes that reject them
- `tests/media-minimax-image.test.ts` (isolated rerun: exit 1, 2s)
  - minimax image generation > throws a clear error when no MiniMax API key is configured
- `tests/od-next-intent-startup-server.test.ts` (isolated rerun: exit 1, 13s)
  - recovers saved planning replies before first HTTP hydration without reviving cancellation or starting a successor, while telemetry remains pending
- `tests/runtimes/runtime-version-provenance.test.ts` (isolated rerun: exit 1, 48s)
  - runtime version provenance > remembers the exact detected CLI version for later run telemetry
- `tests/screenshot-export-file-handoff.test.ts` (isolated rerun: exit 1, 52s)
  - screenshot export desktop renderer file handoff

### B. Hang or exceed 90s when run alone (3 files)
- `tests/od-next-automatic-simple-server.test.ts` (isolated rerun: exit 124, 91s)
  - OD Next automatic production through the real server > isolates host CLI probes while retaining real selected Codex detection and preflight
- `tests/run-request-idempotency.test.ts` (isolated rerun: exit 124, 90s)
  - run request idempotency > keeps the request-to-run mapping across a daemon restart
  - run request idempotency > persists the terminal Plugin HTML version origin on the Run
- `tests/run-resume-on-failure.test.ts` (isolated rerun: exit 124, 90s)
  - resume-on-failure runtime > does not resume a provider 404 after a committed tool block

### C. Fail only in the full serial run, pass alone (25 files: order- or load-dependent)
These must not be attributed to a later change unless they ALSO fail in isolation on that change. Re-check any of them alone before blaming a diff.
- `tests/api-token-guard.test.ts` (isolated rerun: exit 0, 42s)
  - bearer middleware > accepts loopback callers without a bearer (desktop UI flow)
  - bearer middleware > keeps health / readiness / version probes open without a bearer
  - bearer middleware > disables bearer middleware when OD_DISABLE_API_AUTH=1 even if OD_API_TOKEN is set
  - browser authentication for non-loopback Docker peers > authenticates the browser without weakening API clients or probes
  - browser authentication for non-loopback Docker peers > keeps the documented Docker browser host separate from powered previews
- `tests/chat-artifacts-run-cover.test.ts` (isolated rerun: exit 0, 16s)
  - run terminal HTML cover wiring
- `tests/claude-sidechain-turn-end-false-success.test.ts` (isolated rerun: exit 0, 13s)
  - claude sub-agent turn_end false success (#5487) > a sub-agent end_turn must not classify a crashed main turn as succeeded
- `tests/cli-startup.test.ts` (isolated rerun: exit 0, 18s)
  - CLI startup boundaries > reconciles a durable running message after a real daemon process restart
- `tests/integrations/vela.routes.test.ts` (isolated rerun: exit 0, 28s)
  - (file-level failure: suite did not load or hook failed)
- `tests/intent-signal-stable-prompt-cache.test.ts` (isolated rerun: exit 0, 23s)
  - intent signals × stable prompt cache > a genuine deck answer costs exactly one miss, then latches back to hits
  - intent signals × stable prompt cache > attributes a mid-conversation memory change to the memory section alone
  - intent signals × stable prompt cache > names no sections on a cache hit
- `tests/marketplace-install-ssrf.test.ts` (isolated rerun: exit 0, 17s)
  - marketplace / plugin-install SSRF > POST /api/plugins/install must NOT fetch a loopback/internal https source
  - marketplace / plugin-install SSRF > the sibling guard (assertSafePublicUrl) already rejects these URLs
- `tests/media/aihubmix-catalog-ssrf.test.ts` (isolated rerun: exit 0, 11s)
  - aihubmix catalogue route SSRF guard > rejects a cross-origin request and issues no upstream fetch
- `tests/media/policy-routes.test.ts` (isolated rerun: exit 0, 50s)
  - run-scoped media policy routes > rejects token-bearing legacy media generation when media execution is disabled
  - run-scoped media policy routes > rejects disallowed surfaces and models on token-bearing legacy media generation
  - run-scoped media policy routes > rejects disallowed surfaces and models on token-gated media generation
- `tests/opencode-session-resume.test.ts` (isolated rerun: exit 0, 55s)
  - opencode native session resume > transparently auto-reseeds within the same turn on `Session not found`
- `tests/plain-stream-artifact-event-truncation.test.ts` (isolated rerun: exit 0, 57s)
  - plain-stream artifact persistence vs run.events ring-buffer truncation (HTTP) > persists an artifact the agent streamed early, even after >2000 later stdout events truncate the ring buffer
  - plain-stream artifact persistence vs run.events ring-buffer truncation (HTTP) > persists an artifact that first appears after a >8 MiB prefix (accumulator cap must fall back to the ring)
- `tests/plugins-headless-run.test.ts` (isolated rerun: exit 0, 32s)
  - (file-level failure: suite did not load or hook failed)
- `tests/project-design-system-copy.test.ts` (isolated rerun: exit 0, 28s)
  - project design-system copy route > duplicates a project without replaying the source pending prompt
  - project design-system copy route > rejects generic duplication for design-system-like projects
- `tests/project-skill-id-validation.test.ts` (isolated rerun: exit 0, 9s)
  - project skillId validation
- `tests/resource-workspace-authority-preflight.test.ts` (isolated rerun: exit 0, 8s)
  - (file-level failure: suite did not load or hook failed)
- `tests/resume-continue-prompt-context.test.ts` (isolated rerun: exit 0, 32s)
  - resume continue prompt context > carries the original request when a headless Continue turn cannot resume the session
  - resume continue prompt context > carries the original request through the transcript on the web Continue shape
- `tests/retry-stale-turn-completed-flag.test.ts` (isolated rerun: exit 0, 10s)
  - same-run retry stale turnCompletedCleanly (review red spec) > a crashed retry attempt is not classified succeeded by the previous attempt’s clean turn
- `tests/routes/handoff.test.ts` (isolated rerun: exit 0, 10s)
  - POST /api/projects/:id/handoff — HTTP layer
- `tests/routes/project-create-rail-scenario-binding.test.ts` (isolated rerun: exit 0, 20s)
  - create-rail scenario binding > stamps an automatic_default binding for every entry on the create rail
- `tests/routes/projects.test.ts` (isolated rerun: exit 0, 19s)
  - GET /api/projects/:id resolvedDir
  - project locations routes
- `tests/run-cross-project-conversation.test.ts` (isolated rerun: exit 0, 56s)
  - run cross-project conversation ownership > a run for project A must not write into a conversation owned by project B
  - run cross-project conversation ownership > POST /api/chat is guarded too: a chat run for project A must not write into project B
  - run cross-project conversation ownership > lets a retry rebind an assistantMessageId the daemon no longer owns
  - run cross-project conversation ownership > rejects an assistantMessageId that belongs to another conversation
  - run cross-project conversation ownership > rejects an assistantMessageId that references a user message
  - run cross-project conversation ownership > rejects a supplied assistantMessageId when no conversation is bound
  - run cross-project conversation ownership > rejects a supplied assistantMessageId when the chat conversation is missing
- `tests/run-event-truncation-artifact-verdict.test.ts` (isolated rerun: exit 0, 18s)
  - run event-buffer truncation vs artifact verdict (HTTP) > a run that wrote an artifact then flooded past the ring buffer, then exited non-zero, is succeeded
- `tests/run-failure-detail-persisted-message.test.ts` (isolated rerun: exit 0, 13s)
  - run failure classification persisted to assistant message > stamps failureCategory/failureDetail onto the stored error event on a hard-quota failure
- `tests/run-failure-stderr-tail-persisted-message.test.ts` (isolated rerun: exit 0, 26s)
  - captured stderr on the persisted run-failure event > carries the captured stderr tail onto the stored error event
  - captured stderr on the persisted run-failure event > adds no stderr field to a failure that produced no stderr
- `tests/runtimes/detection-resilience.test.ts` (isolated rerun: exit 0, 41s)
  - detectAgents isolates a single agent probe throw so the picker still lists every adapter

## How to diff later changes against this baseline
1. Run the package suite with the same Node and command; collect `FAIL` lines.
2. Any failing test not named in A/B/C is new and attributable to the change.
3. A test named in C that fails again: rerun that file alone first; only an isolated failure counts.
4. A and B are environment or pre-existing issues (several look machine-dependent, for example the MiniMax API-key and loopback/probe tests); they are not regressions.
