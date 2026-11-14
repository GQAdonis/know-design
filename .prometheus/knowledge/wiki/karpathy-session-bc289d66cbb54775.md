---
type: SessionRecord
id: karpathy-session-bc289d66cbb54775
title: Karpathy session bc289d66cbb5
tags:
- karpathy
- session-learning
sources:
- resource: session:5acda4f9-cfd5-4403-9e0e-2693531a3f4a
generated:
  by: pk/1.11.0
  at: 2026-11-14T13:25:57.658171+00:00
created_at: 2026-11-14T13:25:57.658171+00:00
updated_at: 2026-11-14T13:25:57.658171+00:00
revision: 0
---

## Delta

I haven't changed anything yet. Here is what change 02 involves, based on the phase plan, the hub repo's contract (`docs/contract/openapi.yaml`), its threat model and its conformance tests.

## Where things stand
- Change 00 (spike on the guest-comment relay) and change 01 (hub contract) are done.
- The hub repo `Know-Me-Tools/know-design-hub` already exists on GitHub and locally at `~/Projects/know-design-hub`. It holds the contract, the threat model, a test suite any implementation must pass, and its own copy of the project scaffolding. There's no service code yet.
- The plan pairs change 02 with change 06 (the client in our daemon that talks to the hub), and the two can run in parallel. 02 is the server; 06 is the client in this repo.

## What change 02 builds
A new Rust (axum) service in the hub repo, for the publish side only:

1. **Author API**, called by our daemon with a bearer token:
   - `GET /v1/me` returns the author's id and limits.
   - Publish flow: create a draft (`POST /v1/publications`), upload each file as raw bytes (`PUT …/files/{path}`), then `finalize`. Finalize checks the uploaded files against a manifest and makes the publication live.
   - List and get publications, change the expiry (1–90 days), and revoke (`DELETE`, safe to repeat).
2. **Public link metadata**: `GET /v1/public/{slug}` points the reviewer page at the snapshot site.
3. **Snapshot site** (`snap.` host): serves the author's HTML with a sandbox security policy so their scripts can't reach anything else, never uses cookies, and disables caching so a revoked link stops working on the very next request.
4. **Safety rules from the threat model**, each with an existing test:
   - Slugs are random and at least 128 bits.
   - Unknown, revoked, expired and draft links all return the same 404.
   - One path checker for both upload and serve, which rejects tricky paths rather than "fixing" them.
   - File-size and file-count caps apply while the upload is streaming in.
   - An author can only see or touch their own publications.
5. **File storage** behind a `SnapshotStore` interface, on local disk for now. Publication records live in an in-memory store; the Postgres version is change 03.
6. **CI and container image**, copying the `images.yaml` pattern from `flint-core-infra`. Images are referenced by exact digest.

**Not in 02:** guest identities and comments (changes 04/05), the reviewer page (05), the database (03) and deployment (09).

**Done means:** the existing `publish-and-files` and `public-and-snapshot` test suites pass against the running service, plus Rust unit tests, and `cargo check`, `clippy` and `fmt` are clean. The one exception is the test that the reviewer page can't be framed (`public.headers`); it covers the reviewer page itself, which isn't built until change 05.

## Decisions I need from you
1. **How author tokens work in v1.** The contract says "bearer token" but not who issues it. I recommend a hub setting that maps a hash of each token to an author id, loaded from a Kubernetes Secret, with an interface so flint-gate tokens (the JWTs it mints from Kratos sign-ins) can replace it later. That matches how the test suite already works (two author tokens, A and B). The alternative is to accept flint-gate tokens from day one. That ties the hub to the sign-in setup now and makes local testing harder.
2. **Two uncommitted edits in the hub repo:** `.claude/settings.json` and `versions.toml`. I haven't looked at them. They could be your work in progress or tool changes. I'd keep them out of the change 02 commits unless you say otherwise.

Under the repo's rules, my work goes on a branch with a PR, and you merge. Pushing to GitHub also starts that repo's CI. Nothing happens in production (database, DNS, cluster) during this change.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 5acda4f9-cfd5-4403-9e0e-2693531a3f4a
- Captured: 2026-11-14T13:25:46.032781Z
- Project: /Volumes/T7/Projects/references/open-design

## Changed Paths

- No changed paths detected.
