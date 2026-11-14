# D1 outcome: adversarial review of "TS in monorepo vs Rust in its own repo"

- **Date**: 2026-10-17 · **Judge**: MiniMax-M3 via the liter-llm gateway (`rest-gateway:http://localhost:4000/v1`) · **Producer**: claude-sonnet-5-5 · **cross_model_check**: `verified-distinct` · decision gate PASS · sycophancy screen PASS (score 0.018).
- **Verdict**: BLOCK (3 CRITICAL, 5 WARNING, 2 SUGGESTION). Raw: `findings.json`.
- **Run notes**: two local setup gaps had to be worked around for this run only, neither by weakening the check.
  1. `dispatch-judge.sh` locates its resolver through `CLAUDE_PLUGIN_ROOT`; unset, no identities load and it refuses as `JUDGE_MODEL_COLLISION`.
  2. `~/.prometheus/kbd/models.toml` has judge == critic == MiniMax-M3 (its comment says "judge == critic is intended") but the script treats that as a collision when no backup is configured. A scratch copy with `critic = gpt-6.1-sol` was used via `PROMETHEUS_KBD_MODELS_CONFIG`; the user's file was not modified.

## Findings tested against the repo

| Finding | Test | Result |
|---|---|---|
| Monorepo adds merge friction (workspace, lockfile, CI) | `pnpm-workspace.yaml` already globs `apps/*`; `constraints.md:47` requires a Nix pnpm deps-hash refresh on every `pnpm-lock.yaml` change; 16 upstream merges have touched the lockfile | **Partly right.** No workspace-file edit needed (judge wrong on that), but every hub dependency adds lockfile and Nix-hash churn on each upstream sync. My "near-zero" claim was wrong. |
| Type sharing is the pro-TS argument; test the generated-types alternative | Contract DTOs are plain TS interfaces (`CollabCloudComment` at `contracts/src/api/collab.ts:1157`), not a schema; zod appears in 12 contract files but does not define these DTOs | **Right that the advantage is smaller than I claimed.** Either language needs a contract artifact once the hub leaves the monorepo; the 1144-line fake hub is HTTP-level so it can drive a language-agnostic conformance suite. |
| Assumption 4 (language does not change serving-untrusted-content safety) is dismissive | Logic-level risks (path traversal, authz on slugs, CSP/origin isolation, XSS in comments) are identical in both languages; memory-safety and parser-class risks differ | **Fair.** Needs a threat enumeration in the plan, not a dismissal. Rust's advantage is real but modest for this service. |
| Assumption 3 (operator equally fluent) is unsupported | The platform (gate, forge, fabric, sso-broker) is Rust and the operator's | **Right.** Cannot be verified from here; the evidence points toward Rust maintenance. |
| Falsifier thresholds and the unrun cheap spikes | My ">3 deps" number has no basis; an honest TS hub needs a framework, `pg`, a validator, and probably a rate limiter | **Right.** Dependency count is not a real differentiator (a Rust hub has a similar crate count); drop it as a falsifier. |
| False binary | "Extend the daemon" is wrong (the hub is a cloud service, the daemon is local). "TS in its own repo" is a real third option. | **Right on the third option.** I conflated *where it lives* with *what language*. |

## Conclusion

TypeScript-in-monorepo **does not remain the top choice**. The two questions separate:

- **Home: its own repository.** Independent release cadence and deploy pipeline from the desktop client; no lockfile/Nix churn in the fork; matches how the other platform services are built and shipped.
- **Language: Rust (axum).** With the type-sharing advantage gone, the remaining factors favor Rust: it matches the platform and its deploy pattern, the operator's maintenance base, and the review's point about internet-facing code that serves untrusted content. TypeScript's remaining advantage is iteration speed and a shared toolchain with the reviewer page, which is a small static bundle either way.

Contract strategy for a Rust hub: an OpenAPI document plus JSON Schema in the hub repo is the source of truth; the existing TS `CollabCloud*` interfaces stay as the daemon's view; a conformance suite (adapted from `fake-collab-hub.ts`) runs over HTTP against whichever server is under test and is the drift detector.

## Residual risks accepted

- Cost of being wrong: reversing Rust → TS later means rebuilding about 12 endpoints against an unchanged contract and conformance suite; the contract and suite are the durable assets, which is why they come first (change 01).
- Contract mirroring (about 25 fields in `CollabCloudComment`) is hand-maintained on the Rust side and guarded by the conformance suite, not by types.
- Anonymous commenting and untrusted HTML are an abuse target. Abuse traffic is separated from human traffic in the plan (limits, size caps, expiry, takedown) and is language-independent.
