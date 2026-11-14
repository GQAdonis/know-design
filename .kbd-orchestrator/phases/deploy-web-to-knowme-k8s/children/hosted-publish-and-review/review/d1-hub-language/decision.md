# Decision D1: implementation language and home of the KnowDesign review hub

## Decision

Choose how to build the **hub**: a new long-lived internet-facing service on `know-me.tools` that (a) stores design snapshots published by authors and serves them to anonymous reviewers from an isolated origin, (b) accepts guest comments from anonymous reviewers, and (c) implements the existing `collab-cloud` HTTP contract (members and seq-cursor comments with ETag/304) that the KnowDesign daemon already speaks.

Option **TS**: TypeScript on Node, as a new workspace package `apps/hub` inside the `GQAdonis/know-design` monorepo, sharing `packages/contracts` types and the existing Playwright `fake-collab-hub` conformance harness.

Option **RS**: Rust (axum/tower), in its own repository, following the pattern of `sso-broker` in `flint-core-infra`; wire types defined once (OpenAPI or JSON Schema) and generated for both the Rust server and the TypeScript daemon.

Current leaning: TS. This review exists to test that leaning, not to confirm it.

## Facts about the situation

- Surface: roughly a dozen HTTP endpoints, a Postgres 18 database (the flint-forge image), filesystem snapshot storage on a PVC, signed guest cookies, rate limiting, and static serving with `Content-Security-Policy: sandbox`.
- The server must serve **attacker-controlled HTML/JS** (authors can publish anything; any holder of a link can post comments). Security of the serving path is the dominant risk.
- Deployment is single replica on a shared k8s cluster with a GitOps repo; the platform's own services (flint-gate, flint-forge, flint-realtime-fabric, sso-broker) are Rust, and so is most of the operator's other code.
- The daemon, web app and the `CollabCloudComment`/member DTOs are TypeScript in `packages/contracts`. The reviewer page is a browser frontend and is TypeScript under either option.
- The repo is a fork that merges from `nexu-io/open-design` regularly. Files outside the new directory are the merge-conflict surface; a new `apps/hub` directory adds none. A separate repo adds none either.
- The monorepo CI, `pnpm guard` and the Node 24 toolchain exist. A Rust service needs its own CI and image pipeline, though a working pattern exists in `flint-core-infra` (`images.yaml`).
- The only existing conformance reference for the comment contract is a TypeScript Playwright fake (`e2e/lib/playwright/fake-collab-hub.ts`).
- The operator is a single person today.

## Assumptions

1. Sharing TypeScript types between daemon and hub removes a class of contract-drift bugs that a generated-types approach reduces but does not eliminate.
2. Hub traffic is low (tens of authors, hundreds of reviewers); raw performance and memory footprint do not decide this.
3. The operator will be the maintainer of the hub and is as fluent in Rust as in TypeScript.
4. A Node service can serve untrusted HTML safely if the origin is isolated and the sandbox CSP is set; the language does not change that.
5. npm supply-chain exposure can be kept small by using few dependencies and a lockfile, and is acceptable for this service.
6. The platform preference for Rust is a convention, not a requirement the hub is bound by.

## Falsifier

I should reverse this and choose RS if any of the following turns out true:

- The hub's safety-critical paths (static serving of untrusted content, cookie signing, multipart/upload limits, rate limiting) need more than three non-trivial third-party runtime dependencies on Node where the Rust equivalents are standard tower/axum middleware.
- Generating Rust wire types from a single schema is cheap enough that the drift argument for TS does not hold (a working generate-and-check step covers all hub DTOs in under a day).
- The operator would in practice maintain only Rust services, so a TypeScript service in the monorepo becomes an orphan that rots between upstream merges.
- Memory or latency of the Node process on the single replica becomes a cause of rollout failures.

## What I want the reviewer to do

Find the strongest case against TS (and against RS), including anything that makes this a false choice, and say what evidence would change the outcome. Do not rate novelty.
