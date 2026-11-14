# Deploy designs to the operator's IPFS node

## Why

KnowDesign can deploy to Vercel and Cloudflare Pages only. The operator wants one-action deploys of HTMX prototypes to their own Kubo node (`rpc.prometheusags.ai`, gateway `ipfs.prometheusags.ai`) using credentials already in `~/.bash_profile`, which a Finder-launched packaged app cannot see.

## What Changes

Add an `ipfs-kubo` deploy provider: logic in a new `apps/daemon/src/deploy/ipfs.ts`; additive branches in `deploy.ts`, `routes/deploy.ts`, `deploy/cloudflare-pages-helpers.ts`, contracts, web registry, `cli.ts`; a new `IpfsDeployFields` component in the deploy modal; `POST /api/deploy/config/import-env`; i18n keys. Deploy pins a CIDv1 (wrap-with-directory) and optionally publishes IPNS key `kd-<projectId>`. Plan: `.kbd-orchestrator/phases/htmx-prototypes-and-ipfs-deploy/plan.md` change 1; scenarios IPFS-1..4.
